import random
import re
import string
import time
from collections import defaultdict
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlmodel import Session, select
from app.config import BASE_DIR
from app.database import get_session
from app.models import (
    ApplicantProfile,
    Application,
    EvidenceItem,
    IssueReport,
    IssueType,
    PolicyDocument,
    Requirement,
    RequirementDependency,
    RequirementEvidenceLink,
    RequirementRule,
    RequirementTransitionEvent,
    StageGate,
)
from app.services.evidence_service import (
    reject_requirement,
    request_requirement,
    resolve_requirement,
    submit_requirement_evidence,
    verify_requirement,
)
from app.services.ingestion_service import ingest_policy_document
from app.services.readiness import calculate_gate_readiness, calculate_progress
from app.services.rule_engine import evaluate_requirement_rules
from app.services.seed import DEMO_CONTEXT_ID, reset_canonical_fssai_demo

router = APIRouter()


class RequestRequirementBody(BaseModel):
    actor: Optional[str] = "demo_applicant_01"
    notes: Optional[str] = None


class VerifyRequirementBody(BaseModel):
    actor: Optional[str] = "Demo Reviewer Confirmation"
    notes: Optional[str] = None


class RejectRequirementBody(BaseModel):
    reason: str
    actor: Optional[str] = "Demo Reviewer"
    notes: Optional[str] = None


class LoginRequestBody(BaseModel):
    username: str
    password: str


@router.post("/auth/login")
def login_endpoint(payload: LoginRequestBody):
    """
    Authenticate credentials against the FORMLESS compliance backend.
    Restricted to canonical institutional demo credentials in this deployment.
    """
    username = payload.username.strip()
    password = payload.password.strip()

    if not username or not password:
        raise HTTPException(
            status_code=400,
            detail="Both username and password are required.",
        )

    canonical_demo_usernames = {
        "formless_demo",
        "demo_reviewer@fssai.gov.in",
        "reviewer@fssai.gov.in",
        "officer@fssai.gov.in",
    }

    if username.lower() in canonical_demo_usernames and password == "FormlessDemo2026!":
        return {
            "status": "authenticated",
            "access_token": "formless-demo-session-token-2026",
            "token_type": "bearer",
            "user": {
                "username": username if "@" not in username else "formless_demo",
                "display_name": "Institutional Demo Reviewer",
                "email": username if "@" in username else "demo_reviewer@fssai.gov.in",
                "role": "compliance_reviewer",
                "organization": "Food Safety and Standards Authority of India (FSSAI)",
                "mode": "demo",
            },
        }

    raise HTTPException(
        status_code=401,
        detail="Invalid credentials. For demo access, use username 'formless_demo' and password 'FormlessDemo2026!'.",
    )


@router.get("/auth/status")
def auth_status_endpoint():
    """
    Returns authentication configuration and availability for this institutional deployment.
    """
    return {
        "oauth_google_configured": False,
        "demo_auth_enabled": True,
        "canonical_demo_username": "formless_demo",
        "supported_methods": ["credentials", "demo_account"],
    }


def build_application_aggregate(
    application: Application,
    session: Session,
    gate: str = StageGate.JOINING.value,
) -> Dict[str, Any]:
    """Helper to assemble the complete aggregate read model for an application."""
    profile = session.exec(
        select(ApplicantProfile).where(ApplicantProfile.applicant_context_id == application.applicant_context_id)
    ).first()

    policy_doc = session.get(PolicyDocument, application.policy_document_id)

    requirements = session.exec(
        select(Requirement).where(Requirement.application_id == application.id).order_by(Requirement.code)
    ).all()

    req_ids = [r.id for r in requirements]

    # Fetch all evidence links for these requirements
    all_links = session.exec(
        select(RequirementEvidenceLink).where(RequirementEvidenceLink.requirement_id.in_(req_ids))
    ).all() if req_ids else []

    evidence_item_ids = list({l.evidence_item_id for l in all_links})
    evidence_items = session.exec(
        select(EvidenceItem).where(EvidenceItem.id.in_(evidence_item_ids))
    ).all() if evidence_item_ids else []

    evidence_by_id = {e.id: e for e in evidence_items}

    # Fetch transition events for all requirements
    all_events = session.exec(
        select(RequirementTransitionEvent)
        .where(RequirementTransitionEvent.requirement_id.in_(req_ids))
        .order_by(RequirementTransitionEvent.created_at)
    ).all() if req_ids else []

    events_by_req: Dict[str, List[RequirementTransitionEvent]] = {}
    for ev in all_events:
        events_by_req.setdefault(ev.requirement_id, []).append(ev)

    links_by_req: Dict[str, List[RequirementEvidenceLink]] = {}
    for l in all_links:
        links_by_req.setdefault(l.requirement_id, []).append(l)

    req_details = []
    for r in requirements:
        rules = session.exec(
            select(RequirementRule).where(RequirementRule.requirement_id == r.id)
        ).all()

        r_links = links_by_req.get(r.id, [])
        r_events = events_by_req.get(r.id, [])

        req_details.append({
            "id": r.id,
            "code": r.code,
            "title": r.title,
            "description": r.description,
            "category": r.category,
            "blocking_stages": r.blocking_stages,
            "verification_mode": r.verification_mode,
            "rule_combination_logic": r.rule_combination_logic,
            "state": r.state,
            "source_citation": r.source_citation,
            "verification_method": r.verification_method,
            "verified_by": r.verified_by,
            "verified_at": r.verified_at.isoformat() if r.verified_at else None,
            "rejection_reason": r.rejection_reason,
            "rules": [
                {
                    "id": rule.id,
                    "field": rule.field,
                    "operator": rule.operator,
                    "expected_value": rule.expected_value,
                    "evaluation_status": rule.evaluation_status,
                    "evaluation_message": rule.evaluation_message,
                }
                for rule in rules
            ],
            "evidence_links": [
                {
                    "id": l.id,
                    "evidence_item_id": l.evidence_item_id,
                    "file_name": evidence_by_id[l.evidence_item_id].file_name if l.evidence_item_id in evidence_by_id else "unknown",
                    "mime_type": evidence_by_id[l.evidence_item_id].mime_type if l.evidence_item_id in evidence_by_id else None,
                    "file_size": evidence_by_id[l.evidence_item_id].file_size if l.evidence_item_id in evidence_by_id else None,
                    "link_notes": l.link_notes,
                    "linked_at": l.linked_at.isoformat() if l.linked_at else None,
                }
                for l in r_links
            ],
            "transition_events": [
                {
                    "id": ev.id,
                    "from_state": ev.from_state,
                    "to_state": ev.to_state,
                    "previous_state": ev.previous_state,
                    "new_state": ev.new_state,
                    "action": ev.action,
                    "actor": ev.actor,
                    "metadata": ev.metadata_dict,
                    "created_at": ev.created_at.isoformat() if ev.created_at else None,
                }
                for ev in r_events
            ],
        })

    # Fetch dependencies
    dependencies = session.exec(
        select(RequirementDependency).where(RequirementDependency.requirement_id.in_(req_ids))
    ).all() if req_ids else []

    dep_details = [
        {
            "id": d.id,
            "requirement_id": d.requirement_id,
            "depends_on_requirement_id": d.depends_on_requirement_id,
            "dependency_type": d.dependency_type,
        }
        for d in dependencies
    ]

    evidence_details = [
        {
            "id": e.id,
            "applicant_context_id": e.applicant_context_id,
            "file_name": e.file_name,
            "file_size": e.file_size,
            "mime_type": e.mime_type,
            "file_hash": e.file_hash,
            "uploaded_at": e.uploaded_at.isoformat() if e.uploaded_at else None,
        }
        for e in evidence_items
    ]

    evidence_link_details = [
        {
            "id": l.id,
            "requirement_id": l.requirement_id,
            "evidence_item_id": l.evidence_item_id,
            "link_notes": l.link_notes,
            "linked_at": l.linked_at.isoformat() if l.linked_at else None,
        }
        for l in all_links
    ]

    gate_readiness = calculate_gate_readiness(requirements, gate)
    progress = calculate_progress(requirements)

    return {
        "application": {
            "id": application.id,
            "title": application.title,
            "applicant_context_id": application.applicant_context_id,
            "current_stage": application.current_stage,
            "created_at": application.created_at.isoformat() if application.created_at else None,
        },
        "applicant_profile": {
            "display_label": profile.display_label if profile else "Unknown",
            "degree": profile.degree if profile else None,
            "year_of_study": profile.year_of_study if profile else None,
            "cgpa": profile.cgpa if profile else None,
            "enrollment_type": profile.enrollment_type if profile else None,
        } if profile else None,
        "policy_document": {
            "id": policy_doc.id,
            "title": policy_doc.title,
            "document_type": policy_doc.document_type,
            "is_demo_seed": policy_doc.is_demo_seed,
        } if policy_doc else None,
        "requirements": req_details,
        "dependencies": dep_details,
        "evidence": evidence_details,
        "evidence_links": evidence_link_details,
        "active_gate": gate_readiness["gate"],
        "gate_readiness": gate_readiness,
        "active_blockers": gate_readiness["active_blockers"],
        "progress": progress,
    }


@router.post("/demo/reset-fssai")
def reset_fssai_demo_endpoint(
    gate: str = Query(default=StageGate.JOINING.value),
    session: Session = Depends(get_session),
):
    """
    Resets the demo environment to the canonical 8-requirement FSSAI internship baseline.
    Safe to execute repeatedly.
    """
    app = reset_canonical_fssai_demo(session)
    aggregate = build_application_aggregate(app, session, gate)
    return {
        "status": "reset_success",
        "message": "Canonical FSSAI demo scenario successfully reset to baseline.",
        "data": aggregate,
        "aggregate": aggregate,
    }


@router.get("/applications/{application_id}/aggregate")
def get_application_aggregate_endpoint(
    application_id: str,
    gate: str = Query(default=StageGate.JOINING.value),
    session: Session = Depends(get_session),
):
    """
    Primary read model returning complete state: application, profile, requirements,
    rules, dependencies, evidence, evidence_links, gate readiness, and progress.
    """
    application = session.get(Application, application_id)
    if not application and application_id in ("current", "demo", "latest", "default"):
        application = session.exec(
            select(Application)
            .where(Application.applicant_context_id == DEMO_CONTEXT_ID)
            .order_by(Application.created_at.desc())
        ).first()
    if not application:
        raise HTTPException(status_code=404, detail=f"Application '{application_id}' not found.")

    return build_application_aggregate(application, session, gate)


@router.get("/applications/{application_id}/readiness")
def get_application_readiness_endpoint(
    application_id: str,
    gate: str = Query(default=StageGate.JOINING.value),
    session: Session = Depends(get_session),
):
    """Calculates deterministic readiness for a specified stage gate."""
    application = session.get(Application, application_id)
    if not application:
        raise HTTPException(status_code=404, detail=f"Application '{application_id}' not found.")

    requirements = session.exec(
        select(Requirement).where(Requirement.application_id == application.id)
    ).all()

    return calculate_gate_readiness(requirements, gate)


@router.post("/applications/{application_id}/evaluate-rules")
def evaluate_application_rules_endpoint(
    application_id: str,
    session: Session = Depends(get_session),
):
    """
    Deterministically evaluates all requirement rules against the applicant profile.
    Reports conclusions without mutating requirement lifecycle states directly.
    """
    application = session.get(Application, application_id)
    if not application:
        raise HTTPException(status_code=404, detail=f"Application '{application_id}' not found.")

    profile = session.exec(
        select(ApplicantProfile).where(ApplicantProfile.applicant_context_id == application.applicant_context_id)
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Applicant profile not found for application.")

    requirements = session.exec(
        select(Requirement).where(Requirement.application_id == application.id)
    ).all()

    results = []
    for req in requirements:
        rules = session.exec(
            select(RequirementRule).where(RequirementRule.requirement_id == req.id)
        ).all()
        if rules:
            eval_result = evaluate_requirement_rules(req, rules, profile)
            results.append(eval_result)

    return {
        "application_id": application.id,
        "applicant_context_id": application.applicant_context_id,
        "evaluated_requirements_count": len(results),
        "results": results,
    }


# =========================================================================
# Phase 3 Domain Actions: Lifecycle & Verification
# =========================================================================

@router.post("/requirements/{requirement_id}/request")
def request_requirement_endpoint(
    requirement_id: str,
    body: Optional[RequestRequirementBody] = None,
    gate: str = Query(default=StageGate.JOINING.value),
    session: Session = Depends(get_session),
):
    """
    Action 1: Mark requirement as Requested (MISSING -> IN_PROGRESS).
    """
    actor = body.actor if body and body.actor else "demo_applicant_01"
    notes = body.notes if body else None
    req = request_requirement(session=session, requirement_id=requirement_id, actor=actor, notes=notes)

    app = session.get(Application, req.application_id)
    aggregate = build_application_aggregate(app, session, gate)
    return {
        "status": "success",
        "action": "REQUESTED",
        "requirement_id": req.id,
        "requirement_code": req.code,
        "state": req.state,
        "data": aggregate,
        "aggregate": aggregate,
    }


@router.post("/requirements/{requirement_id}/evidence")
async def submit_requirement_evidence_endpoint(
    requirement_id: str,
    file: Optional[UploadFile] = File(None),
    evidence_id: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    actor: Optional[str] = Form(None),
    gate: str = Query(default=StageGate.JOINING.value),
    session: Session = Depends(get_session),
):
    """
    Action 2: Upload/link evidence for requirement (IN_PROGRESS/MISSING/REJECTED -> EVIDENCE_RECEIVED).
    Does NOT verify automatically. Does NOT alter readiness.
    """
    file_bytes = None
    file_name = None
    content_type = None

    if file:
        file_name = file.filename
        content_type = file.content_type
        file_bytes = await file.read()

    req, item, link = submit_requirement_evidence(
        session=session,
        requirement_id=requirement_id,
        file_name=file_name,
        file_content=file_bytes,
        content_type=content_type,
        evidence_id=evidence_id,
        notes=notes,
        actor=actor,
    )

    app = session.get(Application, req.application_id)
    aggregate = build_application_aggregate(app, session, gate)
    return {
        "status": "success",
        "action": "EVIDENCE_SUBMITTED",
        "requirement_id": req.id,
        "requirement_code": req.code,
        "state": req.state,
        "evidence_item": {
            "id": item.id,
            "file_name": item.file_name,
            "file_size": item.file_size,
            "mime_type": item.mime_type,
            "file_hash": item.file_hash,
            "uploaded_at": item.uploaded_at.isoformat() if item.uploaded_at else None,
        },
        "link_id": link.id,
        "data": aggregate,
        "aggregate": aggregate,
    }


@router.post("/requirements/{requirement_id}/verify")
def verify_requirement_endpoint(
    requirement_id: str,
    body: Optional[VerifyRequirementBody] = None,
    gate: str = Query(default=StageGate.JOINING.value),
    session: Session = Depends(get_session),
):
    """
    Action 3: Verify requirement (EVIDENCE_RECEIVED/NEEDS_VERIFICATION -> VERIFIED).
    Requires attached evidence. Sets HUMAN_CONFIRMATION and reviewer confirmation.
    """
    actor = body.actor if body and body.actor else "Demo Reviewer Confirmation"
    notes = body.notes if body else None

    req = verify_requirement(session=session, requirement_id=requirement_id, actor=actor, notes=notes)

    app = session.get(Application, req.application_id)
    aggregate = build_application_aggregate(app, session, gate)
    return {
        "status": "success",
        "action": "VERIFIED",
        "requirement_id": req.id,
        "requirement_code": req.code,
        "state": req.state,
        "verification_mode": req.verification_mode,
        "verification_method": req.verification_method,
        "verified_by": req.verified_by,
        "verified_at": req.verified_at.isoformat() if req.verified_at else None,
        "data": aggregate,
        "aggregate": aggregate,
    }


@router.post("/requirements/{requirement_id}/reject")
def reject_requirement_endpoint(
    requirement_id: str,
    body: RejectRequirementBody,
    gate: str = Query(default=StageGate.JOINING.value),
    session: Session = Depends(get_session),
):
    """
    Action 4: Reject requirement evidence (EVIDENCE_RECEIVED/NEEDS_VERIFICATION -> REJECTED).
    Leaves requirement unresolved; allows subsequent replacement evidence submission.
    """
    actor = body.actor if body.actor else "Demo Reviewer"
    req = reject_requirement(
        session=session,
        requirement_id=requirement_id,
        reason=body.reason,
        actor=actor,
        notes=body.notes,
    )

    app = session.get(Application, req.application_id)
    aggregate = build_application_aggregate(app, session, gate)
    return {
        "status": "success",
        "action": "REJECTED",
        "requirement_id": req.id,
        "requirement_code": req.code,
        "state": req.state,
        "rejection_reason": req.rejection_reason,
        "verified_by": req.verified_by,
        "data": aggregate,
        "aggregate": aggregate,
    }


@router.get("/requirements/{requirement_id}/events")
def get_requirement_events_endpoint(
    requirement_id: str,
    session: Session = Depends(get_session),
):
    """
    Fetches the append-only audit trail of transition events for a requirement.
    """
    requirement = resolve_requirement(session, requirement_id)
    if not requirement:
        raise HTTPException(status_code=404, detail=f"Requirement '{requirement_id}' not found.")

    events = session.exec(
        select(RequirementTransitionEvent)
        .where(RequirementTransitionEvent.requirement_id == requirement.id)
        .order_by(RequirementTransitionEvent.created_at)
    ).all()

    return {
        "requirement_id": requirement.id,
        "requirement_code": requirement.code,
        "events": [
            {
                "id": ev.id,
                "from_state": ev.from_state,
                "to_state": ev.to_state,
                "previous_state": ev.previous_state,
                "new_state": ev.new_state,
                "action": ev.action,
                "actor": ev.actor,
                "metadata": ev.metadata_dict,
                "created_at": ev.created_at.isoformat() if ev.created_at else None,
            }
            for ev in events
        ],
    }


@router.get("/evidence/{evidence_id}")
def get_evidence_endpoint(
    evidence_id: str,
    session: Session = Depends(get_session),
):
    """
    Fetches metadata for an evidence item. Does NOT expose raw server filesystem paths.
    """
    item = session.get(EvidenceItem, evidence_id)
    if not item:
        raise HTTPException(status_code=404, detail=f"Evidence item '{evidence_id}' not found.")

    return {
        "id": item.id,
        "applicant_context_id": item.applicant_context_id,
        "file_name": item.file_name,
        "file_size": item.file_size,
        "mime_type": item.mime_type,
        "file_hash": item.file_hash,
        "uploaded_at": item.uploaded_at.isoformat() if item.uploaded_at else None,
    }


@router.get("/evidence/{evidence_id}/download")
def download_evidence_endpoint(
    evidence_id: str,
    session: Session = Depends(get_session),
):
    """
    Safely streams an evidence file without exposing server directory paths.
    """
    item = session.get(EvidenceItem, evidence_id)
    if not item:
        raise HTTPException(status_code=404, detail=f"Evidence item '{evidence_id}' not found.")

    target_path = BASE_DIR / item.file_path
    if not target_path.exists():
        raise HTTPException(status_code=404, detail="Underlying evidence file not found on disk.")

    return FileResponse(
        path=target_path,
        filename=item.file_name,
        media_type=item.mime_type,
    )


@router.post("/documents/ingest")
async def ingest_policy_document_endpoint(
    file: UploadFile = File(...),
    applicant_context_id: str = Form(default="demo_applicant_01"),
    gate: str = Query(default=StageGate.JOINING.value),
    session: Session = Depends(get_session),
):
    """
    Phase 4: Ingest a policy document PDF, extract structured requirements via Gemini 3.8 Flash,
    validate schema, persist to database, and return the populated application aggregate.
    """
    file_bytes = await file.read()
    application, policy_doc, reqs, used_demo_fallback, extraction = ingest_policy_document(
        session=session,
        file_name=file.filename or "policy_document.pdf",
        file_bytes=file_bytes,
        content_type=file.content_type,
        applicant_context_id=applicant_context_id,
    )

    aggregate = build_application_aggregate(application, session, gate)

    model_version = getattr(extraction, "model_version", None) if extraction else None
    if used_demo_fallback:
        extraction_source = "CANONICAL_DEMO_FALLBACK"
    elif model_version == "gemini-3.5-flash":
        extraction_source = "GEMINI_3_5_FLASH_FALLBACK"
    elif model_version == "gemini-3.8-flash":
        extraction_source = "GEMINI_3_8_FLASH"
    else:
        extraction_source = "GEMINI_3_8_FLASH"

    return {
        "status": "ingest_success",
        "used_demo_fallback": used_demo_fallback,
        "extraction_source": extraction_source,
        "model_used": model_version or ("canonical-fssai-baseline" if used_demo_fallback else "gemini-3.8-flash"),
        "policy_document": {
            "id": policy_doc.id,
            "title": policy_doc.title,
            "file_hash": policy_doc.file_hash,
            "document_type": policy_doc.document_type,
            "is_demo_seed": policy_doc.is_demo_seed,
        },
        "application": {
            "id": application.id,
            "title": application.title,
            "applicant_context_id": application.applicant_context_id,
            "current_stage": application.current_stage,
        },
        "extracted_policy": {
            "target_name": extraction.target_name,
            "organization": extraction.organization,
            "deadline": extraction.deadline,
            "requirements_count": len(reqs),
        },
        "data": aggregate,
        "aggregate": aggregate,
    }


EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
VALID_ISSUE_TYPES = {"Bug", "UI / Design", "Document upload", "Login / Access", "Other"}

# In-memory sliding window rate limiter: max 15 requests per 60 seconds per client host
_issue_rate_limit_lock: Dict[str, List[float]] = defaultdict(list)


def check_issue_rate_limit(client_ip: str, max_requests: int = 15, window_seconds: int = 60) -> bool:
    now = time.time()
    timestamps = _issue_rate_limit_lock[client_ip]
    _issue_rate_limit_lock[client_ip] = [t for t in timestamps if now - t < window_seconds]
    if len(_issue_rate_limit_lock[client_ip]) >= max_requests:
        return False
    _issue_rate_limit_lock[client_ip].append(now)
    return True


def generate_issue_reference() -> str:
    from datetime import datetime, timezone
    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"ISS-{date_str}-{suffix}"


class IssueSubmissionRequest(BaseModel):
    email: str
    issue_type: str = "Bug"
    subject: str
    description: str
    page_route: Optional[str] = None


class IssueSubmissionResponse(BaseModel):
    success: bool
    issue_id: str
    status: str
    message: str
    created_at: str


@router.post("/support/issues", response_model=IssueSubmissionResponse)
@router.post("/issues", response_model=IssueSubmissionResponse)
def submit_support_issue(
    payload: IssueSubmissionRequest,
    request: Request,
    session: Session = Depends(get_session),
):
    """
    Submits a user or reviewer issue/feedback report.
    Validates server-side, rate-limits, and persists truthfully to the database.
    """
    client_ip = request.client.host if request.client else "unknown"
    if not check_issue_rate_limit(client_ip):
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please wait a moment before submitting another issue.",
        )

    # 1. Normalize and validate email
    email = payload.email.strip().lower()
    if not email or len(email) > 255 or not EMAIL_REGEX.match(email):
        raise HTTPException(
            status_code=400,
            detail="A valid email address is required so the support team can respond.",
        )

    # 2. Validate issue_type
    issue_type = payload.issue_type.strip() if payload.issue_type else "Bug"
    if issue_type not in VALID_ISSUE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid issue type '{issue_type}'. Allowed types: {', '.join(sorted(VALID_ISSUE_TYPES))}.",
        )

    # 3. Validate subject
    subject = payload.subject.strip()
    if not subject:
        raise HTTPException(status_code=400, detail="Subject is required.")
    if len(subject) < 3:
        raise HTTPException(status_code=400, detail="Subject must be at least 3 characters long.")
    if len(subject) > 150:
        raise HTTPException(status_code=400, detail="Subject cannot exceed 150 characters.")

    # 4. Validate description
    description = payload.description.strip()
    if not description:
        raise HTTPException(status_code=400, detail="Issue description is required.")
    if len(description) < 10:
        raise HTTPException(status_code=400, detail="Description must be at least 10 characters long.")
    if len(description) > 3000:
        raise HTTPException(status_code=400, detail="Description cannot exceed 3000 characters.")

    # 5. Sanitize page_route
    page_route = payload.page_route.strip() if payload.page_route else None
    if page_route and len(page_route) > 200:
        page_route = page_route[:200]

    # 6. Generate unique issue ID
    issue_id = generate_issue_reference()

    # 7. Persist record in database
    issue_record = IssueReport(
        issue_id=issue_id,
        email=email,
        issue_type=issue_type,
        subject=subject,
        description=description,
        page_route=page_route,
        status="OPEN",
    )
    session.add(issue_record)
    session.commit()
    session.refresh(issue_record)

    return IssueSubmissionResponse(
        success=True,
        issue_id=issue_record.issue_id,
        status="RECEIVED",
        message="Your issue has been recorded. The compliance engineering team will investigate.",
        created_at=issue_record.created_at.isoformat(),
    )


@router.get("/support/issues/{issue_id}")
def get_support_issue(issue_id: str, session: Session = Depends(get_session)):
    """Retrieve an issue report by its public issue reference ID."""
    statement = select(IssueReport).where(IssueReport.issue_id == issue_id)
    issue = session.exec(statement).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found.")
    return {
        "issue_id": issue.issue_id,
        "email": issue.email,
        "issue_type": issue.issue_type,
        "subject": issue.subject,
        "description": issue.description,
        "page_route": issue.page_route,
        "status": issue.status,
        "created_at": issue.created_at.isoformat(),
    }

