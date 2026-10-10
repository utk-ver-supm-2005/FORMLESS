import urllib.request
import json

BASE_URL = 'http://127.0.0.1:8000/api/v1'

def run_sanity():
    print("==================================================")
    print("ACTION PLAN SANITY CHECK (10 VERIFICATION STEPS)")
    print("==================================================")

    # 1. Reset baseline
    req_reset = urllib.request.Request(f"{BASE_URL}/demo/reset-fssai?gate=JOINING", method='POST')
    res_reset = urllib.request.urlopen(req_reset)
    agg = json.loads(res_reset.read().decode('utf-8'))['aggregate']

    # Step 1: Requirement Matrix baseline works
    requirements = agg['requirements']
    print(f"[Step 1] Requirement Matrix: {len(requirements)} requirements loaded.")
    assert len(requirements) == 8

    # Step 2 & 3: Action Plan tab opens; Baseline shows College NOC + Character Certificate as blockers
    blockers = agg['gate_readiness']['active_blockers']
    blocker_codes = [b['code'] for b in blockers]
    print(f"[Step 2 & 3] Action Plan Blockers ({len(blockers)}):", blocker_codes)
    assert len(blockers) == 2
    assert 'FSSAI-REQ-07' in blocker_codes
    assert 'FSSAI-REQ-08' in blocker_codes

    # Step 4: Recognized institute + Personal laptop appear in verification attention
    needs_ver = [r for r in requirements if r['state'] == 'NEEDS_VERIFICATION']
    needs_ver_codes = [r['code'] for r in needs_ver]
    print(f"[Step 4] Needs Verification ({len(needs_ver)}):", needs_ver_codes)
    assert len(needs_ver) == 2
    assert 'FSSAI-REQ-05' in needs_ver_codes
    assert 'FSSAI-REQ-06' in needs_ver_codes

    # Step 5 & 6: Select College NOC from Action Plan -> Inspector switches to College NOC
    req_noc = next(r for r in requirements if r['code'] == 'FSSAI-REQ-07')
    noc_id = req_noc['id']
    print(f"[Step 5 & 6] College NOC Selected: ID={noc_id}, Code={req_noc['code']}, Title={req_noc['title']}")
    assert req_noc['code'] == 'FSSAI-REQ-07'
    assert req_noc['state'] == 'MISSING'

    # Step 7: Verify College NOC through the existing lifecycle
    # Request
    req_post = urllib.request.Request(
        f"{BASE_URL}/requirements/{noc_id}/request?gate=JOINING",
        data=json.dumps({'actor': 'applicant'}).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    res_req = json.loads(urllib.request.urlopen(req_post).read().decode('utf-8'))['aggregate']

    # Upload
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
        f'Content-Disposition: form-data; name="notes"\r\n\r\nOfficial NOC from Principal\r\n'
        f"--{boundary}--\r\n"
    ).encode('utf-8')

    req_upload = urllib.request.Request(
        f"{BASE_URL}/requirements/{noc_id}/evidence?gate=JOINING",
        data=body,
        headers={'Content-Type': f'multipart/form-data; boundary={boundary}'},
        method='POST'
    )
    res_upload = json.loads(urllib.request.urlopen(req_upload).read().decode('utf-8'))['aggregate']

    # Verify
    req_verify = urllib.request.Request(
        f"{BASE_URL}/requirements/{noc_id}/verify?gate=JOINING",
        data=json.dumps({'actor': 'institutional_reviewer', 'notes': 'Verified seal'}).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    res_verify = json.loads(urllib.request.urlopen(req_verify).read().decode('utf-8'))['aggregate']
    print("[Step 7] College NOC verified through lifecycle.")

    # Step 8: Action Plan updates from 2 blockers → 1 blocker
    updated_blockers = res_verify['gate_readiness']['active_blockers']
    print(f"[Step 8] Action Plan Blockers updated: {len(updated_blockers)} blocker remaining (was 2).")
    assert len(updated_blockers) == 1

    # Step 9: College NOC appears under Completed
    completed_reqs = [r for r in res_verify['requirements'] if r['state'] == 'VERIFIED']
    completed_codes = [r['code'] for r in completed_reqs]
    print(f"[Step 9] Completed requirements ({len(completed_reqs)}):", completed_codes)
    assert 'FSSAI-REQ-07' in completed_codes
    assert len(completed_reqs) == 5

    # Step 10: Character Certificate remains the only JOINING blocker
    print(f"[Step 10] Sole remaining blocker:", updated_blockers[0]['code'], "-", updated_blockers[0]['title'])
    assert updated_blockers[0]['code'] == 'FSSAI-REQ-08'
    assert updated_blockers[0]['title'] == 'Character Certificate'

    # Clean reset back to baseline
    urllib.request.urlopen(urllib.request.Request(f"{BASE_URL}/demo/reset-fssai?gate=JOINING", method='POST'))
    print("\n[SUCCESS] Baseline restored. All 10 sanity checks passed cleanly!")
    print("==================================================")

if __name__ == '__main__':
    run_sanity()
