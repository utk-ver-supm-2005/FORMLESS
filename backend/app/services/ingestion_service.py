import hashlib
import io
import json
import logging
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from fastapi import HTTPException
import pypdf
from sqlmodel import Session, select
from app.config import UPLOAD_DIR, settings
from app.models import (
    ApplicantProfile,
    Application,
    PolicyDocument,
    Requirement,
    RequirementDependency,
    RequirementRule,
    RequirementState,
    RuleEvaluationStatus,
    StageGate,
    VerificationMethod,
    VerificationMode,
    utc_now,
)
from app.services.gemini_service import (
    PolicyExtraction,
    build_gemini_extraction_prompt,
    call_gemini_extraction,
    get_canonical_fssai_extraction,
    is_canonical_fssai_document,
)
from app.services.rule_engine import evaluate_requirement_rules

logger = logging.getLogger("formless.ingestion")

MAX_POLICY_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB limit for policy documents


def validate_policy_pdf(file_name: str, file_bytes: bytes, content_type: Optional[str] = None) -> None:
    """
    Validates file extension, magic header, non-emptiness, and 50 MB size limit.
    """
    if len(file_bytes) > MAX_POLICY_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Policy document exceeds maximum allowed size of 50 MB ({len(file_bytes)} bytes).",
        )

    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded policy PDF is empty.")

    clean_name = Path(file_name).name.lower()
    if not clean_name.endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Policy document ingestion only supports PDF (.pdf) files.",
        )

    if not file_bytes.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=400,
            detail="Invalid PDF file format. Missing standard PDF file signature header.",
        )


def extract_pdf_pages(file_bytes: bytes) -> List[Dict[str, Any]]:
    """
    Extracts text per page using pypdf preserving explicit page boundaries.
    """
    try:
        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        if len(reader.pages) == 0:
            raise ValueError("PDF document contains no pages.")

        pages_data = []
        for i, page in enumerate(reader.pages, start=1):
            text = page.extract_text() or ""
            pages_data.append({
                "page_number": i,
                "text": text.strip(),
            })
        return pages_data
    except Exception as exc:
        logger.error("Failed to parse PDF document pages: %s", exc)
        raise HTTPException(
            status_code=400,
            detail=f"Failed to parse PDF pages: {str(exc)}",
        ) from exc


def ingest_policy_document(
    session: Session,
    file_name: str,
    file_bytes: bytes,
    content_type: Optional[str] = None,
    applicant_context_id: str = "demo_applicant_01",
) -> Tuple[Application, PolicyDocument, List[Requirement], bool, PolicyExtraction]:
    """
    Full Phase 4 Document Ingestion Pipeline:
    PDF Upload -> Validation -> Page Extraction -> Gemini 3.8 Flash -> Pydantic Schema
    -> Safe Canonical Fallback (if applicable) -> Database Persistence -> Application Aggregate.
    """
    # 1. Validation
    validate_policy_pdf(file_name, file_bytes, content_type)
    logger.info("Policy document uploaded: %s (%d bytes)", file_name, len(file_bytes))

    # 2. Extract page boundaries
    pages_data = extract_pdf_pages(file_bytes)
    combined_text = " ".join(p["text"] for p in pages_data)
    file_hash = hashlib.sha256(file_bytes).hexdigest()

    # 3. Store file safely under uploads/ with UUID
    safe_uuid = str(uuid.uuid4())
    stored_filename = f"{safe_uuid}.pdf"
    target_path = UPLOAD_DIR / stored_filename
    target_path.write_bytes(file_bytes)
    relative_path = f"uploads/{stored_filename}"

    # 4. Check for recognized canonical FSSAI demo scenario
    is_demo = is_canonical_fssai_document(file_hash=file_hash, filename=file_name, text=combined_text)

    # 5. Execute Gemini Extraction with controlled error / fallback handling
    used_demo_fallback = False
    extraction: Optional[PolicyExtraction] = None

    if settings.GEMINI_API_KEY:
        try:
            prompt_text = build_gemini_extraction_prompt(pages_data, file_name)
            extraction = call_gemini_extraction(
                prompt_text=prompt_text,
                pdf_bytes=file_bytes,
                api_key=settings.GEMINI_API_KEY,
                model_id=settings.GEMINI_MODEL,
            )
            used_demo_fallback = False
            logger.info("Gemini structured extraction completed successfully.")
        except Exception as exc:
            logger.warning("Gemini extraction failed: %s", exc)
            if is_demo:
                logger.info("Using validated canonical FSSAI demo fallback fixture.")
                extraction = get_canonical_fssai_extraction()
                used_demo_fallback = True
            else:
                raise HTTPException(
                    status_code=502,
                    detail=f"Gemini document understanding failed: {str(exc)}",
                ) from exc
    else:
        # No GEMINI_API_KEY configured
        if is_demo:
            logger.info("GEMINI_API_KEY not configured. Using recognized canonical FSSAI demo fallback.")
            extraction = get_canonical_fssai_extraction()
            used_demo_fallback = True
        else:
            logger.error("GEMINI_API_KEY is not configured and uploaded document is not recognized demo.")
            raise HTTPException(
                status_code=503,
                detail="Gemini document extraction is not configured. GEMINI_API_KEY environment variable is missing.",
            )

    # 6. Idempotency handling: check if this policy document already exists
    policy_doc = session.exec(
        select(PolicyDocument).where(PolicyDocument.file_hash == file_hash)
    ).first()

    if not policy_doc:
        policy_doc = PolicyDocument(
            title=extraction.target_name or file_name,
            document_type="POLICY_PDF",
            file_path=relative_path,
            file_hash=file_hash,
            is_demo_seed=used_demo_fallback,
            uploaded_at=utc_now(),
        )
        session.add(policy_doc)
        session.commit()
        session.refresh(policy_doc)

    # Check if an existing application for this applicant and policy document already exists (idempotent retry)
    existing_app = session.exec(
        select(Application).where(
            Application.applicant_context_id == applicant_context_id,
            Application.policy_document_id == policy_doc.id,
        )
    ).first()

    if existing_app:
        application = existing_app
        # Clean prior requirements to prevent duplication on retry
        prior_reqs = session.exec(
            select(Requirement).where(Requirement.application_id == application.id)
        ).all()
        for r in prior_reqs:
            for rule in session.exec(select(RequirementRule).where(RequirementRule.requirement_id == r.id)).all():
                session.delete(rule)
            for dep in session.exec(
                select(RequirementDependency).where(
                    (RequirementDependency.requirement_id == r.id) |
                    (RequirementDependency.depends_on_requirement_id == r.id)
                )
            ).all():
                session.delete(dep)
            session.delete(r)
        session.commit()
    else:
        application = Application(
            applicant_context_id=applicant_context_id,
            policy_document_id=policy_doc.id,
            title=f"{extraction.target_name} Application",
            current_stage=StageGate.JOINING.value,
            created_at=utc_now(),
            updated_at=utc_now(),
        )
        session.add(application)
        session.commit()
        session.refresh(application)

    # 7. Fetch applicant profile to evaluate RULE_ENGINE requirements deterministically
    profile = session.exec(
        select(ApplicantProfile).where(ApplicantProfile.applicant_context_id == applicant_context_id)
    ).first()

    # 8. Create Normalized Requirement and Rule records
    # ARCHITECTURAL SEPARATION:
    # extraction.requirements represents the institutional policy specifications extracted from the document.
    # The requirement state (VERIFIED, NEEDS_VERIFICATION, MISSING) and gate readiness are APPLICANT-SPECIFIC
    # and derived deterministically below from profile facts, verification mode, and evidence.
    created_requirements: List[Requirement] = []
    req_map_by_code: Dict[str, Requirement] = {}

    for req_ext in extraction.requirements:
        # Determine initial requirement state
        state = RequirementState.MISSING.value
        verification_method = None
        verified_by = None
        verified_at = None

        if req_ext.verification_mode == VerificationMode.RULE_ENGINE.value:
            # RULE_ENGINE requirements will be evaluated against profile
            state = RequirementState.NEEDS_VERIFICATION.value
        elif req_ext.verification_mode == VerificationMode.NEEDS_VERIFICATION.value:
            state = RequirementState.NEEDS_VERIFICATION.value
        elif req_ext.verification_mode == VerificationMode.HUMAN_CONFIRMATION.value:
            state = RequirementState.MISSING.value

        req = Requirement(
            application_id=application.id,
            code=req_ext.code,
            title=req_ext.title,
            description=req_ext.description,
            category=req_ext.category,
            blocking_stages_json=json.dumps(req_ext.blocking_stages),
            verification_mode=req_ext.verification_mode,
            rule_combination_logic=req_ext.rule_combination_logic,
            state=state,
            source_citation_json=json.dumps({
                "section": req_ext.citation.section,
                "page": req_ext.citation.page_number,
                "quote": req_ext.citation.verbatim_quote,
                "confidence_score": round(1.0 - req_ext.uncertainty_score, 2),
                "uncertainty_score": req_ext.uncertainty_score,
                "uncertainty_notes": req_ext.uncertainty_notes,
            }),
            verification_method=verification_method,
            verified_by=verified_by,
            verified_at=verified_at,
            created_at=utc_now(),
        )
        session.add(req)
        session.commit()
        session.refresh(req)

        # Create rules
        rules_for_req: List[RequirementRule] = []
        for r_spec in req_ext.rules:
            rule_record = RequirementRule(
                requirement_id=req.id,
                field=r_spec.field,
                operator=r_spec.operator,
                expected_value_json=json.dumps(r_spec.value),
                evaluation_status=RuleEvaluationStatus.UNCHECKED.value,
                evaluation_message="",
            )
            session.add(rule_record)
            session.commit()
            session.refresh(rule_record)
            rules_for_req.append(rule_record)

        # If RULE_ENGINE criteria and applicant profile exists, evaluate deterministically
        if req_ext.verification_mode == VerificationMode.RULE_ENGINE.value and rules_for_req and profile:
            eval_res = evaluate_requirement_rules(req, rules_for_req, profile)
            if eval_res["overall_status"] == RuleEvaluationStatus.SATISFIED.value:
                req.state = RequirementState.VERIFIED.value
                req.verification_method = VerificationMethod.RULE_ENGINE.value
                req.verified_by = "system_rule_engine"
                req.verified_at = utc_now()
                session.add(req)
                session.commit()
                session.refresh(req)

        created_requirements.append(req)
        req_map_by_code[req.code] = req

    # 9. Extract and persist explicit procedural dependencies
    for dep_ext in extraction.dependencies:
        req_child = req_map_by_code.get(dep_ext.requirement_code)
        req_parent = req_map_by_code.get(dep_ext.depends_on_code)

        if req_child and req_parent and req_child.id != req_parent.id:
            dep_record = RequirementDependency(
                requirement_id=req_child.id,
                depends_on_requirement_id=req_parent.id,
                dependency_type=dep_ext.dependency_type or "PREREQUISITE_EVIDENCE",
            )
            session.add(dep_record)

    session.commit()
    logger.info("Ingestion completed: created %d requirements for application %s", len(created_requirements), application.id)

    return application, policy_doc, created_requirements, used_demo_fallback, extraction
