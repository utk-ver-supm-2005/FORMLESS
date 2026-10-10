import json
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from sqlmodel import Field, SQLModel, Relationship


class RequirementState(str, Enum):
    MISSING = "MISSING"
    IN_PROGRESS = "IN_PROGRESS"
    EVIDENCE_RECEIVED = "EVIDENCE_RECEIVED"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"
    NEEDS_VERIFICATION = "NEEDS_VERIFICATION"


class VerificationMode(str, Enum):
    RULE_ENGINE = "RULE_ENGINE"
    HUMAN_CONFIRMATION = "HUMAN_CONFIRMATION"
    NEEDS_VERIFICATION = "NEEDS_VERIFICATION"


class VerificationMethod(str, Enum):
    RULE_ENGINE = "RULE_ENGINE"
    HUMAN_CONFIRMATION = "HUMAN_CONFIRMATION"
    EXTERNAL_CHECK = "EXTERNAL_CHECK"


class RuleOperator(str, Enum):
    EQUALS = "EQUALS"
    NOT_EQUALS = "NOT_EQUALS"
    IN = "IN"
    NOT_IN = "NOT_IN"
    GTE = "GTE"
    LTE = "LTE"
    GT = "GT"
    LT = "LT"
    CONTAINS = "CONTAINS"


class RuleCombinationLogic(str, Enum):
    ALL = "ALL"
    ANY = "ANY"


class RuleEvaluationStatus(str, Enum):
    UNCHECKED = "UNCHECKED"
    SATISFIED = "SATISFIED"
    NOT_SATISFIED = "NOT_SATISFIED"
    NEEDS_VERIFICATION = "NEEDS_VERIFICATION"


class StageGate(str, Enum):
    APPLICATION_SUBMISSION = "APPLICATION_SUBMISSION"
    JOINING = "JOINING"
    COMPLETION = "COMPLETION"


class DependencyType(str, Enum):
    PREREQUISITE_EVIDENCE = "PREREQUISITE_EVIDENCE"
    STRICT_VERIFICATION = "STRICT_VERIFICATION"


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class PolicyDocument(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    title: str
    document_type: str = "POLICY_PDF"
    file_path: str
    file_hash: str = Field(index=True)
    is_demo_seed: bool = False
    uploaded_at: datetime = Field(default_factory=utc_now)

    applications: List["Application"] = Relationship(back_populates="policy_document")


class ApplicantProfile(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    applicant_context_id: str = Field(index=True)
    display_label: str = "Demo Applicant"
    degree: str = "B.Tech Information Technology"
    year_of_study: int = 3
    cgpa: float = 8.3
    enrollment_type: str = "FULL_TIME"
    attributes_json: str = "{}"
    created_at: datetime = Field(default_factory=utc_now)


class Application(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    applicant_context_id: str = Field(index=True)
    policy_document_id: str = Field(foreign_key="policydocument.id")
    title: str
    current_stage: str = StageGate.JOINING.value
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

    policy_document: Optional[PolicyDocument] = Relationship(back_populates="applications")
    requirements: List["Requirement"] = Relationship(back_populates="application")


class Requirement(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    application_id: str = Field(foreign_key="application.id")
    code: str = Field(index=True)
    title: str
    description: str
    category: str = "ELIGIBILITY"  # ELIGIBILITY, DOCUMENTATION, PREREQUISITE, CONDUCT
    blocking_stages_json: str = "[\"JOINING\"]"
    verification_mode: str = VerificationMode.HUMAN_CONFIRMATION.value
    rule_combination_logic: str = RuleCombinationLogic.ALL.value
    state: str = RequirementState.MISSING.value
    source_citation_json: str = "{}"
    verification_method: Optional[str] = None
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=utc_now)

    application: Optional[Application] = Relationship(back_populates="requirements")
    rules: List["RequirementRule"] = Relationship(back_populates="requirement")
    evidence_links: List["RequirementEvidenceLink"] = Relationship(back_populates="requirement")
    transition_events: List["RequirementTransitionEvent"] = Relationship(back_populates="requirement")

    @property
    def blocking_stages(self) -> List[str]:
        try:
            return json.loads(self.blocking_stages_json)
        except Exception:
            return []

    @blocking_stages.setter
    def blocking_stages(self, stages: List[str]):
        self.blocking_stages_json = json.dumps(stages)

    @property
    def source_citation(self) -> Dict[str, Any]:
        try:
            return json.loads(self.source_citation_json)
        except Exception:
            return {}

    @source_citation.setter
    def source_citation(self, citation: Dict[str, Any]):
        self.source_citation_json = json.dumps(citation)


class RequirementRule(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    requirement_id: str = Field(foreign_key="requirement.id")
    field: str
    operator: str = RuleOperator.EQUALS.value
    expected_value_json: str
    evaluation_status: str = RuleEvaluationStatus.UNCHECKED.value
    evaluation_message: str = ""
    evaluated_at: Optional[datetime] = None

    requirement: Optional[Requirement] = Relationship(back_populates="rules")

    @property
    def expected_value(self) -> Any:
        try:
            return json.loads(self.expected_value_json)
        except Exception:
            return self.expected_value_json

    @expected_value.setter
    def expected_value(self, val: Any):
        self.expected_value_json = json.dumps(val)


class RequirementDependency(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    requirement_id: str = Field(foreign_key="requirement.id", index=True)
    depends_on_requirement_id: str = Field(foreign_key="requirement.id", index=True)
    dependency_type: str = DependencyType.STRICT_VERIFICATION.value


class EvidenceItem(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    applicant_context_id: str = Field(index=True)
    file_name: str
    file_path: str
    file_size: int
    mime_type: str
    file_hash: str = Field(index=True)
    uploaded_at: datetime = Field(default_factory=utc_now)

    requirement_links: List["RequirementEvidenceLink"] = Relationship(back_populates="evidence_item")


class RequirementEvidenceLink(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    requirement_id: str = Field(foreign_key="requirement.id")
    evidence_item_id: str = Field(foreign_key="evidenceitem.id")
    link_notes: Optional[str] = None
    linked_at: datetime = Field(default_factory=utc_now)

    requirement: Optional[Requirement] = Relationship(back_populates="evidence_links")
    evidence_item: Optional[EvidenceItem] = Relationship(back_populates="requirement_links")


class RequirementTransitionEvent(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    requirement_id: str = Field(foreign_key="requirement.id", index=True)
    from_state: str
    to_state: str
    action: str
    actor: str = "demo_reviewer"
    metadata_json: str = "{}"
    created_at: datetime = Field(default_factory=utc_now)

    requirement: Optional[Requirement] = Relationship(back_populates="transition_events")

    @property
    def previous_state(self) -> str:
        return self.from_state

    @property
    def new_state(self) -> str:
        return self.to_state

    @property
    def metadata_dict(self) -> Dict[str, Any]:
        try:
            return json.loads(self.metadata_json)
        except Exception:
            return {}

    @metadata_dict.setter
    def metadata_dict(self, val: Dict[str, Any]):
        self.metadata_json = json.dumps(val)


class IssueType(str, Enum):
    BUG = "Bug"
    UI_DESIGN = "UI / Design"
    DOCUMENT_UPLOAD = "Document upload"
    LOGIN_ACCESS = "Login / Access"
    OTHER = "Other"


class IssueReport(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    issue_id: str = Field(index=True, unique=True)
    email: str = Field(index=True)
    issue_type: str = Field(default=IssueType.BUG.value)
    subject: str
    description: str
    page_route: Optional[str] = None
    status: str = Field(default="OPEN")
    created_at: datetime = Field(default_factory=utc_now)

