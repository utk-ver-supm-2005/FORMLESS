import json
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select
from app.main import app
from app.database import engine, init_db
from app.models import (
    ApplicantProfile,
    Application,
    Requirement,
    RequirementDependency,
    RequirementRule,
    RequirementState,
    RuleCombinationLogic,
    RuleEvaluationStatus,
    RuleOperator,
    StageGate,
    VerificationMode,
)
from app.services.readiness import calculate_gate_readiness, calculate_progress
from app.services.rule_engine import evaluate_requirement_rules, evaluate_single_rule
from app.services.seed import DEMO_CONTEXT_ID, reset_canonical_fssai_demo

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_clean_db():
    init_db()
    with Session(engine) as session:
        reset_canonical_fssai_demo(session)
    yield


# =========================================================================
# 1. Operators & Rule Evaluation Tests
# =========================================================================

def test_01_operator_equals():
    profile = ApplicantProfile(
        applicant_context_id="test_01",
        degree="B.Tech Information Technology",
        enrollment_type="FULL_TIME",
        year_of_study=3,
        cgpa=8.3
    )
    rule_match = RequirementRule(
        requirement_id="r1",
        field="degree",
        operator=RuleOperator.EQUALS.value,
        expected_value_json=json.dumps("B.Tech Information Technology")
    )
    status, msg = evaluate_single_rule(rule_match, profile)
    assert status == RuleEvaluationStatus.SATISFIED

    rule_no_match = RequirementRule(
        requirement_id="r1",
        field="degree",
        operator=RuleOperator.EQUALS.value,
        expected_value_json=json.dumps("B.Tech Computer Science")
    )
    status, msg = evaluate_single_rule(rule_no_match, profile)
    assert status == RuleEvaluationStatus.NOT_SATISFIED


def test_02_operator_in():
    profile = ApplicantProfile(
        applicant_context_id="test_02",
        degree="B.Tech Information Technology",
        enrollment_type="FULL_TIME",
        year_of_study=3,
        cgpa=8.3
    )
    rule_in = RequirementRule(
        requirement_id="r2",
        field="year_of_study",
        operator=RuleOperator.IN.value,
        expected_value_json=json.dumps([3, 4])
    )
    status, msg = evaluate_single_rule(rule_in, profile)
    assert status == RuleEvaluationStatus.SATISFIED

    rule_not_in = RequirementRule(
        requirement_id="r2",
        field="year_of_study",
        operator=RuleOperator.IN.value,
        expected_value_json=json.dumps([1, 2])
    )
    status, msg = evaluate_single_rule(rule_not_in, profile)
    assert status == RuleEvaluationStatus.NOT_SATISFIED


def test_03_operator_gte():
    profile = ApplicantProfile(
        applicant_context_id="test_03",
        degree="B.Tech Information Technology",
        enrollment_type="FULL_TIME",
        year_of_study=3,
        cgpa=8.3
    )
    rule_gte_satisfied = RequirementRule(
        requirement_id="r3",
        field="cgpa",
        operator=RuleOperator.GTE.value,
        expected_value_json=json.dumps(6.0)
    )
    status, msg = evaluate_single_rule(rule_gte_satisfied, profile)
    assert status == RuleEvaluationStatus.SATISFIED

    rule_gte_failed = RequirementRule(
        requirement_id="r3",
        field="cgpa",
        operator=RuleOperator.GTE.value,
        expected_value_json=json.dumps(9.0)
    )
    status, msg = evaluate_single_rule(rule_gte_failed, profile)
    assert status == RuleEvaluationStatus.NOT_SATISFIED


def test_04_all_rule_combination():
    profile = ApplicantProfile(
        applicant_context_id="test_04",
        degree="B.Tech Information Technology",
        year_of_study=3,
        cgpa=8.3,
        enrollment_type="FULL_TIME"
    )
    req = Requirement(
        application_id="app_1",
        code="REQ-ALL",
        title="Eligibility Package",
        description="All criteria must pass",
        rule_combination_logic=RuleCombinationLogic.ALL.value
    )
    rule1 = RequirementRule(requirement_id="r", field="year_of_study", operator=RuleOperator.IN.value, expected_value_json=json.dumps([3, 4]))
    rule2 = RequirementRule(requirement_id="r", field="enrollment_type", operator=RuleOperator.EQUALS.value, expected_value_json=json.dumps("FULL_TIME"))

    result = evaluate_requirement_rules(req, [rule1, rule2], profile)
    assert result["overall_status"] == RuleEvaluationStatus.SATISFIED.value

    # If one rule fails, ALL fails
    rule_fail = RequirementRule(requirement_id="r", field="cgpa", operator=RuleOperator.GTE.value, expected_value_json=json.dumps(9.5))
    result_failed = evaluate_requirement_rules(req, [rule1, rule2, rule_fail], profile)
    assert result_failed["overall_status"] == RuleEvaluationStatus.NOT_SATISFIED.value


def test_05_any_rule_combination():
    profile = ApplicantProfile(
        applicant_context_id="test_05",
        degree="B.Tech Information Technology",
        year_of_study=3,
        cgpa=8.3,
        enrollment_type="FULL_TIME"
    )
    req = Requirement(
        application_id="app_1",
        code="REQ-ANY",
        title="Alternative Qualification",
        description="Any criteria passes",
        rule_combination_logic=RuleCombinationLogic.ANY.value
    )
    rule_fail = RequirementRule(requirement_id="r", field="degree", operator=RuleOperator.EQUALS.value, expected_value_json=json.dumps("M.Sc Food Tech"))
    rule_pass = RequirementRule(requirement_id="r", field="year_of_study", operator=RuleOperator.EQUALS.value, expected_value_json=json.dumps(3))

    result = evaluate_requirement_rules(req, [rule_fail, rule_pass], profile)
    assert result["overall_status"] == RuleEvaluationStatus.SATISFIED.value

    # When both fail, ANY fails
    rule_fail_2 = RequirementRule(requirement_id="r", field="year_of_study", operator=RuleOperator.EQUALS.value, expected_value_json=json.dumps(1))
    result_all_failed = evaluate_requirement_rules(req, [rule_fail, rule_fail_2], profile)
    assert result_all_failed["overall_status"] == RuleEvaluationStatus.NOT_SATISFIED.value


def test_06_satisfied_rule_result():
    profile = ApplicantProfile(
        applicant_context_id="test_06",
        degree="B.Tech Information Technology",
        year_of_study=3,
        cgpa=8.3
    )
    rule = RequirementRule(requirement_id="r", field="cgpa", operator=RuleOperator.GTE.value, expected_value_json=json.dumps(8.0))
    status, msg = evaluate_single_rule(rule, profile)
    assert status == RuleEvaluationStatus.SATISFIED
    assert "8.3" in msg


def test_07_failed_rule_result():
    profile = ApplicantProfile(
        applicant_context_id="test_07",
        degree="B.Tech Information Technology",
        year_of_study=3,
        cgpa=8.3
    )
    rule = RequirementRule(requirement_id="r", field="cgpa", operator=RuleOperator.GTE.value, expected_value_json=json.dumps(9.0))
    status, msg = evaluate_single_rule(rule, profile)
    assert status == RuleEvaluationStatus.NOT_SATISFIED
    assert "False" in msg


def test_08_needs_verification_result():
    profile = ApplicantProfile(
        applicant_context_id="test_08",
        degree="B.Tech Information Technology"
    )
    # Field does not exist on profile
    rule_missing_field = RequirementRule(
        requirement_id="r",
        field="unaccredited_score",
        operator=RuleOperator.EQUALS.value,
        expected_value_json=json.dumps("A+")
    )
    status, msg = evaluate_single_rule(rule_missing_field, profile)
    assert status == RuleEvaluationStatus.NEEDS_VERIFICATION
    assert "missing or null" in msg

    # Non-numeric comparison on GTE
    rule_invalid_numeric = RequirementRule(
        requirement_id="r",
        field="degree",
        operator=RuleOperator.GTE.value,
        expected_value_json=json.dumps(5.0)
    )
    status, msg = evaluate_single_rule(rule_invalid_numeric, profile)
    assert status == RuleEvaluationStatus.NEEDS_VERIFICATION


# =========================================================================
# 2. Stage Gate Readiness & Progress Tests
# =========================================================================

def test_09_joining_gate_with_two_blockers():
    with Session(engine) as session:
        app = session.exec(select(Application).where(Application.applicant_context_id == DEMO_CONTEXT_ID)).first()
        reqs = session.exec(select(Requirement).where(Requirement.application_id == app.id)).all()

        readiness = calculate_gate_readiness(reqs, StageGate.JOINING.value)
        assert readiness["gate"] == "JOINING"
        assert readiness["is_ready"] is False
        assert readiness["status"] == "NOT_READY"

        # Check blockers include College NOC and Character Certificate
        blocker_codes = [b["code"] for b in readiness["active_blockers"]]
        assert "FSSAI-REQ-07" in blocker_codes
        assert "FSSAI-REQ-08" in blocker_codes
        assert readiness["blocking_unresolved"] == len(readiness["active_blockers"])


def test_10_joining_gate_after_college_noc_verified():
    with Session(engine) as session:
        app = session.exec(select(Application).where(Application.applicant_context_id == DEMO_CONTEXT_ID)).first()

        # Simulate College NOC transitioning to VERIFIED
        noc_req = session.exec(
            select(Requirement).where(
                Requirement.application_id == app.id,
                Requirement.code == "FSSAI-REQ-07"
            )
        ).first()
        assert noc_req is not None
        noc_req.state = RequirementState.VERIFIED.value
        session.add(noc_req)
        session.commit()

        # Re-fetch requirements and calculate readiness
        reqs = session.exec(select(Requirement).where(Requirement.application_id == app.id)).all()
        readiness = calculate_gate_readiness(reqs, StageGate.JOINING.value)

        # JOINING is still NOT_READY because Character Certificate is still missing
        assert readiness["is_ready"] is False
        assert readiness["status"] == "NOT_READY"
        assert len(readiness["active_blockers"]) == 1
        assert readiness["active_blockers"][0]["code"] == "FSSAI-REQ-08"
        assert readiness["active_blockers"][0]["title"] == "Character Certificate"


def test_11_resolved_count_equals_verified_count():
    with Session(engine) as session:
        app = session.exec(select(Application).where(Application.applicant_context_id == DEMO_CONTEXT_ID)).first()
        reqs = session.exec(select(Requirement).where(Requirement.application_id == app.id)).all()

        # Initially 4 verified of 8
        prog_initial = calculate_progress(reqs)
        assert prog_initial["total_count"] == 8
        assert prog_initial["resolved_count"] == 4
        assert prog_initial["verified_count"] == 4
        assert prog_initial["needs_verification_count"] == 2
        assert prog_initial["missing_count"] == 2

        # Simulate NOC verified -> resolved count becomes 5 of 8
        noc_req = next(r for r in reqs if r.code == "FSSAI-REQ-07")
        noc_req.state = RequirementState.VERIFIED.value
        session.add(noc_req)
        session.commit()

        reqs_after = session.exec(select(Requirement).where(Requirement.application_id == app.id)).all()
        prog_after = calculate_progress(reqs_after)
        assert prog_after["resolved_count"] == 5
        assert prog_after["verified_count"] == 5
        assert prog_after["missing_count"] == 1


def test_12_demo_reset_restores_canonical_state():
    # Call demo reset API endpoint
    response = client.post("/api/v1/demo/reset-fssai")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "reset_success"

    aggregate = data["data"]
    assert aggregate["application"]["applicant_context_id"] == DEMO_CONTEXT_ID
    assert aggregate["applicant_profile"]["degree"] == "B.Tech Information Technology"
    assert aggregate["applicant_profile"]["year_of_study"] == 3
    assert aggregate["applicant_profile"]["cgpa"] == 8.3
    assert aggregate["applicant_profile"]["enrollment_type"] == "FULL_TIME"

    # Verify counts: 4 verified, 2 needs_verification, 2 missing
    progress = aggregate["progress"]
    assert progress["total_count"] == 8
    assert progress["resolved_count"] == 4
    assert progress["verified_count"] == 4
    assert progress["needs_verification_count"] == 2
    assert progress["missing_count"] == 2

    # Verify default gate is JOINING and not ready
    gate_readiness = aggregate["gate_readiness"]
    assert gate_readiness["gate"] == "JOINING"
    assert gate_readiness["is_ready"] is False
    assert gate_readiness["status"] == "NOT_READY"
    blocker_codes = [b["code"] for b in gate_readiness["active_blockers"]]
    assert "FSSAI-REQ-07" in blocker_codes
    assert "FSSAI-REQ-08" in blocker_codes


def test_13_dependencies_correctly_represented():
    with Session(engine) as session:
        app = session.exec(select(Application).where(Application.applicant_context_id == DEMO_CONTEXT_ID)).first()
        reqs = session.exec(select(Requirement).where(Requirement.application_id == app.id)).all()
        req_map = {r.code: r for r in reqs}

        noc_req = req_map["FSSAI-REQ-07"]
        char_req = req_map["FSSAI-REQ-08"]

        # 1. Both are independent prerequisites blocking the JOINING gate
        assert "JOINING" in noc_req.blocking_stages
        assert "JOINING" in char_req.blocking_stages

        # 2. No artificial inter-requirement dependency exists between them
        inter_dep = session.exec(
            select(RequirementDependency).where(
                RequirementDependency.requirement_id == char_req.id,
                RequirementDependency.depends_on_requirement_id == noc_req.id
            )
        ).first()
        assert inter_dep is None

        # 3. RequirementDependency model remains available and functional for genuine graph dependencies
        test_dep = RequirementDependency(
            requirement_id=char_req.id,
            depends_on_requirement_id=noc_req.id,
            dependency_type="PREREQUISITE_EVIDENCE"
        )
        session.add(test_dep)
        session.commit()
        session.refresh(test_dep)
        assert test_dep.id is not None
        session.delete(test_dep)
        session.commit()


def test_14_profile_based_requirements_evaluated_deterministically():
    with Session(engine) as session:
        app = session.exec(select(Application).where(Application.applicant_context_id == DEMO_CONTEXT_ID)).first()

    response = client.post(f"/api/v1/applications/{app.id}/evaluate-rules")
    assert response.status_code == 200
    data = response.json()
    assert data["application_id"] == app.id
    assert data["evaluated_requirements_count"] == 4

    # All 4 profile requirements should evaluate to SATISFIED
    for res in data["results"]:
        assert res["overall_status"] == RuleEvaluationStatus.SATISFIED.value
