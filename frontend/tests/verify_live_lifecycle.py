import urllib.request
import json

BASE_URL = 'http://127.0.0.1:8000/api/v1'

def run_verification():
    print("==================================================")
    print("LIVE BROWSER / API CANONICAL FLOW VERIFICATION")
    print("==================================================")

    # 1. Reset FSSAI Baseline
    req_reset = urllib.request.Request(f"{BASE_URL}/demo/reset-fssai?gate=JOINING", method='POST')
    res_reset = urllib.request.urlopen(req_reset)
    agg = json.loads(res_reset.read().decode('utf-8'))['aggregate']
    
    progress = agg['progress']
    print("[1] Baseline Loaded:")
    print("    Total:", progress['total_count'])
    print("    Verified:", progress['verified_count'])
    print("    Needs Verification:", progress['needs_verification_count'])
    print("    Missing:", progress['missing_count'])
    print("    Active Blockers:", len(agg['gate_readiness']['active_blockers']))
    print("    JOINING Gate is_ready:", agg['gate_readiness']['is_ready'])
    assert progress['verified_count'] == 4
    assert len(agg['gate_readiness']['active_blockers']) == 2
    assert agg['gate_readiness']['is_ready'] is False

    # Find College NOC
    req_noc = next(r for r in agg['requirements'] if r['code'] == 'FSSAI-REQ-07')
    noc_id = req_noc['id']
    print(f"\n[2] Selected Requirement: {req_noc['code']} - {req_noc['title']}")
    print("    Current State:", req_noc['state'])
    assert req_noc['state'] == 'MISSING'

    # 2. Request Requirement
    req_post = urllib.request.Request(
        f"{BASE_URL}/requirements/{noc_id}/request?gate=JOINING",
        data=json.dumps({'actor': 'applicant'}).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    res_req = json.loads(urllib.request.urlopen(req_post).read().decode('utf-8'))['aggregate']
    req_noc_after_req = next(r for r in res_req['requirements'] if r['id'] == noc_id)
    print(f"\n[3] Action 1 (Request Requirement) Complete:")
    print("    New State:", req_noc_after_req['state'])
    assert req_noc_after_req['state'] == 'IN_PROGRESS'
    assert res_req['gate_readiness']['is_ready'] is False

    # 3. Upload Evidence
    boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
    with open('frontend/tests/fixtures/college_noc.pdf', 'rb') as f:
        pdf_bytes = f.read()

    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="college_noc.pdf"\r\n'
        f"Content-Type: application/pdf\r\n\r\n"
    ).encode('utf-8') + pdf_bytes + (
        f"\r\n--{boundary}\r\n"
        f'Content-Disposition: form-data; name="actor"\r\n\r\napplicant\r\n'
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="notes"\r\n\r\nOfficial NOC from Principal Office\r\n'
        f"--{boundary}--\r\n"
    ).encode('utf-8')

    req_upload = urllib.request.Request(
        f"{BASE_URL}/requirements/{noc_id}/evidence?gate=JOINING",
        data=body,
        headers={'Content-Type': f'multipart/form-data; boundary={boundary}'},
        method='POST'
    )
    res_upload = json.loads(urllib.request.urlopen(req_upload).read().decode('utf-8'))['aggregate']
    req_noc_after_upload = next(r for r in res_upload['requirements'] if r['id'] == noc_id)
    print(f"\n[4] Action 2 (Upload Evidence) Complete:")
    print("    New State:", req_noc_after_upload['state'])
    print("    Attached Evidence Count:", len(req_noc_after_upload['evidence_links']))
    print("    Evidence File:", req_noc_after_upload['evidence_links'][0]['file_name'])
    assert req_noc_after_upload['state'] == 'EVIDENCE_RECEIVED'
    assert len(req_noc_after_upload['evidence_links']) >= 1
    assert req_noc_after_upload['evidence_links'][0]['file_name'] == 'college_noc.pdf'

    # 4. Verify Requirement
    req_verify = urllib.request.Request(
        f"{BASE_URL}/requirements/{noc_id}/verify?gate=JOINING",
        data=json.dumps({'actor': 'institutional_reviewer', 'notes': 'Verified college letterhead and seal'}).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    res_verify = json.loads(urllib.request.urlopen(req_verify).read().decode('utf-8'))['aggregate']
    req_noc_after_verify = next(r for r in res_verify['requirements'] if r['id'] == noc_id)
    print(f"\n[5] Action 3 (Verify Requirement) Complete:")
    print("    New State:", req_noc_after_verify['state'])
    print("    Certified By:", req_noc_after_verify['verified_by'])
    assert req_noc_after_verify['state'] == 'VERIFIED'

    # 5. Global Metrics & Blocker Verification
    v_progress = res_verify['progress']
    v_readiness = res_verify['gate_readiness']
    print(f"\n[6] Global UI / Aggregate Progression:")
    print("    Verified Count:", v_progress['verified_count'], "(was 4, now 5)")
    print("    Active Blockers:", len(v_readiness['active_blockers']), "(was 2, now 1)")
    print("    JOINING Gate is_ready:", v_readiness['is_ready'])
    remaining_blockers = [b['code'] for b in v_readiness['active_blockers']]
    print("    Remaining Blocker Codes:", remaining_blockers)
    
    assert v_progress['verified_count'] == 5
    assert len(v_readiness['active_blockers']) == 1
    assert v_readiness['is_ready'] is False
    assert len(remaining_blockers) == 1
    assert remaining_blockers[0] == 'FSSAI-REQ-08'

    # 6. Alternative Flow: Rejection and Recovery via Replacement Evidence
    print(f"\n[7] Testing Rejection and Recovery on Character Certificate (FSSAI-REQ-08)...")
    req_cc = next(r for r in agg['requirements'] if r['code'] == 'FSSAI-REQ-08')
    cc_id = req_cc['id']

    # Upload first evidence
    req_cc_up = urllib.request.Request(
        f"{BASE_URL}/requirements/{cc_id}/evidence?gate=JOINING",
        data=body,
        headers={'Content-Type': f'multipart/form-data; boundary={boundary}'},
        method='POST'
    )
    res_cc_up = json.loads(urllib.request.urlopen(req_cc_up).read().decode('utf-8'))['aggregate']
    req_cc_after_up = next(r for r in res_cc_up['requirements'] if r['id'] == cc_id)
    assert req_cc_after_up['state'] == 'EVIDENCE_RECEIVED'
    print("    Uploaded Initial Evidence -> State:", req_cc_after_up['state'])

    # Reject with mandatory reason
    rejection_reason = "Official stamp missing on certificate page 1"
    req_reject = urllib.request.Request(
        f"{BASE_URL}/requirements/{cc_id}/reject?gate=JOINING",
        data=json.dumps({'reason': rejection_reason, 'actor': 'compliance_officer'}).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    res_reject = json.loads(urllib.request.urlopen(req_reject).read().decode('utf-8'))['aggregate']
    req_cc_rejected = next(r for r in res_reject['requirements'] if r['id'] == cc_id)
    assert req_cc_rejected['state'] == 'REJECTED'
    assert req_cc_rejected['rejection_reason'] == rejection_reason
    print("    Rejected Evidence -> State:", req_cc_rejected['state'])
    print("    Recorded Reason:", req_cc_rejected['rejection_reason'])

    # Recover via replacement evidence upload
    req_cc_recovery = urllib.request.Request(
        f"{BASE_URL}/requirements/{cc_id}/evidence?gate=JOINING",
        data=body,
        headers={'Content-Type': f'multipart/form-data; boundary={boundary}'},
        method='POST'
    )
    res_recovery = json.loads(urllib.request.urlopen(req_cc_recovery).read().decode('utf-8'))['aggregate']
    req_cc_recovered = next(r for r in res_recovery['requirements'] if r['id'] == cc_id)
    assert req_cc_recovered['state'] == 'EVIDENCE_RECEIVED'
    print("    Replacement Upload -> State:", req_cc_recovered['state'])

    print("\n==================================================")
    print("ALL CANONICAL LIFECYCLE CHECKS PASSED WITH 100% SUCCESS!")
    print("==================================================")

if __name__ == '__main__':
    run_verification()
