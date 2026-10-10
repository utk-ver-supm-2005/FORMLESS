"""
Milestone 9 Live Sanity Verification Script
Verifies:
1. Reset FSSAI baseline.
2. Select College NOC (req-07).
3. Request College NOC (MISSING -> IN_PROGRESS).
4. Fetch requirement events -> verify REQUESTED event recorded.
5. Upload evidence to College NOC -> verify EVIDENCE_SUBMITTED event recorded.
6. Verify College NOC -> verify VERIFIED event recorded.
7. Select Character Certificate (req-08).
8. Request req-08 (MISSING -> IN_PROGRESS).
9. Upload evidence to req-08 (IN_PROGRESS -> EVIDENCE_RECEIVED).
10. Reject req-08 with reason -> verify REJECTED event recorded with reason.
11. Upload replacement evidence -> verify EVIDENCE_SUBMITTED event recorded (REJECTED -> EVIDENCE_RECEIVED).
12. Verify event isolation between requirements (no leakage across req-07 and req-08).
13. Verify evidence download endpoint (GET /api/v1/evidence/{id}/download) streams valid content.
14. Verify frontend dev server is serving index.html on http://127.0.0.1:5173.
"""

import sys
import io
import urllib.request
import urllib.error
import json

BASE_URL = "http://127.0.0.1:8000/api/v1"
FRONTEND_URL = "http://127.0.0.1:5173"

def post_json(endpoint, data=None):
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8") if data is not None else b"",
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def get_json(endpoint):
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def post_multipart(endpoint, filename, content, actor="demo_applicant_01", notes=None):
    boundary = "----WebKitFormBoundaryFORMLESSAuditTest9"
    body = io.BytesIO()

    # file part
    body.write(f"--{boundary}\r\n".encode("utf-8"))
    body.write(f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'.encode("utf-8"))
    body.write(b"Content-Type: application/pdf\r\n\r\n")
    body.write(content)
    body.write(b"\r\n")

    # actor
    if actor:
        body.write(f"--{boundary}\r\n".encode("utf-8"))
        body.write(b'Content-Disposition: form-data; name="actor"\r\n\r\n')
        body.write(actor.encode("utf-8"))
        body.write(b"\r\n")

    # notes
    if notes:
        body.write(f"--{boundary}\r\n".encode("utf-8"))
        body.write(b'Content-Disposition: form-data; name="notes"\r\n\r\n')
        body.write(notes.encode("utf-8"))
        body.write(b"\r\n")

    body.write(f"--{boundary}--\r\n".encode("utf-8"))
    payload = body.getvalue()

    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def main():
    print("==================================================")
    print("FORMLESS LIVE AUDIT & EVIDENCE SANITY CHECK (M9)")
    print("==================================================")

    # 1. Reset FSSAI Baseline
    print("\n1. Resetting FSSAI baseline...")
    reset_res = post_json("/demo/reset-fssai?gate=JOINING")
    agg = reset_res["aggregate"]
    print(f"   Baseline reset successful: {agg['application']['title']}")
    print(f"   Requirements count: {len(agg['requirements'])}")

    noc_req = next(r for r in agg["requirements"] if r["code"] == "FSSAI-REQ-07")
    char_req = next(r for r in agg["requirements"] if r["code"] == "FSSAI-REQ-08")
    noc_id = noc_req["id"]
    char_id = char_req["id"]
    print(f"   College NOC ID: {noc_id} (Code: {noc_req['code']})")
    print(f"   Character Certificate ID: {char_id} (Code: {char_req['code']})")

    # 2. Check initial College NOC events
    print("\n2. Checking baseline events for College NOC...")
    noc_events_init = get_json(f"/requirements/{noc_id}/events")
    print(f"   Initial events count for College NOC: {len(noc_events_init['events'])}")
    assert len(noc_events_init['events']) == 0, "Expected 0 baseline events for College NOC"

    # 3. Request College NOC (MISSING -> IN_PROGRESS)
    print("\n3. Requesting College NOC...")
    req_res = post_json(f"/requirements/{noc_id}/request?gate=JOINING", {
        "actor": "student_applicant",
        "notes": "Requested official NOC from Registrar Office"
    })
    updated_noc = next(r for r in req_res["aggregate"]["requirements"] if r["id"] == noc_id)
    print(f"   College NOC state updated to: {updated_noc['state']}")
    assert updated_noc["state"] == "IN_PROGRESS"

    # 4. Fetch events for College NOC -> verify REQUESTED
    print("\n4. Fetching audit events for College NOC...")
    noc_events_1 = get_json(f"/requirements/{noc_id}/events")
    events = noc_events_1["events"]
    print(f"   Events count: {len(events)}")
    assert len(events) == 1, f"Expected 1 event, got {len(events)}"
    assert events[0]["action"] == "REQUESTED"
    assert events[0]["from_state"] == "MISSING"
    assert events[0]["to_state"] == "IN_PROGRESS"
    assert events[0]["actor"] == "student_applicant"
    print(f"   [OK] Transition recorded: {events[0]['from_state']} -> {events[0]['to_state']} by {events[0]['actor']}")

    # 5. Upload Evidence for College NOC (IN_PROGRESS -> EVIDENCE_RECEIVED)
    print("\n5. Uploading evidence PDF for College NOC...")
    dummy_pdf_bytes = b"%PDF-1.4\n1 0 obj\n<< /Title (College NOC) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
    upload_res = post_multipart(
        f"/requirements/{noc_id}/evidence?gate=JOINING",
        filename="college_noc_signed.pdf",
        content=dummy_pdf_bytes,
        actor="student_applicant",
        notes="Signed by Dean on official letterhead"
    )
    noc_after_upload = next(r for r in upload_res["aggregate"]["requirements"] if r["id"] == noc_id)
    print(f"   College NOC state updated to: {noc_after_upload['state']}")
    assert noc_after_upload["state"] == "EVIDENCE_RECEIVED"
    assert len(noc_after_upload["evidence_links"]) >= 1
    evidence_id = noc_after_upload["evidence_links"][0]["evidence_item_id"]
    print(f"   Attached evidence item ID: {evidence_id}")

    # 6. Fetch events -> verify EVIDENCE_SUBMITTED
    print("\n6. Fetching updated audit events for College NOC...")
    noc_events_2 = get_json(f"/requirements/{noc_id}/events")
    events = noc_events_2["events"]
    print(f"   Events count: {len(events)}")
    assert len(events) == 2, f"Expected 2 events, got {len(events)}"
    assert events[1]["action"] == "EVIDENCE_SUBMITTED"
    assert events[1]["from_state"] == "IN_PROGRESS"
    assert events[1]["to_state"] == "EVIDENCE_RECEIVED"
    print(f"   [OK] Transition recorded: {events[1]['from_state']} -> {events[1]['to_state']}")

    # 7. Verify College NOC (EVIDENCE_RECEIVED -> VERIFIED)
    print("\n7. Certifying/verifying College NOC...")
    verify_res = post_json(f"/requirements/{noc_id}/verify?gate=JOINING", {
        "actor": "institutional_reviewer",
        "notes": "Seal and signature validated"
    })
    noc_verified = next(r for r in verify_res["aggregate"]["requirements"] if r["id"] == noc_id)
    print(f"   College NOC state updated to: {noc_verified['state']}")
    assert noc_verified["state"] == "VERIFIED"

    # 8. Fetch events -> verify VERIFIED
    print("\n8. Fetching complete lifecycle audit events for College NOC...")
    noc_events_3 = get_json(f"/requirements/{noc_id}/events")
    events = noc_events_3["events"]
    print(f"   Events count: {len(events)}")
    assert len(events) == 3, f"Expected 3 events, got {len(events)}"
    assert events[2]["action"] == "VERIFIED"
    assert events[2]["from_state"] == "EVIDENCE_RECEIVED"
    assert events[2]["to_state"] == "VERIFIED"
    assert events[2]["actor"] == "institutional_reviewer"
    print("   [OK] Complete canonical progression verified:")
    for idx, ev in enumerate(events, 1):
        print(f"        Step {idx}: {ev['action']} ({ev['from_state']} -> {ev['to_state']}) by {ev['actor']}")

    # 9. Test Rejection Path on Character Certificate (char_id)
    print("\n9. Testing rejection lifecycle path on Character Certificate...")
    # Request char_id
    post_json(f"/requirements/{char_id}/request?gate=JOINING", {"actor": "student_applicant"})
    # Upload draft evidence to char_id
    post_multipart(
        f"/requirements/{char_id}/evidence?gate=JOINING",
        filename="draft_character_cert.pdf",
        content=dummy_pdf_bytes,
        actor="student_applicant"
    )
    # Reject char_id
    rejection_reason = "Missing gazetted officer round seal and designation stamp."
    reject_res = post_json(f"/requirements/{char_id}/reject?gate=JOINING", {
        "reason": rejection_reason,
        "actor": "officer_reviewer",
        "notes": "Please re-upload with official gazetted stamp"
    })
    req08_rejected = next(r for r in reject_res["aggregate"]["requirements"] if r["id"] == char_id)
    print(f"   Character Certificate state updated to: {req08_rejected['state']}")
    assert req08_rejected["state"] == "REJECTED"

    # Fetch events for char_id -> verify REJECTED event
    print("\n10. Fetching audit events for Character Certificate...")
    req08_events_1 = get_json(f"/requirements/{char_id}/events")
    events08 = req08_events_1["events"]
    assert len(events08) == 3
    assert events08[2]["action"] == "REJECTED"
    assert events08[2]["from_state"] == "EVIDENCE_RECEIVED"
    assert events08[2]["to_state"] == "REJECTED"
    assert events08[2]["metadata"]["rejection_reason"] == rejection_reason
    print(f"   [OK] Rejection event recorded with reason: {events08[2]['metadata']['rejection_reason']}")

    # Recovery upload for char_id
    print("\n11. Testing recovery re-upload for rejected requirement...")
    post_multipart(
        f"/requirements/{char_id}/evidence?gate=JOINING",
        filename="gazetted_character_cert_sealed.pdf",
        content=dummy_pdf_bytes,
        actor="student_applicant",
        notes="Re-uploaded with proper round seal"
    )
    req08_events_2 = get_json(f"/requirements/{char_id}/events")
    events08_recovered = req08_events_2["events"]
    assert len(events08_recovered) == 4
    assert events08_recovered[3]["action"] == "EVIDENCE_SUBMITTED"
    assert events08_recovered[3]["from_state"] == "REJECTED"
    assert events08_recovered[3]["to_state"] == "EVIDENCE_RECEIVED"
    print(f"   [OK] Recovery transition recorded: REJECTED -> EVIDENCE_RECEIVED")

    # 12. Verify Event Isolation
    print("\n12. Verifying event isolation between requirements...")
    noc_final = get_json(f"/requirements/{noc_id}/events")
    assert len(noc_final["events"]) == 3, "College NOC should strictly have its own 3 events"
    assert len(events08_recovered) == 4, "Character Certificate should strictly have its own 4 events"
    print("   [OK] Event histories are completely isolated by requirement ID.")

    # 13. Verify Evidence Download
    print("\n13. Testing safe evidence download endpoint...")
    dl_url = f"{BASE_URL}/evidence/{evidence_id}/download"
    req_dl = urllib.request.Request(dl_url)
    with urllib.request.urlopen(req_dl) as resp:
        status = resp.status
        content_type = resp.headers.get("Content-Type")
        content_disp = resp.headers.get("Content-Disposition")
        dl_content = resp.read()
        print(f"   Download HTTP Status: {status}")
        print(f"   Content-Type: {content_type}")
        print(f"   Content-Disposition: {content_disp}")
        print(f"   Bytes read: {len(dl_content)}")
        assert status == 200
        assert dl_content == dummy_pdf_bytes, "Downloaded bytes must match uploaded file"
        # Verify no filesystem paths leaked in headers
        assert "C:" not in str(content_disp) and "data/evidence" not in str(content_disp)
        print("   [OK] Safe file streaming verified without filesystem leakage.")

    # 14. Check Frontend Web App
    print("\n14. Checking frontend server on localhost:5173...")
    with urllib.request.urlopen(FRONTEND_URL) as fe_resp:
        fe_status = fe_resp.status
        html = fe_resp.read().decode("utf-8")
        print(f"   Frontend Status: {fe_status}")
        assert fe_status == 200
        assert "FORMLESS" in html or "root" in html
        print("   [OK] Frontend application reachable and serving app shell.")

    print("\n==================================================")
    print("MILESTONE 9 LIVE SANITY VERIFICATION: ALL CHECKS PASSED")
    print("==================================================")

if __name__ == "__main__":
    main()
