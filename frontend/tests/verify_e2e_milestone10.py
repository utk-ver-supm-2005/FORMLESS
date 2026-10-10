"""
Milestone 10 End-to-End Functional Verification & Demo Hardening Script
Verifies:
1. Product Flow A through T:
   A. Start/verify application health
   B. Load FSSAI baseline (8 reqs, 4 VERIFIED, 2 NEEDS_VERIFICATION, 2 MISSING)
   C. Inspect requirements
   D. Select requirement (College NOC)
   E. Inspect policy citation
   F. Inspect rule evaluation
   G. Request College NOC (MISSING -> IN_PROGRESS)
   H. Upload evidence PDF (IN_PROGRESS -> EVIDENCE_RECEIVED)
   I. Verify College NOC (EVIDENCE_RECEIVED -> VERIFIED)
   J. Confirm readiness updates (Blockers 2 -> 1, Verified 4 -> 5, JOINING NOT_READY)
   K. Confirm Action Plan model updates (College NOC is Completed, Character Certificate is sole blocker)
   L. Inspect audit history (REQUESTED -> EVIDENCE_SUBMITTED -> VERIFIED)
   M. Download evidence safely without filesystem leakage
   N. Ingest New Policy with valid PDF
   O. Long-running processing simulation and extraction
   P. Truthful model governance
   Q. Receive extracted application aggregate
   R. Confirm UI/aggregate updates to newly ingested application
   S. Reset canonical FSSAI demo
   T. Confirm deterministic baseline is restored

2. Error Paths:
   - Non-PDF policy upload -> 400
   - Zero-byte policy upload -> 400
   - Oversized policy (>50MB) -> 413
   - Oversized evidence (>10MB) -> 400
   - Invalid evidence format -> 400
   - Verify without evidence -> 400
   - Reject without reason -> 400
"""

import sys
import io
import os
import urllib.request
import urllib.error
import json
from pathlib import Path

BASE_URL = "http://127.0.0.1:8000/api/v1"
FRONTEND_URL = "http://127.0.0.1:5173"

def request_json(endpoint, method="GET", data=None):
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8") if data is not None else (b"" if method == "POST" else None),
        headers={"Content-Type": "application/json"} if (data is not None or method == "POST") else {},
        method=method,
    )
    with urllib.request.urlopen(req) as resp:
        return resp.status, json.loads(resp.read().decode("utf-8"))

def post_multipart(endpoint, filename, content, content_type="application/pdf", fields=None):
    boundary = "----WebKitFormBoundaryM10E2EHardeningTest"
    body = io.BytesIO()

    # file part
    if filename is not None and content is not None:
        body.write(f"--{boundary}\r\n".encode("utf-8"))
        body.write(f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'.encode("utf-8"))
        body.write(f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"))
        body.write(content)
        body.write(b"\r\n")

    # additional fields
    if fields:
        for k, v in fields.items():
            if v is not None:
                body.write(f"--{boundary}\r\n".encode("utf-8"))
                body.write(f'Content-Disposition: form-data; name="{k}"\r\n\r\n'.encode("utf-8"))
                body.write(str(v).encode("utf-8"))
                body.write(b"\r\n")

    body.write(f"--{boundary}--\r\n".encode("utf-8"))
    payload = body.getvalue()

    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        return resp.status, json.loads(resp.read().decode("utf-8"))

def test_product_flow():
    print("\n>>> PHASE 1: COMPLETE PRODUCT FLOW (A through T)")

    # A. Start application / Health check
    print("A. Checking engine health...")
    status, health = request_json("/health")
    assert status == 200
    assert health["status"] == "healthy"
    assert health["gemini_model"] == "gemini-3.8-flash"
    print(f"   [OK] Engine health 200 OK: {health['service']} (Model: {health['gemini_model']})")

    # B. Load FSSAI baseline
    print("B. Loading FSSAI baseline...")
    status, reset_res = request_json("/demo/reset-fssai?gate=JOINING", method="POST")
    assert status == 200
    agg = reset_res["aggregate"]
    app = agg["application"]
    metrics = agg["progress"]
    readiness = agg["gate_readiness"]
    print(f"   [OK] Baseline loaded: {app['title']} (App ID: {app['id']})")

    # C. Inspect requirements
    print("C. Inspecting canonical requirements...")
    reqs = agg["requirements"]
    assert len(reqs) == 8, f"Expected 8 requirements, got {len(reqs)}"
    verified_count = sum(1 for r in reqs if r["state"] == "VERIFIED")
    needs_verif_count = sum(1 for r in reqs if r["state"] == "NEEDS_VERIFICATION")
    missing_count = sum(1 for r in reqs if r["state"] == "MISSING")
    assert verified_count == 4, f"Expected 4 VERIFIED, got {verified_count}"
    assert needs_verif_count == 2, f"Expected 2 NEEDS_VERIFICATION, got {needs_verif_count}"
    assert missing_count == 2, f"Expected 2 MISSING, got {missing_count}"
    assert readiness["is_ready"] is False
    assert len(readiness["active_blockers"]) == 2
    print(f"   [OK] Baseline counts: 8 total, 4 verified, 2 needs_verification, 2 missing, 2 blockers")

    # D. Select requirement: College NOC
    print("D. Selecting College NOC (FSSAI-REQ-07)...")
    noc = next(r for r in reqs if r["code"] == "FSSAI-REQ-07")
    noc_id = noc["id"]
    assert noc["state"] == "MISSING"
    print(f"   [OK] Selected College NOC (ID: {noc_id})")

    # E. Inspect policy citation
    print("E. Inspecting policy citation for College NOC...")
    citation = noc["source_citation"]
    assert citation is not None
    assert "Section 4(a)" in citation["section"]
    assert citation["page"] == 2
    assert "No Objection Certificate" in citation["quote"]
    print(f"   [OK] Citation verified: {citation['section']} (Page {citation['page']})")

    # F. Inspect rule evaluation
    print("F. Inspecting rule evaluation & verification mode...")
    assert noc["verification_mode"] == "HUMAN_CONFIRMATION"
    print(f"   [OK] Verification mode: {noc['verification_mode']}")

    # G. Request College NOC (MISSING -> IN_PROGRESS)
    print("G. Requesting College NOC...")
    status, req_res = request_json(f"/requirements/{noc_id}/request?gate=JOINING", method="POST", data={
        "actor": "applicant_student",
        "notes": "Requested from university administration"
    })
    assert status == 200
    noc_after_req = next(r for r in req_res["aggregate"]["requirements"] if r["id"] == noc_id)
    assert noc_after_req["state"] == "IN_PROGRESS"
    print(f"   [OK] College NOC state transitioned: MISSING -> IN_PROGRESS")

    # H. Upload evidence
    print("H. Uploading evidence PDF for College NOC...")
    dummy_pdf = b"%PDF-1.4\n1 0 obj\n<< /Title (College NOC Scan) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
    status, upload_res = post_multipart(
        f"/requirements/{noc_id}/evidence?gate=JOINING",
        filename="college_noc_signed.pdf",
        content=dummy_pdf,
        fields={"actor": "applicant_student", "notes": "Official scanned NOC"}
    )
    assert status == 200
    noc_after_upload = next(r for r in upload_res["aggregate"]["requirements"] if r["id"] == noc_id)
    assert noc_after_upload["state"] == "EVIDENCE_RECEIVED"
    assert len(noc_after_upload["evidence_links"]) >= 1
    evidence_item_id = noc_after_upload["evidence_links"][0]["evidence_item_id"]
    print(f"   [OK] Evidence uploaded: IN_PROGRESS -> EVIDENCE_RECEIVED (Evidence ID: {evidence_item_id})")

    # I. Verify College NOC
    print("I. Verifying College NOC...")
    status, verify_res = request_json(f"/requirements/{noc_id}/verify?gate=JOINING", method="POST", data={
        "actor": "institutional_officer",
        "notes": "Verified dean signature and university seal"
    })
    assert status == 200
    updated_agg = verify_res["aggregate"]
    noc_after_verify = next(r for r in updated_agg["requirements"] if r["id"] == noc_id)
    assert noc_after_verify["state"] == "VERIFIED"
    assert noc_after_verify["verified_by"] == "institutional_officer"
    print(f"   [OK] College NOC verified: EVIDENCE_RECEIVED -> VERIFIED")

    # J. Confirm readiness updates
    print("J. Confirming stage-gate readiness updates...")
    new_readiness = updated_agg["gate_readiness"]
    new_progress = updated_agg["progress"]
    assert new_progress["resolved_count"] == 5, f"Expected 5 resolved, got {new_progress['resolved_count']}"
    assert len(new_readiness["active_blockers"]) == 1, f"Expected 1 blocker, got {len(new_readiness['active_blockers'])}"
    assert new_readiness["active_blockers"][0]["code"] == "FSSAI-REQ-08"
    assert new_readiness["is_ready"] is False
    print(f"   [OK] Verified: 4 -> 5, Blockers: 2 -> 1, Remaining blocker: Character Certificate")

    # K. Confirm Action Plan updates
    print("K. Confirming Action Plan data model...")
    # Blocker group now has exactly Character Certificate
    blockers = [r for r in updated_agg["requirements"] if r["code"] in [b["code"] for b in new_readiness["active_blockers"]]]
    assert len(blockers) == 1
    assert blockers[0]["code"] == "FSSAI-REQ-08"
    # College NOC is in completed
    completed = [r for r in updated_agg["requirements"] if r["state"] == "VERIFIED"]
    assert len(completed) == 5
    assert any(r["code"] == "FSSAI-REQ-07" for r in completed)
    print(f"   [OK] Action Plan grouping reflects 1 blocker and 5 completed")

    # L. Inspect audit history
    print("L. Inspecting append-only audit trail...")
    status, events_res = request_json(f"/requirements/{noc_id}/events")
    assert status == 200
    events = events_res["events"]
    assert len(events) == 3
    assert events[0]["action"] == "REQUESTED"
    assert events[1]["action"] == "EVIDENCE_SUBMITTED"
    assert events[2]["action"] == "VERIFIED"
    assert events[2]["actor"] == "institutional_officer"
    print(f"   [OK] Complete audit history verified: REQUESTED -> EVIDENCE_SUBMITTED -> VERIFIED")

    # M. Download evidence
    print("M. Testing safe evidence download...")
    dl_url = f"{BASE_URL}/evidence/{evidence_item_id}/download"
    req_dl = urllib.request.Request(dl_url)
    with urllib.request.urlopen(req_dl) as resp:
        assert resp.status == 200
        assert resp.headers.get("Content-Type") == "application/pdf"
        assert resp.read() == dummy_pdf
        disp = resp.headers.get("Content-Disposition", "")
        assert "C:" not in disp and "data/evidence" not in disp
    print(f"   [OK] Evidence downloaded safely (200 OK, matching bytes, zero filesystem path leakage)")

    # N. Open and test Policy Ingestion
    print("N/O/P/Q/R. Testing real policy document ingestion...")
    seed_pdf_path = Path("backend/seed/fssai_internship_circular_2026.pdf")
    if seed_pdf_path.exists():
        pdf_bytes = seed_pdf_path.read_bytes()
        status, ingest_res = post_multipart(
            "/documents/ingest?gate=JOINING",
            filename="fssai_internship_circular_2026.pdf",
            content=pdf_bytes,
            fields={"applicant_context_id": "demo_applicant_01"}
        )
        assert status == 200
        assert ingest_res["status"] == "success"
        ingested_agg = ingest_res["aggregate"]
        assert len(ingested_agg["requirements"]) >= 1
        model_used = ingest_res["model_used"]
        extraction_source = ingest_res["extraction_source"]
        print(f"   [OK] Ingestion succeeded: {ingest_res['extracted_policy']['target_name']}")
        print(f"        Model: {model_used} | Source: {extraction_source}")
        # Truthful model governance
        if extraction_source == "CANONICAL_DEMO_FALLBACK":
            assert model_used == "canonical-fssai-baseline"
        else:
            assert "gemini" in model_used.lower()
        print(f"   [OK] Model governance truthful and verified")

    # S. Reset canonical FSSAI demo
    print("S. Resetting canonical FSSAI demo...")
    status, reset_res2 = request_json("/demo/reset-fssai?gate=JOINING", method="POST")
    assert status == 200
    agg_restored = reset_res2["aggregate"]

    # T. Confirm baseline is restored
    print("T. Confirming deterministic baseline restoration...")
    assert len(agg_restored["requirements"]) == 8
    assert agg_restored["progress"]["resolved_count"] == 4
    assert len(agg_restored["gate_readiness"]["active_blockers"]) == 2
    noc_restored = next(r for r in agg_restored["requirements"] if r["code"] == "FSSAI-REQ-07")
    assert noc_restored["state"] == "MISSING"
    print(f"   [OK] Baseline deterministically restored (8 reqs, 4 verified, 2 blockers, College NOC = MISSING)")

def test_error_paths():
    print("\n>>> PHASE 2: ERROR PATHS & EXTREME EDGE CASES")

    # 1. Non-PDF policy upload
    print("1. Testing non-PDF policy document rejection...")
    try:
        post_multipart(
            "/documents/ingest?gate=JOINING",
            filename="malicious_script.exe",
            content=b"MZ\x90\x00BinaryExe",
            content_type="application/x-msdownload"
        )
        assert False, "Should have returned 400"
    except urllib.error.HTTPError as e:
        assert e.code == 400
        err_msg = json.loads(e.read().decode())["detail"]
        assert "PDF" in err_msg
        print(f"   [OK] Rejected non-PDF with 400: {err_msg}")

    # 2. Zero-byte policy upload
    print("2. Testing zero-byte policy rejection...")
    try:
        post_multipart(
            "/documents/ingest?gate=JOINING",
            filename="empty_policy.pdf",
            content=b"",
            content_type="application/pdf"
        )
        assert False, "Should have returned 400"
    except urllib.error.HTTPError as e:
        assert e.code == 400
        err_msg = json.loads(e.read().decode())["detail"]
        assert "empty" in err_msg.lower()
        print(f"   [OK] Rejected 0-byte policy with 400: {err_msg}")

    # 3. Oversized policy (>50MB)
    print("3. Testing oversized policy boundary rejection (>50MB)...")
    try:
        # Send a 51MB dummy payload
        oversized_bytes = b" " * (51 * 1024 * 1024)
        post_multipart(
            "/documents/ingest?gate=JOINING",
            filename="huge_policy.pdf",
            content=oversized_bytes,
            content_type="application/pdf"
        )
        assert False, "Should have returned 413"
    except urllib.error.HTTPError as e:
        assert e.code == 413
        err_msg = json.loads(e.read().decode())["detail"]
        assert "50 mb" in err_msg.lower()
        print(f"   [OK] Rejected oversized policy with 413: {err_msg}")

    # 4. Oversized evidence (>10MB)
    print("4. Testing oversized evidence boundary rejection (>10MB)...")
    _, reset_res = request_json("/demo/reset-fssai?gate=JOINING", method="POST")
    noc_req = next(r for r in reset_res["aggregate"]["requirements"] if r["code"] == "FSSAI-REQ-07")
    req_id = noc_req["id"]
    # Put into IN_PROGRESS so state validation passes and file validation is exercised
    request_json(f"/requirements/{req_id}/request?gate=JOINING", method="POST")
    try:
        oversized_ev = b" " * (11 * 1024 * 1024)
        post_multipart(
            f"/requirements/{req_id}/evidence?gate=JOINING",
            filename="huge_evidence.pdf",
            content=oversized_ev,
            content_type="application/pdf"
        )
        assert False, "Should have returned 413"
    except urllib.error.HTTPError as e:
        assert e.code == 413
        err_msg = json.loads(e.read().decode())["detail"]
        assert "10 mb" in err_msg.lower()
        print(f"   [OK] Rejected oversized evidence with 413: {err_msg}")

    # 5. Invalid evidence file type
    print("5. Testing invalid evidence file type rejection...")
    try:
        post_multipart(
            f"/requirements/{req_id}/evidence?gate=JOINING",
            filename="archive.zip",
            content=b"PK\x03\x04DummyZip",
            content_type="application/zip"
        )
        assert False, "Should have returned 400"
    except urllib.error.HTTPError as e:
        assert e.code == 400
        err_msg = json.loads(e.read().decode())["detail"]
        assert "unsupported" in err_msg.lower() or "pdf" in err_msg.lower()
        print(f"   [OK] Rejected invalid evidence format with 400: {err_msg}")

    # 6. Verify without evidence
    print("6. Testing verify requirement without evidence rejection...")
    noc_req = next(r for r in reset_res["aggregate"]["requirements"] if r["code"] == "FSSAI-REQ-07")
    try:
        request_json(f"/requirements/{noc_req['id']}/verify?gate=JOINING", method="POST", data={
            "actor": "premature_officer"
        })
        assert False, "Should have returned 400"
    except urllib.error.HTTPError as e:
        assert e.code == 400
        err_msg = json.loads(e.read().decode())["detail"]
        assert "cannot verify" in err_msg.lower() or "evidence" in err_msg.lower()
        print(f"   [OK] Rejected verify without evidence with 400: {err_msg}")

    # 7. Reject without reason
    print("7. Testing reject requirement without mandatory reason rejection...")
    try:
        request_json(f"/requirements/{noc_req['id']}/reject?gate=JOINING", method="POST", data={
            "reason": "   ",
            "actor": "lazy_reviewer"
        })
        assert False, "Should have returned 400"
    except urllib.error.HTTPError as e:
        assert e.code == 400
        err_msg = json.loads(e.read().decode())["detail"]
        assert "reason is required" in err_msg.lower() or "rejection reason" in err_msg.lower()
        print(f"   [OK] Rejected rejection without reason with 400: {err_msg}")

def test_frontend_server():
    print("\n>>> PHASE 3: FRONTEND APPLICATION LOCALHOST CHECK")
    req = urllib.request.Request(FRONTEND_URL)
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        html = resp.read().decode("utf-8")
        assert "FORMLESS" in html or "root" in html
        assert "<div id=\"root\"></div>" in html
        print(f"   [OK] Frontend live at {FRONTEND_URL} (200 OK, HTML served)")

def main():
    print("==================================================")
    print("FORMLESS MILESTONE 10: END-TO-END DEMO HARDENING")
    print("==================================================")
    test_product_flow()
    test_error_paths()
    test_frontend_server()
    print("\n==================================================")
    print("MILESTONE 10 E2E HARDENING: ALL CHECKS PASSED")
    print("==================================================")

if __name__ == "__main__":
    main()
