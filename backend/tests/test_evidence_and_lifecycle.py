import hashlib
import io
import json
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select
from app.main import app
from app.database import engine, init_db
from app.models import (
    Application,
    EvidenceItem,
    Requirement,
    RequirementEvidenceLink,
    RequirementState,
    RequirementTransitionEvent,
    StageGate,
    VerificationMethod,
    VerificationMode,
)
from app.services.seed import DEMO_CONTEXT_ID, reset_canonical_fssai_demo
client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_clean_canonical_demo():
    init_db()
    with Session(engine) as session:
        reset_canonical_fssai_demo(session)
    yield


def get_demo_application_and_noc_req():
    with Session(engine) as session:
        app_obj = session.exec(select(Application).where(Application.applicant_context_id == DEMO_CONTEXT_ID)).first()
        noc_req = session.exec(
            select(Requirement).where(
                Requirement.application_id == app_obj.id,
                Requirement.code == "FSSAI-REQ-07",
            )
        ).first()
        char_req = session.exec(
            select(Requirement).where(
                Requirement.application_id == app_obj.id,
                Requirement.code == "FSSAI-REQ-08",
            )
        ).first()
        return app_obj.id, noc_req.id, char_req.id


# =========================================================================
# Phase 3 Automated Verification Tests (1 - 22 + Canonical Demo Loop)
# =========================================================================

def test_01_missing_to_in_progress_succeeds():
    app_id, noc_id, _ = get_demo_application_and_noc_req()

    response = client.post(
        f"/api/v1/requirements/{noc_id}/request",
        json={"actor": "demo_applicant_01", "notes": "Requesting official NOC from Principal's Office"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["action"] == "REQUESTED"
    assert data["state"] == "IN_PROGRESS"

    # Verify requirement in database
    with Session(engine) as session:
        req = session.get(Requirement, noc_id)
        assert req.state == RequirementState.IN_PROGRESS.value

        # Verify transition event recorded
        events = session.exec(
            select(RequirementTransitionEvent).where(RequirementTransitionEvent.requirement_id == noc_id)
        ).all()
        assert len(events) == 1
        assert events[0].from_state == RequirementState.MISSING.value
        assert events[0].to_state == RequirementState.IN_PROGRESS.value
        assert events[0].action == "REQUESTED"
        assert events[0].actor == "demo_applicant_01"


def test_02_missing_to_verified_fails():
    app_id, noc_id, _ = get_demo_application_and_noc_req()

    # Attempting to directly verify a MISSING requirement without evidence must be rejected
    response = client.post(
        f"/api/v1/requirements/{noc_id}/verify",
        json={"actor": "Demo Reviewer Confirmation"},
    )
    assert response.status_code == 400
    detail = response.json()["detail"]
    assert "attached evidence" in detail.lower() or "missing" in detail.lower()

    # Verify requirement state remains MISSING
    with Session(engine) as session:
        req = session.get(Requirement, noc_id)
        assert req.state == RequirementState.MISSING.value


def test_03_in_progress_to_evidence_received_succeeds():
    app_id, noc_id, _ = get_demo_application_and_noc_req()

    # 1. Request
    client.post(f"/api/v1/requirements/{noc_id}/request")

    # 2. Upload sample PDF evidence
    pdf_content = b"%PDF-1.4 demo college noc content signed and sealed"
    files = {"file": ("College_NOC.pdf", pdf_content, "application/pdf")}
    data = {"notes": "Uploaded signed college NOC certificate", "actor": "demo_applicant_01"}

    response = client.post(f"/api/v1/requirements/{noc_id}/evidence", files=files, data=data)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["status"] == "success"
    assert res_data["action"] == "EVIDENCE_SUBMITTED"
    assert res_data["state"] == RequirementState.EVIDENCE_RECEIVED.value


def test_04_evidence_record_is_created():
    app_id, noc_id, _ = get_demo_application_and_noc_req()
    client.post(f"/api/v1/requirements/{noc_id}/request")

    pdf_content = b"%PDF-1.4 valid test pdf binary data"
    expected_hash = hashlib.sha256(pdf_content).hexdigest()

    files = {"file": ("College_NOC.pdf", pdf_content, "application/pdf")}
    response = client.post(f"/api/v1/requirements/{noc_id}/evidence", files=files)
    assert response.status_code == 200
    item_id = response.json()["evidence_item"]["id"]

    with Session(engine) as session:
        item = session.get(EvidenceItem, item_id)
        assert item is not None
        assert item.file_name == "College_NOC.pdf"
        assert item.file_size == len(pdf_content)
        assert item.mime_type == "application/pdf"
        assert item.file_hash == expected_hash
        assert item.applicant_context_id == DEMO_CONTEXT_ID
        assert "uploads/" in item.file_path


def test_05_requirement_evidence_link_is_created():
    app_id, noc_id, _ = get_demo_application_and_noc_req()
    client.post(f"/api/v1/requirements/{noc_id}/request")

    pdf_content = b"%PDF-1.4 sample college noc"
    files = {"file": ("College_NOC.pdf", pdf_content, "application/pdf")}
    data = {"notes": "Official university letterhead"}
    response = client.post(f"/api/v1/requirements/{noc_id}/evidence", files=files, data=data)
    assert response.status_code == 200
    evidence_id = response.json()["evidence_item"]["id"]

    with Session(engine) as session:
        link = session.exec(
            select(RequirementEvidenceLink).where(
                RequirementEvidenceLink.requirement_id == noc_id,
                RequirementEvidenceLink.evidence_item_id == evidence_id,
            )
        ).first()
        assert link is not None
        assert link.link_notes == "Official university letterhead"
        assert link.linked_at is not None


def test_06_uploading_evidence_does_not_verify():
    app_id, noc_id, _ = get_demo_application_and_noc_req()
    client.post(f"/api/v1/requirements/{noc_id}/request")

    pdf_content = b"%PDF-1.4 sample college noc"
    files = {"file": ("College_NOC.pdf", pdf_content, "application/pdf")}
    client.post(f"/api/v1/requirements/{noc_id}/evidence", files=files)

    with Session(engine) as session:
        req = session.get(Requirement, noc_id)
        # Uploading does NOT verify automatically
        assert req.state == RequirementState.EVIDENCE_RECEIVED.value
        assert req.verified_at is None
        assert req.verified_by is None
        assert req.verification_method is None


def test_07_uploading_evidence_does_not_change_resolved_count():
    app_id, noc_id, _ = get_demo_application_and_noc_req()
    client.post(f"/api/v1/requirements/{noc_id}/request")

    # Upload evidence
    pdf_content = b"%PDF-1.4 sample college noc"
    files = {"file": ("College_NOC.pdf", pdf_content, "application/pdf")}
    upload_res = client.post(f"/api/v1/requirements/{noc_id}/evidence", files=files)
    aggregate = upload_res.json()["aggregate"]

    # Progress must remain strictly at 4 of 8 resolved
    assert aggregate["progress"]["resolved_count"] == 4
    assert aggregate["progress"]["verified_count"] == 4
    assert aggregate["progress"]["evidence_received_count"] == 1
    assert aggregate["gate_readiness"]["is_ready"] is False
    assert aggregate["gate_readiness"]["blocking_satisfied"] == 0
    assert aggregate["gate_readiness"]["blocking_unresolved"] == 2


def test_08_verify_without_evidence_fails():
    app_id, noc_id, _ = get_demo_application_and_noc_req()
    # Move to IN_PROGRESS
    client.post(f"/api/v1/requirements/{noc_id}/request")

    # Attempt verify while in IN_PROGRESS without any evidence
    response = client.post(f"/api/v1/requirements/{noc_id}/verify")
    assert response.status_code == 400
    assert "attached evidence" in response.json()["detail"].lower()


def test_09_evidence_received_to_verified_succeeds():
    app_id, noc_id, _ = get_demo_application_and_noc_req()
    client.post(f"/api/v1/requirements/{noc_id}/request")

    pdf_content = b"%PDF-1.4 valid college noc"
    files = {"file": ("College_NOC.pdf", pdf_content, "application/pdf")}
    client.post(f"/api/v1/requirements/{noc_id}/evidence", files=files)

    # Now verify
    response = client.post(
        f"/api/v1/requirements/{noc_id}/verify",
        json={"actor": "Demo Reviewer Confirmation", "notes": "Approved by reviewer"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["action"] == "VERIFIED"
    assert data["state"] == RequirementState.VERIFIED.value


def test_10_verification_records_human_confirmation():
    app_id, noc_id, _ = get_demo_application_and_noc_req()
    client.post(f"/api/v1/requirements/{noc_id}/request")
    files = {"file": ("College_NOC.pdf", b"%PDF-1.4 noc", "application/pdf")}
    client.post(f"/api/v1/requirements/{noc_id}/evidence", files=files)

    client.post(f"/api/v1/requirements/{noc_id}/verify")

    with Session(engine) as session:
        req = session.get(Requirement, noc_id)
        assert req.verification_mode == VerificationMode.HUMAN_CONFIRMATION.value
        assert req.verification_method == VerificationMethod.HUMAN_CONFIRMATION.value


def test_11_verification_records_demo_reviewer_confirmation():
    app_id, noc_id, _ = get_demo_application_and_noc_req()
    client.post(f"/api/v1/requirements/{noc_id}/request")
    files = {"file": ("College_NOC.pdf", b"%PDF-1.4 noc", "application/pdf")}
    client.post(f"/api/v1/requirements/{noc_id}/evidence", files=files)

    client.post(
        f"/api/v1/requirements/{noc_id}/verify",
        json={"actor": "Demo Reviewer Confirmation"},
    )

    with Session(engine) as session:
        req = session.get(Requirement, noc_id)
        assert req.verified_by == "Demo Reviewer Confirmation"
        assert req.verified_at is not None


def test_12_college_noc_verification_changes_progress_4_to_5():
    app_id, noc_id, _ = get_demo_application_and_noc_req()
    client.post(f"/api/v1/requirements/{noc_id}/request")
    files = {"file": ("College_NOC.pdf", b"%PDF-1.4 noc", "application/pdf")}
    client.post(f"/api/v1/requirements/{noc_id}/evidence", files=files)

    verify_res = client.post(f"/api/v1/requirements/{noc_id}/verify")
    aggregate = verify_res.json()["aggregate"]

    assert aggregate["progress"]["resolved_count"] == 5
    assert aggregate["progress"]["verified_count"] == 5
    assert aggregate["progress"]["total_count"] == 8
    assert "5 of 8 requirements resolved" in aggregate["progress"]["display_progress"]


def test_13_college_noc_verification_removes_it_from_joining_blockers():
    app_id, noc_id, _ = get_demo_application_and_noc_req()
    client.post(f"/api/v1/requirements/{noc_id}/request")
    files = {"file": ("College_NOC.pdf", b"%PDF-1.4 noc", "application/pdf")}
    client.post(f"/api/v1/requirements/{noc_id}/evidence", files=files)

    verify_res = client.post(f"/api/v1/requirements/{noc_id}/verify")
    aggregate = verify_res.json()["aggregate"]

    active_blockers = aggregate["gate_readiness"]["active_blockers"]
    blocker_codes = [b["code"] for b in active_blockers]
    assert "FSSAI-REQ-07" not in blocker_codes
    assert len(active_blockers) == 1


def test_14_character_certificate_remains_the_joining_blocker():
    app_id, noc_id, char_id = get_demo_application_and_noc_req()
    client.post(f"/api/v1/requirements/{noc_id}/request")
    files = {"file": ("College_NOC.pdf", b"%PDF-1.4 noc", "application/pdf")}
    client.post(f"/api/v1/requirements/{noc_id}/evidence", files=files)

    verify_res = client.post(f"/api/v1/requirements/{noc_id}/verify")
    aggregate = verify_res.json()["aggregate"]

    gate_readiness = aggregate["gate_readiness"]
    assert gate_readiness["is_ready"] is False
    assert gate_readiness["status"] == "NOT_READY"

    active_blockers = gate_readiness["active_blockers"]
    assert len(active_blockers) == 1
    assert active_blockers[0]["code"] == "FSSAI-REQ-08"
    assert active_blockers[0]["title"] == "Character Certificate"


def test_15_evidence_rejection_works():
    app_id, _, char_id = get_demo_application_and_noc_req()

    # Upload evidence for Character Certificate directly
    files = {"file": ("Conduct_Draft.pdf", b"%PDF-1.4 draft conduct", "application/pdf")}
    client.post(f"/api/v1/requirements/{char_id}/evidence", files=files)

    # Reject evidence
    reject_res = client.post(
        f"/api/v1/requirements/{char_id}/reject",
        json={"reason": "Certificate lacks official college stamp and Dean signature.", "actor": "Demo Reviewer"},
    )
    assert reject_res.status_code == 200
    data = reject_res.json()
    assert data["status"] == "success"
    assert data["action"] == "REJECTED"
    assert data["state"] == RequirementState.REJECTED.value

    with Session(engine) as session:
        req = session.get(Requirement, char_id)
        assert req.state == RequirementState.REJECTED.value
        assert req.rejection_reason == "Certificate lacks official college stamp and Dean signature."


def test_16_replacement_evidence_after_rejection_works():
    app_id, _, char_id = get_demo_application_and_noc_req()

    # 1. Upload initial evidence
    files = {"file": ("Conduct_Draft.pdf", b"%PDF-1.4 draft", "application/pdf")}
    client.post(f"/api/v1/requirements/{char_id}/evidence", files=files)

    # 2. Reject
    client.post(
        f"/api/v1/requirements/{char_id}/reject",
        json={"reason": "Missing seal", "actor": "Demo Reviewer"},
    )

    # 3. Submit replacement evidence (REJECTED -> EVIDENCE_RECEIVED)
    replacement_files = {"file": ("Conduct_Signed_Final.pdf", b"%PDF-1.4 final stamped", "application/pdf")}
    replace_res = client.post(
        f"/api/v1/requirements/{char_id}/evidence",
        files=replacement_files,
        data={"notes": "Resubmitted with Dean's official seal"},
    )
    assert replace_res.status_code == 200
    data = replace_res.json()
    assert data["state"] == RequirementState.EVIDENCE_RECEIVED.value

    with Session(engine) as session:
        req = session.get(Requirement, char_id)
        assert req.state == RequirementState.EVIDENCE_RECEIVED.value
        assert req.rejection_reason is None  # Rejection reason cleared on replacement

    # 4. Verification succeeds on replacement
    verify_res = client.post(f"/api/v1/requirements/{char_id}/verify")
    assert verify_res.status_code == 200
    assert verify_res.json()["state"] == RequirementState.VERIFIED.value


def test_17_transition_events_are_recorded():
    app_id, noc_id, _ = get_demo_application_and_noc_req()

    # 1. Request
    client.post(f"/api/v1/requirements/{noc_id}/request", json={"actor": "student_user", "notes": "Init"})
    # 2. Upload
    client.post(
        f"/api/v1/requirements/{noc_id}/evidence",
        files={"file": ("NOC.pdf", b"%PDF-1.4 test", "application/pdf")},
    )
    # 3. Verify
    client.post(f"/api/v1/requirements/{noc_id}/verify", json={"actor": "reviewer_alice"})

    # Query events endpoint
    events_res = client.get(f"/api/v1/requirements/{noc_id}/events")
    assert events_res.status_code == 200
    events = events_res.json()["events"]

    assert len(events) == 3
    assert events[0]["action"] == "REQUESTED"
    assert events[0]["from_state"] == "MISSING"
    assert events[0]["to_state"] == "IN_PROGRESS"
    assert events[0]["actor"] == "student_user"

    assert events[1]["action"] == "EVIDENCE_SUBMITTED"
    assert events[1]["from_state"] == "IN_PROGRESS"
    assert events[1]["to_state"] == "EVIDENCE_RECEIVED"

    assert events[2]["action"] == "VERIFIED"
    assert events[2]["from_state"] == "EVIDENCE_RECEIVED"
    assert events[2]["to_state"] == "VERIFIED"
    assert events[2]["actor"] == "reviewer_alice"


def test_18_multiple_requirements_can_reference_same_evidence_item():
    app_id, noc_id, char_id = get_demo_application_and_noc_req()

    # Upload consolidated certificate to College NOC
    bundle_pdf = b"%PDF-1.4 consolidated college clearances and conduct certificate"
    upload_res = client.post(
        f"/api/v1/requirements/{noc_id}/evidence",
        files={"file": ("Consolidated_Clearances.pdf", bundle_pdf, "application/pdf")},
        data={"notes": "Contains both NOC and Conduct endorsement"},
    )
    assert upload_res.status_code == 200
    evidence_id = upload_res.json()["evidence_item"]["id"]

    # Link the SAME evidence item to Character Certificate without duplicating file
    link_res = client.post(
        f"/api/v1/requirements/{char_id}/evidence",
        data={"evidence_id": evidence_id, "notes": "Refer to page 2 conduct section"},
    )
    assert link_res.status_code == 200
    assert link_res.json()["state"] == RequirementState.EVIDENCE_RECEIVED.value

    with Session(engine) as session:
        # Exactly one EvidenceItem exists for this file
        items = session.exec(select(EvidenceItem).where(EvidenceItem.id == evidence_id)).all()
        assert len(items) == 1

        # Two distinct RequirementEvidenceLinks reference this single item
        links = session.exec(
            select(RequirementEvidenceLink).where(RequirementEvidenceLink.evidence_item_id == evidence_id)
        ).all()
        assert len(links) == 2
        linked_req_ids = {l.requirement_id for l in links}
        assert noc_id in linked_req_ids
        assert char_id in linked_req_ids


def test_19_invalid_state_transitions_are_rejected():
    app_id, noc_id, _ = get_demo_application_and_noc_req()

    # 1. MISSING -> VERIFIED directly: must fail
    res1 = client.post(f"/api/v1/requirements/{noc_id}/verify")
    assert res1.status_code == 400

    # 2. MISSING -> REJECTED directly: must fail
    res2 = client.post(f"/api/v1/requirements/{noc_id}/reject", json={"reason": "Cannot reject missing"})
    assert res2.status_code == 400

    # 3. Move to IN_PROGRESS
    client.post(f"/api/v1/requirements/{noc_id}/request")

    # 4. IN_PROGRESS -> VERIFIED directly: must fail
    res3 = client.post(f"/api/v1/requirements/{noc_id}/verify")
    assert res3.status_code == 400

    # 5. IN_PROGRESS -> REJECTED directly: must fail
    res4 = client.post(f"/api/v1/requirements/{noc_id}/reject", json={"reason": "Cannot reject in progress"})
    assert res4.status_code == 400

    # 6. Repeat request when already IN_PROGRESS: must fail
    res5 = client.post(f"/api/v1/requirements/{noc_id}/request")
    assert res5.status_code == 400


def test_20_file_size_validation_works():
    app_id, noc_id, _ = get_demo_application_and_noc_req()
    client.post(f"/api/v1/requirements/{noc_id}/request")

    # Construct file exceeding 10 MB (10 * 1024 * 1024 + 10 bytes)
    oversized_content = b"X" * (10 * 1024 * 1024 + 10)
    files = {"file": ("Huge_NOC.pdf", oversized_content, "application/pdf")}

    response = client.post(f"/api/v1/requirements/{noc_id}/evidence", files=files)
    assert response.status_code == 413
    assert "10 mb" in response.json()["detail"].lower()


def test_21_unsupported_file_types_are_rejected():
    app_id, noc_id, _ = get_demo_application_and_noc_req()
    client.post(f"/api/v1/requirements/{noc_id}/request")

    # Reject executable / script files
    files = {"file": ("malicious_script.exe", b"binary_executable_code", "application/octet-stream")}
    response = client.post(f"/api/v1/requirements/{noc_id}/evidence", files=files)
    assert response.status_code == 400
    assert "unsupported file type" in response.json()["detail"].lower()

    # Reject plain text files
    files_txt = {"file": ("notes.txt", b"simple text file", "text/plain")}
    response_txt = client.post(f"/api/v1/requirements/{noc_id}/evidence", files=files_txt)
    assert response_txt.status_code == 400


def test_22_aggregate_state_remains_internally_consistent():
    app_id, noc_id, _ = get_demo_application_and_noc_req()

    # Initial snapshot check
    res_init = client.get(f"/api/v1/applications/{app_id}/aggregate")
    assert res_init.status_code == 200
    agg1 = res_init.json()

    assert len(agg1["requirements"]) == 8
    assert agg1["progress"]["total_count"] == 8
    assert agg1["progress"]["resolved_count"] == 4
    assert len(agg1["gate_readiness"]["active_blockers"]) == 2
    assert "evidence" in agg1
    assert "evidence_links" in agg1

    # Perform action: request noc
    client.post(f"/api/v1/requirements/{noc_id}/request")
    agg2 = client.get(f"/api/v1/applications/{app_id}/aggregate").json()
    noc_item = next(r for r in agg2["requirements"] if r["id"] == noc_id)
    assert noc_item["state"] == "IN_PROGRESS"
    assert agg2["progress"]["resolved_count"] == 4

    # Perform action: upload evidence
    client.post(
        f"/api/v1/requirements/{noc_id}/evidence",
        files={"file": ("NOC.pdf", b"%PDF-1.4 test", "application/pdf")},
    )
    agg3 = client.get(f"/api/v1/applications/{app_id}/aggregate").json()
    noc_item3 = next(r for r in agg3["requirements"] if r["id"] == noc_id)
    assert noc_item3["state"] == "EVIDENCE_RECEIVED"
    assert len(noc_item3["evidence_links"]) == 1
    assert len(agg3["evidence"]) == 1
    assert agg3["progress"]["resolved_count"] == 4

    # Perform action: verify
    client.post(f"/api/v1/requirements/{noc_id}/verify")
    agg4 = client.get(f"/api/v1/applications/{app_id}/aggregate").json()
    noc_item4 = next(r for r in agg4["requirements"] if r["id"] == noc_id)
    assert noc_item4["state"] == "VERIFIED"
    assert agg4["progress"]["resolved_count"] == 5
    assert len(agg4["gate_readiness"]["active_blockers"]) == 1
    assert agg4["gate_readiness"]["active_blockers"][0]["code"] == "FSSAI-REQ-08"

    # Verify no server filesystem paths are exposed
    for ev in agg4["evidence"]:
        assert "file_path" not in ev or not ev.get("file_path", "").startswith("C:")


def test_23_canonical_fssai_demo_end_to_end_lifecycle():
    """
    Canonical Demonstration:
    FSSAI Internship 2026 - College NOC:
    MISSING -> IN_PROGRESS -> EVIDENCE_RECEIVED -> VERIFIED
    Progress: 4/8 -> 5/8
    Blockers: College NOC removed, Character Certificate remains.
    Readiness: NOT READY FOR JOINING.
    """
    # 0. Reset to baseline
    reset_res = client.post("/api/v1/demo/reset-fssai")
    assert reset_res.status_code == 200
    agg_initial = reset_res.json()["data"]

    app_id = agg_initial["application"]["id"]
    noc_req = next(r for r in agg_initial["requirements"] if r["code"] == "FSSAI-REQ-07")
    char_req = next(r for r in agg_initial["requirements"] if r["code"] == "FSSAI-REQ-08")

    assert noc_req["state"] == "MISSING"
    assert agg_initial["progress"]["resolved_count"] == 4
    assert agg_initial["gate_readiness"]["is_ready"] is False
    assert len(agg_initial["gate_readiness"]["active_blockers"]) == 2

    # Step 1: Mark as requested
    req_res = client.post(f"/api/v1/requirements/{noc_req['id']}/request")
    assert req_res.status_code == 200
    agg_after_req = req_res.json()["aggregate"]
    noc_after_req = next(r for r in agg_after_req["requirements"] if r["code"] == "FSSAI-REQ-07")
    assert noc_after_req["state"] == "IN_PROGRESS"
    assert agg_after_req["progress"]["resolved_count"] == 4
    assert agg_after_req["gate_readiness"]["is_ready"] is False

    # Step 2: Upload College_NOC.pdf
    pdf_bytes = b"%PDF-1.4 FSSAI Internship 2026 College NOC issued by University Dean"
    upload_res = client.post(
        f"/api/v1/requirements/{noc_req['id']}/evidence",
        files={"file": ("College_NOC.pdf", pdf_bytes, "application/pdf")},
        data={"notes": "Official university letterhead with registrar seal"},
    )
    assert upload_res.status_code == 200
    agg_after_upload = upload_res.json()["aggregate"]
    noc_after_upload = next(r for r in agg_after_upload["requirements"] if r["code"] == "FSSAI-REQ-07")
    assert noc_after_upload["state"] == "EVIDENCE_RECEIVED"
    # Upload does NOT verify automatically
    assert agg_after_upload["progress"]["resolved_count"] == 4
    assert agg_after_upload["gate_readiness"]["is_ready"] is False

    # Step 3: Reviewer Verification
    verify_res = client.post(
        f"/api/v1/requirements/{noc_req['id']}/verify",
        json={"actor": "Demo Reviewer Confirmation", "notes": "Seal and signature verified against university format."},
    )
    assert verify_res.status_code == 200
    agg_after_verify = verify_res.json()["aggregate"]
    noc_after_verify = next(r for r in agg_after_verify["requirements"] if r["code"] == "FSSAI-REQ-07")

    # College NOC is now VERIFIED
    assert noc_after_verify["state"] == "VERIFIED"
    assert noc_after_verify["verification_mode"] == "HUMAN_CONFIRMATION"
    assert noc_after_verify["verification_method"] == "HUMAN_CONFIRMATION"
    assert noc_after_verify["verified_by"] == "Demo Reviewer Confirmation"
    assert noc_after_verify["verified_at"] is not None

    # Progress transitions strictly from 4/8 to 5/8
    assert agg_after_verify["progress"]["resolved_count"] == 5
    assert agg_after_verify["progress"]["verified_count"] == 5
    assert agg_after_verify["progress"]["total_count"] == 8

    # JOINING blockers: College NOC removed, Character Certificate remains
    active_blockers = agg_after_verify["gate_readiness"]["active_blockers"]
    assert len(active_blockers) == 1
    assert active_blockers[0]["code"] == "FSSAI-REQ-08"
    assert active_blockers[0]["title"] == "Character Certificate"

    # Readiness remains NOT READY FOR JOINING
    assert agg_after_verify["gate_readiness"]["is_ready"] is False
    assert agg_after_verify["gate_readiness"]["status"] == "NOT_READY"
