import hashlib
import io
import json
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient
import pypdf
from sqlmodel import Session, select
from app.config import settings
from app.database import engine, init_db
from app.main import app
from app.models import (
    ApplicantProfile,
    Application,
    PolicyDocument,
    Requirement,
    RequirementDependency,
    RequirementRule,
    RequirementState,
    StageGate,
    VerificationMethod,
    VerificationMode,
)
from app.services.gemini_service import (
    DependencyExtraction,
    PolicyExtraction,
    RequirementExtraction,
    RequirementRuleSpec,
    SourceCitation,
    get_canonical_fssai_extraction,
    is_canonical_fssai_document,
)
from app.services.seed import DEMO_CONTEXT_ID, reset_canonical_fssai_demo

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    init_db()
    with Session(engine) as session:
        reset_canonical_fssai_demo(session)
    with patch.object(settings, "GEMINI_API_KEY", "mock_api_key_for_tests"):
        yield


def generate_valid_pdf_bytes(text: str = "Test document content") -> bytes:
    """Creates a valid PDF byte string with pypdf."""
    writer = pypdf.PdfWriter()
    writer.add_blank_page(width=612, height=792)
    stream = io.BytesIO()
    writer.write(stream)
    return stream.getvalue()


def sample_policy_extraction() -> PolicyExtraction:
    """Fixture returning a valid PolicyExtraction for mock tests."""
    return PolicyExtraction(
        target_name="State Renewable Energy Fellowship 2026",
        organization="State Energy Board",
        deadline="2026-11-15",
        requirements=[
            RequirementExtraction(
                code="ENERGY-REQ-01",
                title="B.Tech Degree in Energy Studies",
                description="Applicant must hold a B.Tech degree in Energy Studies or allied discipline.",
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
                    section="Section 2.1 - Educational Criteria",
                    page_number=1,
                    verbatim_quote="Applicants must possess a recognized engineering undergraduate degree.",
                ),
                uncertainty_score=0.02,
            ),
            RequirementExtraction(
                code="ENERGY-REQ-02",
                title="Minimum CGPA Requirement",
                description="Cumulative GPA must be at least 7.5.",
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
                        value=7.5,
                    )
                ],
                citation=SourceCitation(
                    section="Section 2.2 - Academic Standing",
                    page_number=1,
                    verbatim_quote="A cumulative GPA of at least 7.5 on a 10.0 scale is mandatory.",
                ),
                uncertainty_score=0.01,
            ),
            RequirementExtraction(
                code="ENERGY-REQ-03",
                title="College Recommendation Letter",
                description="Official recommendation signed by Head of Department.",
                category="DOCUMENTATION",
                is_mandatory=True,
                evidence_type="DOCUMENT",
                verification_mode="HUMAN_CONFIRMATION",
                blocking_stages=["JOINING"],
                rule_combination_logic="ALL",
                rules=[],
                citation=SourceCitation(
                    section="Section 4 - Documentation",
                    page_number=2,
                    verbatim_quote="A recommendation letter from the Head of the Department must be submitted prior to joining.",
                ),
                uncertainty_score=0.03,
            ),
            RequirementExtraction(
                code="ENERGY-REQ-04",
                title="Specialized Laboratory Experience",
                description="Candidate should possess relevant lab training in renewable systems.",
                category="PREREQUISITE",
                is_mandatory=False,
                evidence_type="EXTERNAL_CHECK",
                verification_mode="NEEDS_VERIFICATION",
                blocking_stages=["COMPLETION"],
                rule_combination_logic="ALL",
                rules=[],
                citation=SourceCitation(
                    section="Section 5 - Desirable Competencies",
                    page_number=3,
                    verbatim_quote="Prior laboratory exposure to solar or renewable test rigs is highly desirable.",
                ),
                uncertainty_score=0.35,
                uncertainty_notes="Ambiguous phrasing ('desirable') requires manual committee assessment.",
            ),
        ],
        dependencies=[
            DependencyExtraction(
                requirement_code="ENERGY-REQ-03",
                depends_on_code="ENERGY-REQ-01",
                dependency_type="PREREQUISITE_EVIDENCE",
            )
        ],
    )


# =========================================================================
# 1. Validation Tests (Items 1 - 3)
# =========================================================================

def test_01_pdf_validation_accepts_valid_pdf():
    valid_pdf = generate_valid_pdf_bytes("Valid Test Policy")
    with patch("app.services.ingestion_service.call_gemini_extraction") as mock_gemini:
        mock_gemini.return_value = sample_policy_extraction()
        response = client.post(
            "/api/v1/documents/ingest",
            files={"file": ("policy.pdf", valid_pdf, "application/pdf")},
            data={"applicant_context_id": "demo_applicant_01"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ingest_success"
        assert "application" in data
        assert "policy_document" in data


def test_02_unsupported_non_pdf_file_rejected():
    # Attempting to upload a text file
    response_txt = client.post(
        "/api/v1/documents/ingest",
        files={"file": ("policy.txt", b"This is plain text", "text/plain")},
    )
    assert response_txt.status_code == 400
    assert "pdf" in response_txt.json()["detail"].lower()

    # Attempting to upload a PNG image
    response_png = client.post(
        "/api/v1/documents/ingest",
        files={"file": ("policy.png", b"\x89PNG\r\n\x1a\n", "image/png")},
    )
    assert response_png.status_code == 400
    assert "pdf" in response_png.json()["detail"].lower()

    # File named .pdf but without %PDF- signature
    response_fake = client.post(
        "/api/v1/documents/ingest",
        files={"file": ("corrupt.pdf", b"NOT_A_REAL_PDF", "application/pdf")},
    )
    assert response_fake.status_code == 400
    assert "signature" in response_fake.json()["detail"].lower() or "pdf" in response_fake.json()["detail"].lower()


def test_03_oversized_policy_rejected():
    # Construct 50MB + 10 bytes file
    huge_bytes = b"%PDF-" + b"0" * (50 * 1024 * 1024 + 10)
    response = client.post(
        "/api/v1/documents/ingest",
        files={"file": ("huge_policy.pdf", huge_bytes, "application/pdf")},
    )
    assert response.status_code == 413
    assert "50 mb" in response.json()["detail"].lower()


# =========================================================================
# 2. API Key Configuration & Error Handling (Item 4)
# =========================================================================

def test_04_missing_gemini_api_key_handled_safely():
    valid_pdf = generate_valid_pdf_bytes("Arbitrary Non-Demo Document")
    # Simulate missing GEMINI_API_KEY for an arbitrary non-demo document
    with patch.object(settings, "GEMINI_API_KEY", ""):
        response = client.post(
            "/api/v1/documents/ingest",
            files={"file": ("arbitrary_corporate_policy.pdf", valid_pdf, "application/pdf")},
        )
        assert response.status_code == 503
        assert "gemini_api_key" in response.json()["detail"].lower()


# =========================================================================
# 3. Schema & Normalization Tests (Items 5 - 11)
# =========================================================================

def test_05_gemini_structured_output_schema_validation():
    extraction = sample_policy_extraction()
    # Validate Pydantic schema serialization and deserialization
    json_str = extraction.model_dump_json()
    reloaded = PolicyExtraction.model_validate_json(json_str)
    assert reloaded.target_name == "State Renewable Energy Fellowship 2026"
    assert len(reloaded.requirements) == 4
    assert reloaded.requirements[0].rules[0].operator == "EQUALS"


def test_06_valid_extraction_becomes_normalized_requirements():
    valid_pdf = generate_valid_pdf_bytes()
    with patch("app.services.ingestion_service.call_gemini_extraction") as mock_gemini:
        mock_gemini.return_value = sample_policy_extraction()
        response = client.post(
            "/api/v1/documents/ingest",
            files={"file": ("renewable_fellowship.pdf", valid_pdf, "application/pdf")},
            data={"applicant_context_id": "demo_applicant_01"},
        )
        assert response.status_code == 200
        app_id = response.json()["application"]["id"]

        with Session(engine) as session:
            reqs = session.exec(select(Requirement).where(Requirement.application_id == app_id)).all()
            assert len(reqs) == 4
            codes = {r.code for r in reqs}
            assert "ENERGY-REQ-01" in codes
            assert "ENERGY-REQ-02" in codes
            assert "ENERGY-REQ-03" in codes
            assert "ENERGY-REQ-04" in codes


def test_07_extracted_rule_becomes_requirement_rule():
    valid_pdf = generate_valid_pdf_bytes()
    with patch("app.services.ingestion_service.call_gemini_extraction") as mock_gemini:
        mock_gemini.return_value = sample_policy_extraction()
        response = client.post(
            "/api/v1/documents/ingest",
            files={"file": ("fellowship.pdf", valid_pdf, "application/pdf")},
        )
        assert response.status_code == 200
        app_id = response.json()["application"]["id"]

        with Session(engine) as session:
            r1 = session.exec(
                select(Requirement).where(
                    Requirement.application_id == app_id,
                    Requirement.code == "ENERGY-REQ-01",
                )
            ).first()
            assert r1 is not None

            rules = session.exec(select(RequirementRule).where(RequirementRule.requirement_id == r1.id)).all()
            assert len(rules) == 1
            assert rules[0].field == "degree"
            assert rules[0].operator == "EQUALS"
            assert rules[0].expected_value == "B.Tech Information Technology"


def test_08_citations_are_persisted():
    valid_pdf = generate_valid_pdf_bytes()
    with patch("app.services.ingestion_service.call_gemini_extraction") as mock_gemini:
        mock_gemini.return_value = sample_policy_extraction()
        response = client.post(
            "/api/v1/documents/ingest",
            files={"file": ("fellowship.pdf", valid_pdf, "application/pdf")},
        )
        app_id = response.json()["application"]["id"]

        with Session(engine) as session:
            r1 = session.exec(
                select(Requirement).where(
                    Requirement.application_id == app_id,
                    Requirement.code == "ENERGY-REQ-01",
                )
            ).first()
            citation = r1.source_citation
            assert citation["section"] == "Section 2.1 - Educational Criteria"
            assert citation["page"] == 1
            assert "Applicants must possess a recognized engineering" in citation["quote"]


def test_09_page_numbers_are_preserved():
    valid_pdf = generate_valid_pdf_bytes()
    with patch("app.services.ingestion_service.call_gemini_extraction") as mock_gemini:
        mock_gemini.return_value = sample_policy_extraction()
        response = client.post(
            "/api/v1/documents/ingest",
            files={"file": ("fellowship.pdf", valid_pdf, "application/pdf")},
        )
        app_id = response.json()["application"]["id"]

        with Session(engine) as session:
            r3 = session.exec(
                select(Requirement).where(
                    Requirement.application_id == app_id,
                    Requirement.code == "ENERGY-REQ-03",
                )
            ).first()
            assert r3.source_citation["page"] == 2


def test_10_section_quote_are_preserved():
    valid_pdf = generate_valid_pdf_bytes()
    with patch("app.services.ingestion_service.call_gemini_extraction") as mock_gemini:
        mock_gemini.return_value = sample_policy_extraction()
        response = client.post(
            "/api/v1/documents/ingest",
            files={"file": ("fellowship.pdf", valid_pdf, "application/pdf")},
        )
        app_id = response.json()["application"]["id"]

        with Session(engine) as session:
            r4 = session.exec(
                select(Requirement).where(
                    Requirement.application_id == app_id,
                    Requirement.code == "ENERGY-REQ-04",
                )
            ).first()
            assert r4.source_citation["section"] == "Section 5 - Desirable Competencies"
            assert "solar or renewable test rigs" in r4.source_citation["quote"]


def test_11_ambiguous_requirement_becomes_needs_verification():
    valid_pdf = generate_valid_pdf_bytes()
    with patch("app.services.ingestion_service.call_gemini_extraction") as mock_gemini:
        mock_gemini.return_value = sample_policy_extraction()
        response = client.post(
            "/api/v1/documents/ingest",
            files={"file": ("fellowship.pdf", valid_pdf, "application/pdf")},
        )
        app_id = response.json()["application"]["id"]

        with Session(engine) as session:
            r4 = session.exec(
                select(Requirement).where(
                    Requirement.application_id == app_id,
                    Requirement.code == "ENERGY-REQ-04",
                )
            ).first()
            assert r4.verification_mode == VerificationMode.NEEDS_VERIFICATION.value
            assert r4.state == RequirementState.NEEDS_VERIFICATION.value
            # Ambiguous requirements do NOT have manufactured rules
            rules = session.exec(select(RequirementRule).where(RequirementRule.requirement_id == r4.id)).all()
            assert len(rules) == 0
            assert r4.source_citation["uncertainty_score"] == 0.35


# =========================================================================
# 4. Error Handling & Malformed Output (Item 12)
# =========================================================================

def test_12_malformed_gemini_output_is_rejected_safely():
    valid_pdf = generate_valid_pdf_bytes("Arbitrary Document")
    with patch.object(settings, "GEMINI_API_KEY", "dummy_key"):
        with patch("app.services.ingestion_service.call_gemini_extraction") as mock_gemini:
            # Simulate Gemini throwing a schema validation or API error
            mock_gemini.side_effect = ValueError("Gemini returned malformed non-JSON output")
            response = client.post(
                "/api/v1/documents/ingest",
                files={"file": ("arbitrary.pdf", valid_pdf, "application/pdf")},
            )
            assert response.status_code == 502
            assert "malformed" in response.json()["detail"].lower() or "failed" in response.json()["detail"].lower()


# =========================================================================
# 5. Fallback Scenarios (Items 13 - 14)
# =========================================================================

def test_13_demo_fallback_works_only_for_recognized_fssai_demo_scenario():
    # Construct an FSSAI recognized demo PDF
    valid_pdf = generate_valid_pdf_bytes("FSSAI Internship Scheme Circular 2026 Food Safety and Standards Authority of India")
    with patch.object(settings, "GEMINI_API_KEY", ""):
        response = client.post(
            "/api/v1/documents/ingest",
            files={"file": ("fssai_internship_circular_2026.pdf", valid_pdf, "application/pdf")},
            data={"applicant_context_id": "demo_applicant_01"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ingest_success"
        assert data["used_demo_fallback"] is True
        assert data["extraction_source"] == "CANONICAL_DEMO_FALLBACK"

        # Check that canonical requirements were populated
        aggregate = data["aggregate"]
        req_codes = [r["code"] for r in aggregate["requirements"]]
        assert "FSSAI-REQ-01" in req_codes
        assert "FSSAI-REQ-07" in req_codes
        assert aggregate["progress"]["total_count"] == 8


def test_14_arbitrary_document_does_not_receive_fssai_fallback():
    # Construct an arbitrary municipal document with no FSSAI markers
    valid_pdf = generate_valid_pdf_bytes("City Municipal Corporation Sanitation Standards 2026")
    with patch.object(settings, "GEMINI_API_KEY", ""):
        response = client.post(
            "/api/v1/documents/ingest",
            files={"file": ("city_sanitation_policy.pdf", valid_pdf, "application/pdf")},
        )
        assert response.status_code == 503
        assert "gemini_api_key" in response.json()["detail"].lower()


# =========================================================================
# 6. Dependency & Persistence Tests (Items 15 - 19)
# =========================================================================

def test_15_dependency_extraction_does_not_invent_relationships():
    valid_pdf = generate_valid_pdf_bytes()
    with patch("app.services.ingestion_service.call_gemini_extraction") as mock_gemini:
        mock_gemini.return_value = sample_policy_extraction()
        response = client.post(
            "/api/v1/documents/ingest",
            files={"file": ("fellowship.pdf", valid_pdf, "application/pdf")},
        )
        app_id = response.json()["application"]["id"]

        with Session(engine) as session:
            # Check dependencies: only ENERGY-REQ-03 -> ENERGY-REQ-01 should exist for this application
            r1 = session.exec(select(Requirement).where(Requirement.application_id == app_id, Requirement.code == "ENERGY-REQ-01")).first()
            r3 = session.exec(select(Requirement).where(Requirement.application_id == app_id, Requirement.code == "ENERGY-REQ-03")).first()
            req_ids = [r.id for r in session.exec(select(Requirement).where(Requirement.application_id == app_id)).all()]
            deps = session.exec(select(RequirementDependency).where(RequirementDependency.requirement_id.in_(req_ids))).all()

            assert len(deps) == 1
            assert deps[0].requirement_id == r3.id
            assert deps[0].depends_on_requirement_id == r1.id


def test_16_ingestion_persists_policy_document():
    valid_pdf = generate_valid_pdf_bytes("Test Policy Document")
    expected_hash = hashlib.sha256(valid_pdf).hexdigest()

    with patch("app.services.ingestion_service.call_gemini_extraction") as mock_gemini:
        mock_gemini.return_value = sample_policy_extraction()
        response = client.post(
            "/api/v1/documents/ingest",
            files={"file": ("policy_doc.pdf", valid_pdf, "application/pdf")},
        )
        assert response.status_code == 200
        doc_id = response.json()["policy_document"]["id"]

        with Session(engine) as session:
            doc = session.get(PolicyDocument, doc_id)
            assert doc is not None
            assert doc.file_hash == expected_hash
            assert doc.document_type == "POLICY_PDF"


def test_17_ingestion_creates_application():
    valid_pdf = generate_valid_pdf_bytes()
    with patch("app.services.ingestion_service.call_gemini_extraction") as mock_gemini:
        mock_gemini.return_value = sample_policy_extraction()
        response = client.post(
            "/api/v1/documents/ingest",
            files={"file": ("policy.pdf", valid_pdf, "application/pdf")},
            data={"applicant_context_id": "test_applicant_99"},
        )
        assert response.status_code == 200
        app_id = response.json()["application"]["id"]

        with Session(engine) as session:
            app_obj = session.get(Application, app_id)
            assert app_obj is not None
            assert app_obj.applicant_context_id == "test_applicant_99"
            assert app_obj.current_stage == StageGate.JOINING.value


def test_18_ingestion_creates_requirements():
    valid_pdf = generate_valid_pdf_bytes()
    with patch("app.services.ingestion_service.call_gemini_extraction") as mock_gemini:
        mock_gemini.return_value = sample_policy_extraction()
        response = client.post(
            "/api/v1/documents/ingest",
            files={"file": ("policy.pdf", valid_pdf, "application/pdf")},
        )
        app_id = response.json()["application"]["id"]

        with Session(engine) as session:
            reqs = session.exec(select(Requirement).where(Requirement.application_id == app_id)).all()
            assert len(reqs) == 4
            for r in reqs:
                assert r.application_id == app_id
                assert r.code.startswith("ENERGY-REQ-")


def test_19_ingestion_is_safe_against_duplicate_retry():
    valid_pdf = generate_valid_pdf_bytes("Idempotent Test Policy")
    with patch("app.services.ingestion_service.call_gemini_extraction") as mock_gemini:
        mock_gemini.return_value = sample_policy_extraction()

        # First ingestion
        res1 = client.post(
            "/api/v1/documents/ingest",
            files={"file": ("policy_retry.pdf", valid_pdf, "application/pdf")},
            data={"applicant_context_id": "retry_applicant"},
        )
        assert res1.status_code == 200
        app_id1 = res1.json()["application"]["id"]

        # Duplicate retry with same document and same applicant context
        res2 = client.post(
            "/api/v1/documents/ingest",
            files={"file": ("policy_retry.pdf", valid_pdf, "application/pdf")},
            data={"applicant_context_id": "retry_applicant"},
        )
        assert res2.status_code == 200
        app_id2 = res2.json()["application"]["id"]

        # Must reuse the same application rather than creating orphaned duplicates
        assert app_id1 == app_id2

        with Session(engine) as session:
            reqs = session.exec(select(Requirement).where(Requirement.application_id == app_id1)).all()
            # Requirement count must not be doubled (still 4)
            assert len(reqs) == 4


def test_20_live_gemini_integration_optional():
    """
    Live Gemini 3.8 Flash integration test:
    Executes ONLY if real GEMINI_API_KEY is configured in the environment.
    Safely skipped with report if not configured.
    """
    import os
    real_key = os.getenv("GEMINI_API_KEY")
    if not real_key:
        pytest.skip("LIVE GEMINI INTEGRATION NOT EXECUTED — GEMINI_API_KEY NOT CONFIGURED.")

    from app.services.gemini_service import call_gemini_extraction
    valid_pdf = generate_valid_pdf_bytes("FSSAI Internship Circular 2026")
    prompt_text = (
        "Extract compliance requirements from this policy circular:\n"
        "Title: National Clean Tech Fellowship 2026\n"
        "Organization: National Clean Tech Mission\n"
        "Section 1 - Eligibility:\n"
        "Candidates must possess a regular full-time B.Tech degree with minimum 6.5 CGPA.\n"
        "Section 2 - Mandatory Documentation:\n"
        "An official endorsement letter from the Department Head must be provided prior to joining."
    )
    extraction = call_gemini_extraction(
        prompt_text=prompt_text,
        pdf_bytes=valid_pdf,
        api_key=real_key,
    )
    assert isinstance(extraction, PolicyExtraction)
    assert extraction.target_name != ""
    assert len(extraction.requirements) > 0
    assert extraction.model_version in ("gemini-3.8-flash", "gemini-3.5-flash")
    print(f"\n[LIVE GEMINI INTEGRATION] Successfully extracted with model: {extraction.model_version}")


def test_21_extraction_state_separated_from_applicant_readiness():
    """
    Regression Test for Canonical FSSAI Fallback & Ingestion:
    Proves that PolicyExtraction represents extracted POLICY REQUIREMENTS only,
    while applicant-specific requirement states and readiness are subsequently
    and deterministically derived from the applicant's profile and evidence.

    1. Ineligible applicant -> Same 8 policy requirements extracted, but 0 verified,
       gate readiness NOT_READY.
    2. Eligible demo applicant -> Same 8 policy requirements extracted, 4 verified
       via rule engine, 2 needs verification, 2 missing (College NOC, Character Cert),
       gate readiness NOT_READY (blocked by College NOC & Character Cert).
    """
    # 1. Create an ineligible applicant profile
    ineligible_id = "test_ineligible_applicant_99"
    with Session(engine) as session:
        # Clean any prior
        for prior_p in session.exec(select(ApplicantProfile).where(ApplicantProfile.applicant_context_id == ineligible_id)).all():
            session.delete(prior_p)
        ineligible_profile = ApplicantProfile(
            applicant_context_id=ineligible_id,
            display_label="Ineligible Applicant",
            degree="B.A. English Literature",  # Fails FSSAI-REQ-01
            year_of_study=1,                   # Fails FSSAI-REQ-02
            cgpa=4.8,                          # Fails FSSAI-REQ-04
            enrollment_type="PART_TIME",       # Fails FSSAI-REQ-03
        )
        session.add(ineligible_profile)
        session.commit()

    fssai_pdf = generate_valid_pdf_bytes("FSSAI Internship Scheme Circular 2026 Food Safety and Standards Authority of India")

    # Ingest for ineligible applicant (using canonical fallback fixture)
    with patch.object(settings, "GEMINI_API_KEY", ""):
        res_ineligible = client.post(
            "/api/v1/documents/ingest",
            files={"file": ("fssai_internship_circular_2026.pdf", fssai_pdf, "application/pdf")},
            data={"applicant_context_id": ineligible_id},
        )
    assert res_ineligible.status_code == 200
    data_inel = res_ineligible.json()

    # Policy extraction contains 8 requirements as specified by the document
    assert data_inel["extracted_policy"]["requirements_count"] == 8
    assert data_inel["used_demo_fallback"] is True
    assert data_inel["extraction_source"] == "CANONICAL_DEMO_FALLBACK"

    agg_inel = data_inel["aggregate"]
    # For ineligible applicant: 0 verified, 0 resolved
    assert agg_inel["progress"]["total_count"] == 8
    assert agg_inel["progress"]["verified_count"] == 0
    assert agg_inel["progress"]["resolved_count"] == 0
    # JOINING gate is NOT_READY
    assert agg_inel["gate_readiness"]["is_ready"] is False
    assert agg_inel["gate_readiness"]["status"] == "NOT_READY"

    # Now ingest for demo_applicant_01 (who has matching profile attributes)
    with patch.object(settings, "GEMINI_API_KEY", ""):
        res_eligible = client.post(
            "/api/v1/documents/ingest",
            files={"file": ("fssai_internship_circular_2026.pdf", fssai_pdf, "application/pdf")},
            data={"applicant_context_id": DEMO_CONTEXT_ID},
        )
    assert res_eligible.status_code == 200
    data_el = res_eligible.json()

    # Policy extraction is IDENTICAL (same 8 policy definitions)
    assert data_el["extracted_policy"]["requirements_count"] == 8
    assert data_el["extracted_policy"]["target_name"] == data_inel["extracted_policy"]["target_name"]

    agg_el = data_el["aggregate"]
    # For demo_applicant_01: 4 verified via rule engine, 2 needs verification, 2 missing
    assert agg_el["progress"]["total_count"] == 8
    assert agg_el["progress"]["verified_count"] == 4
    assert agg_el["progress"]["resolved_count"] == 4

    reqs_by_code = {r["code"]: r for r in agg_el["requirements"]}
    # 4 verified eligibility criteria
    assert reqs_by_code["FSSAI-REQ-01"]["state"] == RequirementState.VERIFIED.value
    assert reqs_by_code["FSSAI-REQ-02"]["state"] == RequirementState.VERIFIED.value
    assert reqs_by_code["FSSAI-REQ-03"]["state"] == RequirementState.VERIFIED.value
    assert reqs_by_code["FSSAI-REQ-04"]["state"] == RequirementState.VERIFIED.value

    # 2 needs verification
    assert reqs_by_code["FSSAI-REQ-05"]["state"] == RequirementState.NEEDS_VERIFICATION.value
    assert reqs_by_code["FSSAI-REQ-06"]["state"] == RequirementState.NEEDS_VERIFICATION.value

    # 2 missing (College NOC, Character Certificate)
    assert reqs_by_code["FSSAI-REQ-07"]["state"] == RequirementState.MISSING.value
    assert reqs_by_code["FSSAI-REQ-08"]["state"] == RequirementState.MISSING.value

    # JOINING gate is NOT_READY, specifically blocked by FSSAI-REQ-07 and FSSAI-REQ-08
    assert agg_el["gate_readiness"]["is_ready"] is False
    assert agg_el["gate_readiness"]["status"] == "NOT_READY"
    blocker_codes = [b["code"] for b in agg_el["active_blockers"]]
    assert "FSSAI-REQ-07" in blocker_codes
    assert "FSSAI-REQ-08" in blocker_codes

