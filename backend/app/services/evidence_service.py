import hashlib
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from fastapi import HTTPException
from sqlmodel import Session, select
from app.config import UPLOAD_DIR
from app.models import (
    Application,
    EvidenceItem,
    Requirement,
    RequirementEvidenceLink,
    RequirementState,
    RequirementTransitionEvent,
    VerificationMethod,
    VerificationMode,
    utc_now,
)

# 10 MB maximum file size limit
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

# Allowed file extensions & MIME types for hackathon MVP evidence upload
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/pjpeg",
    "image/jpg",
    "application/octet-stream",
}

# Domain allowed transitions matrix
ALLOWED_TRANSITIONS = {
    RequirementState.MISSING.value: [
        RequirementState.IN_PROGRESS.value,
        RequirementState.EVIDENCE_RECEIVED.value,
    ],
    RequirementState.IN_PROGRESS.value: [
        RequirementState.EVIDENCE_RECEIVED.value,
    ],
    RequirementState.EVIDENCE_RECEIVED.value: [
        RequirementState.VERIFIED.value,
        RequirementState.REJECTED.value,
    ],
    RequirementState.REJECTED.value: [
        RequirementState.EVIDENCE_RECEIVED.value,
    ],
    RequirementState.NEEDS_VERIFICATION.value: [
        RequirementState.VERIFIED.value,
        RequirementState.REJECTED.value,
    ],
    RequirementState.VERIFIED.value: [],
}


class DomainActionError(HTTPException):
    def __init__(self, status_code: int, detail: str):
        super().__init__(status_code=status_code, detail=detail)


class InvalidStateTransitionError(DomainActionError):
    def __init__(self, current_state: str, target_state: str, requirement_code: str, action: str):
        msg = (
            f"Invalid state transition for requirement '{requirement_code}': "
            f"cannot move from '{current_state}' to '{target_state}' via action '{action}'."
        )
        super().__init__(status_code=400, detail=msg)


def record_transition_event(
    session: Session,
    requirement_id: str,
    from_state: str,
    to_state: str,
    action: str,
    actor: str,
    metadata: Optional[Dict[str, Any]] = None,
) -> RequirementTransitionEvent:
    """
    Appends an immutable audit event recording a lifecycle transition.
    """
    event = RequirementTransitionEvent(
        requirement_id=requirement_id,
        from_state=from_state,
        to_state=to_state,
        action=action,
        actor=actor,
        metadata_json=json.dumps(metadata or {}),
        created_at=utc_now(),
    )
    session.add(event)
    return event


def validate_file_safety(filename: str, content: bytes, content_type: Optional[str]) -> Tuple[str, str]:
    """
    Validates file size, extension, MIME type, and basic safety.
    Returns (sanitized_base_filename, lowercase_extension).
    """
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise DomainActionError(
            status_code=413,
            detail=f"File exceeds maximum allowed size of 10 MB ({len(content)} bytes).",
        )
    if len(content) == 0:
        raise DomainActionError(status_code=400, detail="Uploaded file cannot be empty.")

    clean_filename = Path(filename).name
    ext = Path(clean_filename).suffix.lower()
    if not ext or ext not in ALLOWED_EXTENSIONS:
        raise DomainActionError(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed extensions: {', '.join(sorted(ALLOWED_EXTENSIONS))}.",
        )

    mime = (content_type or "application/octet-stream").lower()
    if mime not in ALLOWED_MIME_TYPES:
        raise DomainActionError(
            status_code=400,
            detail=f"Unsupported MIME type '{mime}'. Allowed types: PDF, PNG, JPEG.",
        )

    return clean_filename, ext


def store_evidence_file(content: bytes, ext: str) -> Tuple[str, str, str]:
    """
    Safely stores uploaded file bytes on disk with UUID-based name.
    Does NOT leak raw server filesystem paths to the caller.
    Returns (safe_filename, safe_relative_path, sha256_hash).
    """
    file_uuid = str(uuid.uuid4())
    safe_filename = f"{file_uuid}{ext}"
    target_path = UPLOAD_DIR / safe_filename
    target_path.write_bytes(content)
    file_hash = hashlib.sha256(content).hexdigest()
    relative_path = f"uploads/{safe_filename}"
    return safe_filename, relative_path, file_hash


def resolve_requirement(session: Session, requirement_id: str) -> Optional[Requirement]:
    """
    Resolves requirement by primary key UUID, with resilient fallback to requirement code
    lookup (e.g. 'FSSAI-REQ-07', 'FSSAI-REQ-08').
    """
    requirement = session.get(Requirement, requirement_id)
    if requirement:
        return requirement

    return session.exec(
        select(Requirement).where(Requirement.code == requirement_id)
    ).first()


def request_requirement(
    session: Session,
    requirement_id: str,
    actor: Optional[str] = "demo_applicant_01",
    notes: Optional[str] = None,
) -> Requirement:
    """
    Action: Mark Requirement as Requested.
    Transitions: MISSING -> IN_PROGRESS.
    """
    requirement = resolve_requirement(session, requirement_id)
    if not requirement:
        raise DomainActionError(status_code=404, detail=f"Requirement '{requirement_id}' not found.")

    if requirement.state != RequirementState.MISSING.value:
        raise InvalidStateTransitionError(
            current_state=requirement.state,
            target_state=RequirementState.IN_PROGRESS.value,
            requirement_code=requirement.code,
            action="REQUEST",
        )

    prev_state = requirement.state
    requirement.state = RequirementState.IN_PROGRESS.value
    session.add(requirement)

    record_transition_event(
        session=session,
        requirement_id=requirement.id,
        from_state=prev_state,
        to_state=RequirementState.IN_PROGRESS.value,
        action="REQUESTED",
        actor=actor or "demo_applicant_01",
        metadata={"notes": notes} if notes else {},
    )

    session.commit()
    session.refresh(requirement)
    return requirement


def submit_requirement_evidence(
    session: Session,
    requirement_id: str,
    file_name: Optional[str] = None,
    file_content: Optional[bytes] = None,
    content_type: Optional[str] = None,
    evidence_id: Optional[str] = None,
    notes: Optional[str] = None,
    actor: Optional[str] = "demo_applicant_01",
) -> Tuple[Requirement, EvidenceItem, RequirementEvidenceLink]:
    """
    Action: Upload / Link Evidence for Requirement.
    Transitions: MISSING / IN_PROGRESS / REJECTED -> EVIDENCE_RECEIVED.
    Does NOT verify automatically. Does NOT alter readiness.
    """
    requirement = resolve_requirement(session, requirement_id)
    if not requirement:
        raise DomainActionError(status_code=404, detail=f"Requirement '{requirement_id}' not found.")

    if requirement.state == RequirementState.VERIFIED.value:
        raise DomainActionError(
            status_code=400,
            detail=f"Requirement '{requirement.code}' is already VERIFIED. Additional evidence submission is not allowed.",
        )

    # Validate transition from current state
    allowed = ALLOWED_TRANSITIONS.get(requirement.state, [])
    if RequirementState.EVIDENCE_RECEIVED.value not in allowed:
        raise InvalidStateTransitionError(
            current_state=requirement.state,
            target_state=RequirementState.EVIDENCE_RECEIVED.value,
            requirement_code=requirement.code,
            action="EVIDENCE_SUBMISSION",
        )

    if file_content is None and not evidence_id:
        raise DomainActionError(
            status_code=400,
            detail="Either a valid file upload or an existing evidence_id is required.",
        )

    app = session.get(Application, requirement.application_id)
    applicant_context_id = app.applicant_context_id if app else "demo_applicant_01"

    if file_content is not None:
        clean_name, ext = validate_file_safety(file_name or "uploaded_file", file_content, content_type)
        safe_filename, rel_path, file_hash = store_evidence_file(file_content, ext)

        evidence_item = EvidenceItem(
            applicant_context_id=applicant_context_id,
            file_name=clean_name,
            file_path=rel_path,
            file_size=len(file_content),
            mime_type=content_type or "application/octet-stream",
            file_hash=file_hash,
            uploaded_at=utc_now(),
        )
        session.add(evidence_item)
        session.flush()
    else:
        evidence_item = session.get(EvidenceItem, evidence_id)
        if not evidence_item:
            raise DomainActionError(status_code=404, detail=f"Evidence item '{evidence_id}' not found.")

    # Check or create link
    link = session.exec(
        select(RequirementEvidenceLink).where(
            RequirementEvidenceLink.requirement_id == requirement.id,
            RequirementEvidenceLink.evidence_item_id == evidence_item.id,
        )
    ).first()

    if not link:
        link = RequirementEvidenceLink(
            requirement_id=requirement.id,
            evidence_item_id=evidence_item.id,
            link_notes=notes,
            linked_at=utc_now(),
        )
        session.add(link)
        session.flush()

    # Apply transition
    prev_state = requirement.state
    requirement.state = RequirementState.EVIDENCE_RECEIVED.value
    requirement.rejection_reason = None  # Clear prior rejection reason if replacement submitted
    session.add(requirement)

    record_transition_event(
        session=session,
        requirement_id=requirement.id,
        from_state=prev_state,
        to_state=RequirementState.EVIDENCE_RECEIVED.value,
        action="EVIDENCE_SUBMITTED",
        actor=actor or "demo_applicant_01",
        metadata={
            "evidence_item_id": evidence_item.id,
            "file_name": evidence_item.file_name,
            "file_hash": evidence_item.file_hash,
            "file_size": evidence_item.file_size,
            "notes": notes,
        },
    )

    session.commit()
    session.refresh(requirement)
    session.refresh(evidence_item)
    session.refresh(link)
    return requirement, evidence_item, link


def verify_requirement(
    session: Session,
    requirement_id: str,
    actor: Optional[str] = "Demo Reviewer Confirmation",
    notes: Optional[str] = None,
) -> Requirement:
    """
    Action: Explicit Reviewer Verification.
    Transitions: EVIDENCE_RECEIVED / NEEDS_VERIFICATION -> VERIFIED.
    Requires attached evidence.
    """
    requirement = resolve_requirement(session, requirement_id)
    if not requirement:
        raise DomainActionError(status_code=404, detail=f"Requirement '{requirement_id}' not found.")

    # Must have attached evidence to verify
    links = session.exec(
        select(RequirementEvidenceLink).where(RequirementEvidenceLink.requirement_id == requirement.id)
    ).all()
    if not links:
        raise DomainActionError(
            status_code=400,
            detail=f"Cannot verify requirement '{requirement.code}' without attached evidence.",
        )

    # Validate transition
    allowed = ALLOWED_TRANSITIONS.get(requirement.state, [])
    if RequirementState.VERIFIED.value not in allowed:
        raise InvalidStateTransitionError(
            current_state=requirement.state,
            target_state=RequirementState.VERIFIED.value,
            requirement_code=requirement.code,
            action="VERIFY",
        )

    prev_state = requirement.state
    reviewer_actor = actor or "Demo Reviewer Confirmation"

    requirement.state = RequirementState.VERIFIED.value
    requirement.verification_mode = VerificationMode.HUMAN_CONFIRMATION.value
    requirement.verification_method = VerificationMethod.HUMAN_CONFIRMATION.value
    requirement.verified_by = reviewer_actor
    requirement.verified_at = utc_now()
    requirement.rejection_reason = None
    session.add(requirement)

    record_transition_event(
        session=session,
        requirement_id=requirement.id,
        from_state=prev_state,
        to_state=RequirementState.VERIFIED.value,
        action="VERIFIED",
        actor=reviewer_actor,
        metadata={
            "verification_mode": requirement.verification_mode,
            "verification_method": requirement.verification_method,
            "verified_by": reviewer_actor,
            "notes": notes,
        },
    )

    session.commit()
    session.refresh(requirement)
    return requirement


def reject_requirement(
    session: Session,
    requirement_id: str,
    reason: str,
    actor: Optional[str] = "Demo Reviewer",
    notes: Optional[str] = None,
) -> Requirement:
    """
    Action: Evidence Rejection.
    Transitions: EVIDENCE_RECEIVED / NEEDS_VERIFICATION -> REJECTED.
    """
    requirement = resolve_requirement(session, requirement_id)
    if not requirement:
        raise DomainActionError(status_code=404, detail=f"Requirement '{requirement_id}' not found.")

    if not reason or not reason.strip():
        raise DomainActionError(status_code=400, detail="Rejection reason is required.")

    # Validate transition
    allowed = ALLOWED_TRANSITIONS.get(requirement.state, [])
    if RequirementState.REJECTED.value not in allowed:
        raise InvalidStateTransitionError(
            current_state=requirement.state,
            target_state=RequirementState.REJECTED.value,
            requirement_code=requirement.code,
            action="REJECT",
        )

    prev_state = requirement.state
    reviewer_actor = actor or "Demo Reviewer"

    requirement.state = RequirementState.REJECTED.value
    requirement.rejection_reason = reason.strip()
    requirement.verification_method = VerificationMethod.HUMAN_CONFIRMATION.value
    requirement.verified_by = reviewer_actor
    session.add(requirement)

    record_transition_event(
        session=session,
        requirement_id=requirement.id,
        from_state=prev_state,
        to_state=RequirementState.REJECTED.value,
        action="REJECTED",
        actor=reviewer_actor,
        metadata={
            "rejection_reason": reason.strip(),
            "notes": notes,
        },
    )

    session.commit()
    session.refresh(requirement)
    return requirement
