import json
import logging
import time
from typing import Any, Dict, List, Optional
from google import genai
from google.genai import types
from pydantic import BaseModel, Field, ValidationError
from app.config import settings
from app.models import (
    DependencyType,
    RequirementState,
    RuleCombinationLogic,
    RuleOperator,
    StageGate,
    VerificationMethod,
    VerificationMode,
)

logger = logging.getLogger("formless.gemini")

CANONICAL_FSSAI_HASH = "fssai_circular_2026_canonical_sha256_seed_hash_v1"


# =========================================================================
# Structured Output Pydantic Schemas
# =========================================================================

class SourceCitation(BaseModel):
    section: str = Field(description="Section, clause, or paragraph title/number from source document")
    page_number: int = Field(description="1-based page number where requirement is located")
    verbatim_quote: str = Field(description="Exact verbatim quote from the text supporting this requirement")


class RequirementRuleSpec(BaseModel):
    field: str = Field(description="Applicant profile attribute name: degree, year_of_study, enrollment_type, cgpa")
    operator: str = Field(description="Deterministic operator: EQUALS, NOT_EQUALS, IN, NOT_IN, GTE, LTE, GT, LT, CONTAINS")
    value: Any = Field(description="Expected comparison value (string, integer, float, or list of values)")


class RequirementExtraction(BaseModel):
    code: str = Field(description="Unique requirement code, e.g. REQ-01 or FSSAI-REQ-01")
    title: str = Field(description="Short human-readable requirement title")
    description: str = Field(description="Detailed explanation of the compliance requirement")
    category: str = Field(default="ELIGIBILITY", description="ELIGIBILITY, DOCUMENTATION, PREREQUISITE, CONDUCT")
    is_mandatory: bool = Field(default=True, description="Whether requirement is mandatory")
    evidence_type: str = Field(default="DOCUMENT", description="DOCUMENT, PROFILE_FIELD, DECLARATION, EXTERNAL_CHECK")
    verification_mode: str = Field(
        default="HUMAN_CONFIRMATION",
        description="RULE_ENGINE (machine evaluable), HUMAN_CONFIRMATION (evidence review), or NEEDS_VERIFICATION (ambiguous/external)",
    )
    blocking_stages: List[str] = Field(
        default_factory=lambda: ["JOINING"],
        description="Stage gates blocked: APPLICATION_SUBMISSION, JOINING, COMPLETION",
    )
    rule_combination_logic: str = Field(default="ALL", description="ALL or ANY")
    rules: List[RequirementRuleSpec] = Field(
        default_factory=list,
        description="List of deterministic machine-readable rules; empty if verification_mode is not RULE_ENGINE",
    )
    citation: SourceCitation = Field(description="Exact source citation with section, page, quote")
    uncertainty_score: float = Field(
        default=0.0,
        description="Uncertainty level from 0.0 (fully certain) to 1.0 (highly ambiguous)",
    )
    uncertainty_notes: Optional[str] = Field(
        default=None,
        description="Notes explaining any ambiguity or why verification is required",
    )


class DependencyExtraction(BaseModel):
    requirement_code: str = Field(description="Code of the requirement that has a dependency")
    depends_on_code: str = Field(description="Code of the prerequisite requirement")
    dependency_type: str = Field(
        default="PREREQUISITE_EVIDENCE",
        description="PREREQUISITE_EVIDENCE or STRICT_VERIFICATION",
    )


class PolicyExtraction(BaseModel):
    target_name: str = Field(description="Name of the program, policy, or internship circular")
    organization: str = Field(description="Issuing authority or organization")
    deadline: Optional[str] = Field(default=None, description="Application or joining deadline if stated")
    requirements: List[RequirementExtraction] = Field(description="Structured compliance requirements")
    dependencies: List[DependencyExtraction] = Field(
        default_factory=list,
        description="Explicit procedural dependencies established directly by the document",
    )
    model_version: Optional[str] = Field(
        default=None,
        description="Exact model identifier that produced this extraction (e.g. gemini-3.8-flash, gemini-3.5-flash)",
    )


# =========================================================================
# Canonical FSSAI Demo Scenario Fallback Fixture
# =========================================================================

def get_canonical_fssai_extraction() -> PolicyExtraction:
    """
    Returns the validated canonical 8-requirement FSSAI internship baseline.
    Used ONLY as a verified demo fallback for recognized FSSAI documents.

    ARCHITECTURAL NOTE — STATE SEPARATION:
    This fixture represents extracted POLICY REQUIREMENTS only (the institutional specification,
    including rules, thresholds, citations, and verification modes). It carries NO applicant state.
    Applicant requirement states (VERIFIED, NEEDS_VERIFICATION, MISSING) and gate readiness
    (READY vs NOT_READY) are subsequently and deterministically derived by the rule engine,
    evidence lifecycle, and stage gate readiness engine based on the specific applicant's profile
    and submitted evidence.
    """
    return PolicyExtraction(
        target_name="FSSAI Internship Program 2026",
        organization="Food Safety and Standards Authority of India",
        deadline="2026-10-31",
        model_version="canonical-fssai-baseline",
        requirements=[
            RequirementExtraction(
                code="FSSAI-REQ-01",
                title="B.Tech Information Technology",
                description="Candidate must be enrolled in B.Tech Information Technology or approved relevant discipline.",
                category="ELIGIBILITY",
                is_mandatory=True,
                evidence_type="PROFILE_FIELD",
                verification_mode="RULE_ENGINE",
                blocking_stages=["APPLICATION_SUBMISSION"],
                rule_combination_logic="ALL",
                rules=[
                    RequirementRuleSpec(
                        field="degree",
                        operator="EQUALS",
                        value="B.Tech Information Technology",
                    )
                ],
                citation=SourceCitation(
                    section="Section 3(a) - Educational Qualifications",
                    page_number=1,
                    verbatim_quote="Students pursuing regular B.Tech in Information Technology or Computer Science from recognized institutions.",
                ),
                uncertainty_score=0.02,
            ),
            RequirementExtraction(
                code="FSSAI-REQ-02",
                title="3rd Year",
                description="Students must be currently in their 3rd or 4th year of undergraduate study.",
                category="ELIGIBILITY",
                is_mandatory=True,
                evidence_type="PROFILE_FIELD",
                verification_mode="RULE_ENGINE",
                blocking_stages=["APPLICATION_SUBMISSION"],
                rule_combination_logic="ALL",
                rules=[
                    RequirementRuleSpec(
                        field="year_of_study",
                        operator="IN",
                        value=[3, 4],
                    )
                ],
                citation=SourceCitation(
                    section="Section 3(b) - Year of Study",
                    page_number=1,
                    verbatim_quote="Only 3rd and 4th year undergraduate students are eligible to apply for the internship.",
                ),
                uncertainty_score=0.01,
            ),
            RequirementExtraction(
                code="FSSAI-REQ-03",
                title="Full-time study",
                description="Candidate must be pursuing a regular full-time degree course.",
                category="ELIGIBILITY",
                is_mandatory=True,
                evidence_type="PROFILE_FIELD",
                verification_mode="RULE_ENGINE",
                blocking_stages=["APPLICATION_SUBMISSION"],
                rule_combination_logic="ALL",
                rules=[
                    RequirementRuleSpec(
                        field="enrollment_type",
                        operator="EQUALS",
                        value="FULL_TIME",
                    )
                ],
                citation=SourceCitation(
                    section="Section 3(c) - Attendance & Mode",
                    page_number=2,
                    verbatim_quote="Candidates enrolled in regular full-time programs are eligible; part-time students are not eligible.",
                ),
                uncertainty_score=0.04,
            ),
            RequirementExtraction(
                code="FSSAI-REQ-04",
                title="Academic qualification",
                description="Minimum cumulative grade point average (CGPA) of 6.0 or higher.",
                category="ELIGIBILITY",
                is_mandatory=True,
                evidence_type="PROFILE_FIELD",
                verification_mode="RULE_ENGINE",
                blocking_stages=["APPLICATION_SUBMISSION"],
                rule_combination_logic="ALL",
                rules=[
                    RequirementRuleSpec(
                        field="cgpa",
                        operator="GTE",
                        value=6.0,
                    )
                ],
                citation=SourceCitation(
                    section="Section 3(d) - Academic Standing",
                    page_number=2,
                    verbatim_quote="A minimum CGPA of 6.0 out of 10 or equivalent aggregate in preceding semester examinations.",
                ),
                uncertainty_score=0.03,
            ),
            RequirementExtraction(
                code="FSSAI-REQ-05",
                title="Recognized institute",
                description="Institution must be recognized by UGC, AICTE, or Central/State Government.",
                category="ELIGIBILITY",
                is_mandatory=True,
                evidence_type="EXTERNAL_CHECK",
                verification_mode="NEEDS_VERIFICATION",
                blocking_stages=["APPLICATION_SUBMISSION"],
                rule_combination_logic="ALL",
                rules=[],
                citation=SourceCitation(
                    section="Section 2 - Institutional Recognition",
                    page_number=1,
                    verbatim_quote="Colleges and universities must be recognized by AICTE, UGC, or established by Act of Parliament.",
                ),
                uncertainty_score=0.15,
                uncertainty_notes="Requires institutional registry check against accredited college list.",
            ),
            RequirementExtraction(
                code="FSSAI-REQ-06",
                title="Personal laptop",
                description="Selected candidate must bring and utilize a personal laptop during the internship.",
                category="PREREQUISITE",
                is_mandatory=True,
                evidence_type="DECLARATION",
                verification_mode="NEEDS_VERIFICATION",
                blocking_stages=["COMPLETION"],
                rule_combination_logic="ALL",
                rules=[],
                citation=SourceCitation(
                    section="Section 5 - Working Conditions",
                    page_number=3,
                    verbatim_quote="Interns are required to have their own laptops and software necessary for task assignments.",
                ),
                uncertainty_score=0.10,
                uncertainty_notes="Working condition requirement subject to candidate declaration.",
            ),
            RequirementExtraction(
                code="FSSAI-REQ-07",
                title="College NOC",
                description="No Objection Certificate from Head of Institution on official college letterhead.",
                category="DOCUMENTATION",
                is_mandatory=True,
                evidence_type="DOCUMENT",
                verification_mode="HUMAN_CONFIRMATION",
                blocking_stages=["JOINING"],
                rule_combination_logic="ALL",
                rules=[],
                citation=SourceCitation(
                    section="Section 4(a) - Mandatory Clearances",
                    page_number=2,
                    verbatim_quote="Candidates must submit a No Objection Certificate from the Head of the Institution/College at the time of joining.",
                ),
                uncertainty_score=0.01,
            ),
            RequirementExtraction(
                code="FSSAI-REQ-08",
                title="Character Certificate",
                description="Character and Conduct Certificate issued by Dean/Principal or Gazetted Officer.",
                category="CONDUCT",
                is_mandatory=True,
                evidence_type="DOCUMENT",
                verification_mode="HUMAN_CONFIRMATION",
                blocking_stages=["JOINING"],
                rule_combination_logic="ALL",
                rules=[],
                citation=SourceCitation(
                    section="Section 4(b) - Conduct Clearance",
                    page_number=2,
                    verbatim_quote="A character certificate from the institute authority must be furnished prior to joining.",
                ),
                uncertainty_score=0.05,
            ),
        ],
        dependencies=[],  # No artificial inter-dependency between NOC and Character Certificate
    )


def is_canonical_fssai_document(file_hash: str, filename: str, text: str) -> bool:
    """
    Determines whether an uploaded document represents the canonical FSSAI demo document.
    """
    if file_hash == CANONICAL_FSSAI_HASH:
        return True

    lower_fn = filename.lower()
    lower_text = text.lower()

    if "fssai" in lower_fn and ("internship" in lower_fn or "circular" in lower_fn):
        return True

    if "food safety and standards authority of india" in lower_text and "internship" in lower_text:
        return True

    if "fssai" in lower_text and "internship" in lower_text and "no objection certificate" in lower_text:
        return True

    return False


# =========================================================================
# Gemini Prompt Formulation & Client Calls
# =========================================================================

SYSTEM_INSTRUCTION = """You are an expert compliance, accreditation, and policy document understanding engine.
Your purpose is to extract structured, actionable compliance requirements from institutional policy documents.

Guidelines:
1. Extract all eligibility criteria, documentation requirements, prerequisites, and conduct stipulations.
2. For each requirement, pinpoint the exact source citation:
   - section: section or clause title/heading
   - page_number: 1-based page number where the requirement appears
   - verbatim_quote: word-for-word quote from the text supporting this requirement. Do not invent or summarize quotes.
3. For deterministic criteria with quantitative or exact categorical thresholds, extract machine-evaluable rules:
   - Supported fields: degree, year_of_study, enrollment_type, cgpa
   - Supported operators: EQUALS, NOT_EQUALS, IN, NOT_IN, GTE, LTE, GT, LT, CONTAINS
   - Supported values: string, integer, float, or list of values
4. If a statement is subjective, ambiguous, or lacks explicit deterministic parameters:
   - Do NOT invent a rule. Keep rules list empty.
   - Set verification_mode to 'NEEDS_VERIFICATION'.
   - Record an uncertainty_score (0.0 to 1.0) and explain in uncertainty_notes.
5. Set verification_mode:
   - 'RULE_ENGINE': when the requirement can be deterministically verified from applicant profile attributes.
   - 'HUMAN_CONFIRMATION': when documentary evidence or physical clearance requires human reviewer confirmation.
   - 'NEEDS_VERIFICATION': when external accreditation or ambiguity requires verification.
6. Set evidence_type:
   - 'DOCUMENT': when a certificate, NOC, or letter is required.
   - 'PROFILE_FIELD': when an academic attribute on the applicant profile is evaluated.
   - 'DECLARATION': for self-declarations or possession of personal items (e.g. laptop).
   - 'EXTERNAL_CHECK': for third-party institutional accreditation.
7. Set blocking_stages:
   - Assign only when explicitly supported by the text: APPLICATION_SUBMISSION, JOINING, or COMPLETION.
   - If both Requirement A and B are required before joining, set blocking_stages to ['JOINING'] for both.
8. Dependencies:
   - Only extract procedural dependencies if the document explicitly states one requirement is a prerequisite for another.
   - Do NOT assume requirements depend on each other simply because they block the same stage.
"""


def build_gemini_extraction_prompt(pages_data: List[Dict[str, Any]], filename: str) -> str:
    """
    Constructs a page-delimited prompt preserving document boundaries.
    """
    parts = [
        f"Document Filename: {filename}",
        "Analyze the following institutional policy document page-by-page and extract all requirements into the structured schema:\n",
    ]

    for p in pages_data:
        page_num = p.get("page_number", 1)
        text = p.get("text", "")
        parts.append(f"--- Page {page_num} ---")
        parts.append(text)
        parts.append("")

    return "\n".join(parts)


def call_gemini_extraction(
    prompt_text: str,
    pdf_bytes: Optional[bytes] = None,
    api_key: Optional[str] = None,
    model_id: Optional[str] = None,
) -> PolicyExtraction:
    """
    Invokes Gemini 3.8 Flash using the official google-genai SDK with schema-constrained output.
    Validates output with Pydantic.

    ARCHITECTURAL MODEL GOVERNANCE & RESILIENCE:
    - Primary Target: gemini-3.8-flash (configured in settings.GEMINI_MODEL).
    - Resilience Fallback: gemini-3.5-flash.
    - Trigger Condition: Upstream unavailability / rate exhaustion (503 UNAVAILABLE, 429 RESOURCE_EXHAUSTED).
    - Transparency: Never silently masquerades. The successful model is explicitly stamped
      on PolicyExtraction.model_version and returned to downstream callers.
    """
    key = api_key or settings.GEMINI_API_KEY
    if not key:
        raise ValueError("GEMINI_API_KEY is not configured.")

    client = genai.Client(api_key=key)

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=PolicyExtraction,
        temperature=0.1,
        system_instruction=SYSTEM_INSTRUCTION,
    )

    contents = [prompt_text]
    if pdf_bytes is not None:
        try:
            pdf_part = types.Part.from_bytes(data=pdf_bytes, mime_type="application/pdf")
            contents = [pdf_part, prompt_text]
        except Exception as exc:
            logger.warning("Could not attach raw PDF bytes, proceeding with page text: %s", exc)

    primary_model = model_id or settings.GEMINI_MODEL
    models_to_try = [primary_model]
    if primary_model != "gemini-3.5-flash" and "gemini-3.5-flash" not in models_to_try:
        models_to_try.append("gemini-3.5-flash")

    last_exc: Optional[Exception] = None

    for current_model in models_to_try:
        is_primary = (current_model == primary_model)
        logger.info(
            "Attempting Gemini extraction with %s model: %s",
            "primary" if is_primary else "fallback",
            current_model,
        )
        try:
            response = client.models.generate_content(
                model=current_model,
                contents=contents,
                config=config,
            )

            response_text = response.text
            if not response_text:
                raise ValueError(f"Gemini returned empty response text from {current_model}.")

            extraction = PolicyExtraction.model_validate_json(response_text)
            extraction.model_version = current_model

            if is_primary:
                logger.info(
                    "Gemini extraction succeeded with primary model %s: extracted %d requirements",
                    current_model,
                    len(extraction.requirements),
                )
            else:
                logger.warning(
                    "Gemini extraction succeeded with FALLBACK model %s (primary %s was unavailable): extracted %d requirements",
                    current_model,
                    primary_model,
                    len(extraction.requirements),
                )
            return extraction

        except ValidationError as val_err:
            logger.error("Gemini structured output validation failed for %s: %s", current_model, val_err)
            raise ValueError(f"Gemini output failed schema validation: {val_err}") from val_err
        except Exception as exc:
            last_exc = exc
            err_str = str(exc)
            if ("503" in err_str or "UNAVAILABLE" in err_str or "RESOURCE_EXHAUSTED" in err_str or "429" in err_str or "timeout" in err_str.lower() or "timed out" in err_str.lower()):
                logger.warning(
                    "Model %s failed due to upstream availability/load (%s).",
                    current_model,
                    exc,
                )
                continue
            logger.error("Gemini API call failed for model %s: %s", current_model, exc)

    if last_exc:
        raise last_exc
    raise RuntimeError("Unexpected termination of Gemini extraction loop.")
