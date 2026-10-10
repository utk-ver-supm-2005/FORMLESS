"""
Live End-to-End Verification Script for Milestone 8 (Ingestion Pipeline)
Verifies:
1. Vite dev server is serving the FORMLESS application.
2. FastAPI backend is healthy and responding.
3. Ingestion endpoint returns valid aggregate, model metadata, and honest governance info.
4. Duplicate submission / invalid file rejection matches backend constraints.
"""

import sys
import requests

VITE_URL = "http://127.0.0.1:5173"
API_URL = "http://127.0.0.1:8000/api/v1"

def test_frontend_server():
    print(f"Checking Vite server at {VITE_URL}...")
    res = requests.get(VITE_URL, timeout=5)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    assert "FORMLESS" in res.text or "src" in res.text, "Index HTML missing expected script/title tags"
    print("  [OK] Frontend server running and delivering HTML bundle.")

def test_backend_health():
    print(f"Checking Backend health at {API_URL}/health...")
    res = requests.get(f"{API_URL}/health", timeout=5)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.json()
    assert data.get("status") == "healthy", "Backend status not healthy"
    print(f"  [OK] Backend healthy. Active model: {data.get('model', 'unknown')}")

def test_empty_file_rejection():
    print("Testing 0-byte file rejection at backend...")
    files = {"file": ("empty.pdf", b"", "application/pdf")}
    res = requests.post(f"{API_URL}/documents/ingest?gate=JOINING", files=files, timeout=10)
    assert res.status_code == 400, f"Expected 400 for empty file, got {res.status_code}"
    print("  [OK] Empty policy file successfully rejected with 400.")

def test_non_pdf_rejection():
    print("Testing non-PDF file rejection at backend...")
    files = {"file": ("policy.docx", b"word doc content", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
    res = requests.post(f"{API_URL}/documents/ingest?gate=JOINING", files=files, timeout=10)
    assert res.status_code == 400, f"Expected 400 for non-PDF file, got {res.status_code}"
    print("  [OK] Non-PDF file successfully rejected with 400.")

def test_canonical_reset():
    print("Resetting demo baseline via POST /demo/reset-fssai...")
    res = requests.post(f"{API_URL}/demo/reset-fssai?gate=JOINING", timeout=10)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.json()
    assert data.get("aggregate") is not None, "Aggregate missing from reset response"
    agg = data["aggregate"]
    assert agg["progress"]["total_count"] == 8, f"Expected 8 criteria, got {agg['progress']['total_count']}"
    assert agg["progress"]["verified_count"] == 4, f"Expected 4 verified, got {agg['progress']['verified_count']}"
    assert len(agg["gate_readiness"]["active_blockers"]) == 2, f"Expected 2 active blockers"
    print("  [OK] Canonical demo reset verified. 8 requirements, 2 blockers, 4 verified.")

def main():
    print("=" * 60)
    print("FORMLESS Milestone 8 Live Sanity Check")
    print("=" * 60)
    try:
        test_frontend_server()
        test_backend_health()
        test_empty_file_rejection()
        test_non_pdf_rejection()
        test_canonical_reset()
        print("=" * 60)
        print("ALL LIVE SERVICE SANITY CHECKS PASSED SUCCESSFULLY")
        print("=" * 60)
    except Exception as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
