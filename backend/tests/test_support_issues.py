import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import init_db

init_db()

client = TestClient(app)



def test_submit_issue_success():
    payload = {
        "email": "auditor@example.com",
        "issue_type": "Bug",
        "subject": "Missing evidence link button in review view",
        "description": "When clicking into the FSSAI-REQ-07 detail row, the attach button does not appear.",
        "page_route": "/requirements",
    }
    response = client.post("/api/v1/support/issues", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["issue_id"].startswith("ISS-")
    assert data["status"] == "RECEIVED"
    assert "issue has been recorded" in data["message"].lower()

    # Verify retrieval
    issue_id = data["issue_id"]
    get_res = client.get(f"/api/v1/support/issues/{issue_id}")
    assert get_res.status_code == 200
    issue_data = get_res.json()
    assert issue_data["email"] == "auditor@example.com"
    assert issue_data["issue_type"] == "Bug"
    assert issue_data["subject"] == payload["subject"]
    assert issue_data["page_route"] == "/requirements"


def test_submit_issue_alias_route():
    payload = {
        "email": "reviewer@fssai.gov.in",
        "issue_type": "UI / Design",
        "subject": "Contrast issue on dark mode card",
        "description": "The typography in the secondary card has lower contrast than standard.",
        "page_route": "/overview",
    }
    response = client.post("/api/v1/issues", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["issue_id"].startswith("ISS-")


def test_submit_issue_invalid_email():
    payload = {
        "email": "not-an-email",
        "issue_type": "Bug",
        "subject": "Something broke",
        "description": "This is a descriptive issue explanation that is long enough.",
    }
    response = client.post("/api/v1/support/issues", json=payload)
    assert response.status_code == 400
    assert "email" in response.json()["detail"].lower()


def test_submit_issue_short_subject():
    payload = {
        "email": "valid@example.com",
        "issue_type": "Bug",
        "subject": "No",
        "description": "This is a descriptive issue explanation that is long enough.",
    }
    response = client.post("/api/v1/support/issues", json=payload)
    assert response.status_code == 400
    assert "subject" in response.json()["detail"].lower()


def test_submit_issue_short_description():
    payload = {
        "email": "valid@example.com",
        "issue_type": "Bug",
        "subject": "Valid Subject Here",
        "description": "Too short",
    }
    response = client.post("/api/v1/support/issues", json=payload)
    assert response.status_code == 400
    assert "description" in response.json()["detail"].lower()


def test_submit_issue_invalid_type():
    payload = {
        "email": "valid@example.com",
        "issue_type": "RandomInvalidType",
        "subject": "Valid Subject Here",
        "description": "This is a descriptive issue explanation that is long enough.",
    }
    response = client.post("/api/v1/support/issues", json=payload)
    assert response.status_code == 400
    assert "invalid issue type" in response.json()["detail"].lower()


def test_get_nonexistent_issue():
    response = client.get("/api/v1/support/issues/ISS-99999999-XXXX")
    assert response.status_code == 404
