import json
from sqlmodel import Session, select
from app.models import (
    ApplicantProfile,
    Application,
    DependencyType,
    EvidenceItem,
    PolicyDocument,
    Requirement,
    RequirementDependency,
    RequirementEvidenceLink,
    RequirementRule,
    RequirementState,
    RequirementTransitionEvent,
    RuleEvaluationStatus,
    RuleOperator,
    StageGate,
    VerificationMethod,
    VerificationMode,
)

DEMO_CONTEXT_ID = "demo_applicant_01"
CANONICAL_HASH = "fssai_circular_2026_canonical_sha256_seed_hash_v1"


def reset_canonical_fssai_demo(session: Session) -> Application:
    """
    Cleans up any prior records for demo_applicant_01 and re-instantiates the canonical
    8-requirement FSSAI internship scenario. Safe to run repeatedly.
    """
    # 1. Clean up existing demo data
    existing_apps = session.exec(
        select(Application).where(Application.applicant_context_id == DEMO_CONTEXT_ID)
    ).all()

    for app in existing_apps:
        reqs = session.exec(select(Requirement).where(Requirement.application_id == app.id)).all()
        for r in reqs:
            # Delete child rules
            for rule in session.exec(select(RequirementRule).where(RequirementRule.requirement_id == r.id)).all():
                session.delete(rule)

            # Delete dependencies where requirement is parent or child
            for dep in session.exec(
                select(RequirementDependency).where(
                    (RequirementDependency.requirement_id == r.id) |
                    (RequirementDependency.depends_on_requirement_id == r.id)
                )
            ).all():
                session.delete(dep)

            # Delete transition events
            for event in session.exec(select(RequirementTransitionEvent).where(RequirementTransitionEvent.requirement_id == r.id)).all():
                session.delete(event)

            # Delete evidence links
            for link in session.exec(select(RequirementEvidenceLink).where(RequirementEvidenceLink.requirement_id == r.id)).all():
                session.delete(link)

            session.delete(r)

        session.delete(app)

    # Clean up evidence items for demo applicant
    for evi in session.exec(select(EvidenceItem).where(EvidenceItem.applicant_context_id == DEMO_CONTEXT_ID)).all():
        session.delete(evi)

    # Clean up existing profiles & policy documents
    for p in session.exec(select(ApplicantProfile).where(ApplicantProfile.applicant_context_id == DEMO_CONTEXT_ID)).all():
        session.delete(p)

    for doc in session.exec(select(PolicyDocument).where(PolicyDocument.file_hash == CANONICAL_HASH)).all():
        session.delete(doc)

    session.commit()

    # 2. Create Policy Document
    policy_doc = PolicyDocument(
        title="FSSAI Internship Scheme Circular 2026",
        document_type="POLICY_PDF",
        file_path="seed/fssai_internship_circular_2026.pdf",
        file_hash=CANONICAL_HASH,
        is_demo_seed=True
    )
    session.add(policy_doc)
    session.commit()
    session.refresh(policy_doc)

    # 3. Create Canonical Applicant Profile
    profile = ApplicantProfile(
        applicant_context_id=DEMO_CONTEXT_ID,
        display_label="Demo Applicant",
        degree="B.Tech Information Technology",
        year_of_study=3,
        cgpa=8.3,
        enrollment_type="FULL_TIME",
        attributes_json=json.dumps({
            "university": "State Technical University",
            "department": "Information Technology",
            "laptop_available": True
        })
    )
    session.add(profile)
    session.commit()
    session.refresh(profile)

    # 4. Create Application (Default gate: JOINING)
    application = Application(
        applicant_context_id=DEMO_CONTEXT_ID,
        policy_document_id=policy_doc.id,
        title="FSSAI Internship Program 2026 Application",
        current_stage=StageGate.JOINING.value
    )
    session.add(application)
    session.commit()
    session.refresh(application)

    # 5. Create Exactly 8 Canonical Requirements
    # Requirement 01: B.Tech Information Technology
    req_01 = Requirement(
        application_id=application.id,
        code="FSSAI-REQ-01",
        title="B.Tech Information Technology",
        description="Candidate must be enrolled in B.Tech Information Technology or approved relevant discipline.",
        category="ELIGIBILITY",
        blocking_stages_json=json.dumps([StageGate.APPLICATION_SUBMISSION.value]),
        verification_mode=VerificationMode.RULE_ENGINE.value,
        state=RequirementState.VERIFIED.value,
        verification_method=VerificationMethod.RULE_ENGINE.value,
        verified_by="system_rule_engine",
        source_citation_json=json.dumps({
            "section": "Section 3(a) - Educational Qualifications",
            "page": 1,
            "quote": "Students pursuing regular B.Tech in Information Technology or Computer Science from recognized institutions.",
            "confidence_score": 0.98
        })
    )
    session.add(req_01)
    session.commit()
    session.refresh(req_01)

    rule_01 = RequirementRule(
        requirement_id=req_01.id,
        field="degree",
        operator=RuleOperator.EQUALS.value,
        expected_value_json=json.dumps("B.Tech Information Technology"),
        evaluation_status=RuleEvaluationStatus.SATISFIED.value,
        evaluation_message="Applicant degree matches 'B.Tech Information Technology'."
    )
    session.add(rule_01)

    # Requirement 02: 3rd Year
    req_02 = Requirement(
        application_id=application.id,
        code="FSSAI-REQ-02",
        title="3rd Year",
        description="Students must be currently in their 3rd or 4th year of undergraduate study.",
        category="ELIGIBILITY",
        blocking_stages_json=json.dumps([StageGate.APPLICATION_SUBMISSION.value]),
        verification_mode=VerificationMode.RULE_ENGINE.value,
        state=RequirementState.VERIFIED.value,
        verification_method=VerificationMethod.RULE_ENGINE.value,
        verified_by="system_rule_engine",
        source_citation_json=json.dumps({
            "section": "Section 3(b) - Year of Study",
            "page": 1,
            "quote": "Only 3rd and 4th year undergraduate students are eligible to apply for the internship.",
            "confidence_score": 0.99
        })
    )
    session.add(req_02)
    session.commit()
    session.refresh(req_02)

    rule_02 = RequirementRule(
        requirement_id=req_02.id,
        field="year_of_study",
        operator=RuleOperator.IN.value,
        expected_value_json=json.dumps([3, 4]),
        evaluation_status=RuleEvaluationStatus.SATISFIED.value,
        evaluation_message="Applicant year_of_study (3) is in [3, 4]."
    )
    session.add(rule_02)

    # Requirement 03: Full-time study
    req_03 = Requirement(
        application_id=application.id,
        code="FSSAI-REQ-03",
        title="Full-time study",
        description="Candidate must be pursuing a regular full-time degree course.",
        category="ELIGIBILITY",
        blocking_stages_json=json.dumps([StageGate.APPLICATION_SUBMISSION.value]),
        verification_mode=VerificationMode.RULE_ENGINE.value,
        state=RequirementState.VERIFIED.value,
        verification_method=VerificationMethod.RULE_ENGINE.value,
        verified_by="system_rule_engine",
        source_citation_json=json.dumps({
            "section": "Section 3(c) - Attendance & Mode",
            "page": 2,
            "quote": "Candidates enrolled in regular full-time programs are eligible; part-time students are not eligible.",
            "confidence_score": 0.96
        })
    )
    session.add(req_03)
    session.commit()
    session.refresh(req_03)

    rule_03 = RequirementRule(
        requirement_id=req_03.id,
        field="enrollment_type",
        operator=RuleOperator.EQUALS.value,
        expected_value_json=json.dumps("FULL_TIME"),
        evaluation_status=RuleEvaluationStatus.SATISFIED.value,
        evaluation_message="Applicant enrollment_type matches 'FULL_TIME'."
    )
    session.add(rule_03)

    # Requirement 04: Academic qualification
    req_04 = Requirement(
        application_id=application.id,
        code="FSSAI-REQ-04",
        title="Academic qualification",
        description="Minimum cumulative grade point average (CGPA) of 6.0 or higher.",
        category="ELIGIBILITY",
        blocking_stages_json=json.dumps([StageGate.APPLICATION_SUBMISSION.value]),
        verification_mode=VerificationMode.RULE_ENGINE.value,
        state=RequirementState.VERIFIED.value,
        verification_method=VerificationMethod.RULE_ENGINE.value,
        verified_by="system_rule_engine",
        source_citation_json=json.dumps({
            "section": "Section 3(d) - Academic Standing",
            "page": 2,
            "quote": "A minimum CGPA of 6.0 out of 10 or equivalent aggregate in preceding semester examinations.",
            "confidence_score": 0.97
        })
    )
    session.add(req_04)
    session.commit()
    session.refresh(req_04)

    rule_04 = RequirementRule(
        requirement_id=req_04.id,
        field="cgpa",
        operator=RuleOperator.GTE.value,
        expected_value_json=json.dumps(6.0),
        evaluation_status=RuleEvaluationStatus.SATISFIED.value,
        evaluation_message="Applicant CGPA (8.3) >= 6.0 threshold."
    )
    session.add(rule_04)

    # Requirement 05: Recognized institute
    req_05 = Requirement(
        application_id=application.id,
        code="FSSAI-REQ-05",
        title="Recognized institute",
        description="Institution must be recognized by UGC, AICTE, or Central/State Government.",
        category="ELIGIBILITY",
        blocking_stages_json=json.dumps([StageGate.APPLICATION_SUBMISSION.value]),
        verification_mode=VerificationMode.NEEDS_VERIFICATION.value,
        state=RequirementState.NEEDS_VERIFICATION.value,
        source_citation_json=json.dumps({
            "section": "Section 2 - Institutional Recognition",
            "page": 1,
            "quote": "Colleges and universities must be recognized by AICTE, UGC, or established by Act of Parliament.",
            "confidence_score": 0.94
        })
    )
    session.add(req_05)

    # Requirement 06: Personal laptop
    req_06 = Requirement(
        application_id=application.id,
        code="FSSAI-REQ-06",
        title="Personal laptop",
        description="Selected candidate must bring and utilize a personal laptop during the internship.",
        category="PREREQUISITE",
        blocking_stages_json=json.dumps([StageGate.COMPLETION.value]),
        verification_mode=VerificationMode.NEEDS_VERIFICATION.value,
        state=RequirementState.NEEDS_VERIFICATION.value,
        source_citation_json=json.dumps({
            "section": "Section 5 - Working Conditions",
            "page": 3,
            "quote": "Interns are required to have their own laptops and software necessary for task assignments.",
            "confidence_score": 0.92
        })
    )
    session.add(req_06)

    # Requirement 07: College NOC (MANDATORY BLOCKER FOR JOINING)
    req_07 = Requirement(
        application_id=application.id,
        code="FSSAI-REQ-07",
        title="College NOC",
        description="No Objection Certificate from Head of Institution on official college letterhead.",
        category="DOCUMENTATION",
        blocking_stages_json=json.dumps([StageGate.JOINING.value]),
        verification_mode=VerificationMode.HUMAN_CONFIRMATION.value,
        state=RequirementState.MISSING.value,
        source_citation_json=json.dumps({
            "section": "Section 4(a) - Mandatory Clearances",
            "page": 2,
            "quote": "Candidates must submit a No Objection Certificate from the Head of the Institution/College at the time of joining.",
            "confidence_score": 0.99
        })
    )
    session.add(req_07)

    # Requirement 08: Character Certificate (MANDATORY BLOCKER FOR JOINING)
    req_08 = Requirement(
        application_id=application.id,
        code="FSSAI-REQ-08",
        title="Character Certificate",
        description="Character and Conduct Certificate issued by Dean/Principal or Gazetted Officer.",
        category="CONDUCT",
        blocking_stages_json=json.dumps([StageGate.JOINING.value]),
        verification_mode=VerificationMode.HUMAN_CONFIRMATION.value,
        state=RequirementState.MISSING.value,
        source_citation_json=json.dumps({
            "section": "Section 4(b) - Conduct Clearance",
            "page": 2,
            "quote": "A character certificate from the institute authority must be furnished prior to joining.",
            "confidence_score": 0.95
        })
    )
    session.add(req_08)
    session.commit()
    session.refresh(req_07)
    session.refresh(req_08)

    # 6. Requirement Dependencies:
    # In the canonical FSSAI policy, College NOC and Character Certificate are independent
    # mandatory prerequisites for the JOINING gate; neither depends on the other.

    return application
