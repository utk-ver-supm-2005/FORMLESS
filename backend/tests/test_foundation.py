import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select
from app.main import app
from app.database import engine, init_db
from app.models import ApplicantProfile, StageGate, RequirementState

client = TestClient(app)

def test_health_check():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["gemini_model"] == "gemini-3.8-flash"
    assert data["default_gate"] == StageGate.JOINING.value

def test_models_and_database_init():
    init_db()
    with Session(engine) as session:
        # Create a test profile with canonical prototype attributes
        profile = ApplicantProfile(
            applicant_context_id="test_demo_01",
            display_label="Demo Applicant",
            degree="B.Tech Information Technology",
            year_of_study=3,
            cgpa=8.3,
            enrollment_type="FULL_TIME"
        )
        session.add(profile)
        session.commit()
        session.refresh(profile)

        # Query back
        statement = select(ApplicantProfile).where(ApplicantProfile.applicant_context_id == "test_demo_01")
        saved = session.exec(statement).first()
        assert saved is not None
        assert saved.degree == "B.Tech Information Technology"
        assert saved.year_of_study == 3
        assert saved.cgpa == 8.3
        assert saved.enrollment_type == "FULL_TIME"

def test_sqlite_foreign_key_enforcement():
    init_db()
    with Session(engine) as session:
        from sqlalchemy.exc import IntegrityError
        from app.models import Application
        
        # Attempting to insert an application pointing to a non-existent policy document must fail
        invalid_app = Application(
            applicant_context_id="test_demo_01",
            policy_document_id="non_existent_policy_doc_uuid_12345",
            title="Orphan Application"
        )
        session.add(invalid_app)
        with pytest.raises(IntegrityError):
            session.commit()
        session.rollback()

def test_config_without_api_key():
    from app.config import Settings
    custom_settings = Settings()
    assert isinstance(custom_settings.GEMINI_API_KEY, str)
    assert custom_settings.GEMINI_MODEL == "gemini-3.8-flash"
    assert custom_settings.DEFAULT_APPLICANT_ID == "demo_applicant_01"


def test_auth_endpoints():
    # Successful demo login
    resp = client.post("/api/v1/auth/login", json={
        "username": "formless_demo",
        "password": "FormlessDemo2026!"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "authenticated"
    assert "access_token" in data
    assert data["user"]["username"] == "formless_demo"

    # Failed login with wrong password
    resp_fail = client.post("/api/v1/auth/login", json={
        "username": "formless_demo",
        "password": "WrongPassword!"
    })
    assert resp_fail.status_code == 401

    # Missing credentials
    resp_bad = client.post("/api/v1/auth/login", json={
        "username": "",
        "password": ""
    })
    assert resp_bad.status_code == 400

    # Auth status endpoint
    resp_status = client.get("/api/v1/auth/status")
    assert resp_status.status_code == 200
    assert resp_status.json()["demo_auth_enabled"] is True
