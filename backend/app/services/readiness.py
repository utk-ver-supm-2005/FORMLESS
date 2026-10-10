from typing import Any, Dict, List
from app.models import Requirement, RequirementState, StageGate


def calculate_gate_readiness(
    requirements: List[Requirement],
    gate: str = StageGate.JOINING.value
) -> Dict[str, Any]:
    """
    Deterministically evaluates readiness for a specified stage gate.
    A requirement blocks gate G if G is present in its blocking_stages list.
    A blocking requirement is satisfied if and only if its lifecycle state is VERIFIED.
    """
    target_gate = gate.upper() if isinstance(gate, str) else StageGate.JOINING.value

    # Filter requirements that block this specific gate
    blocking_requirements = [
        req for req in requirements
        if target_gate in [stage.upper() for stage in req.blocking_stages]
    ]

    active_blockers = []
    satisfied_count = 0

    for req in blocking_requirements:
        if req.state == RequirementState.VERIFIED.value:
            satisfied_count += 1
        else:
            reason = f"{req.title} is not verified (current state: {req.state})."
            if req.state == RequirementState.MISSING.value:
                reason = f"{req.title} is missing and required before {target_gate}."
            elif req.state == RequirementState.NEEDS_VERIFICATION.value:
                reason = f"{req.title} requires manual verification before {target_gate}."
            elif req.state == RequirementState.IN_PROGRESS.value:
                reason = f"{req.title} is currently in progress."
            elif req.state == RequirementState.EVIDENCE_RECEIVED.value:
                reason = f"{req.title} has evidence received pending review."
            elif req.state == RequirementState.REJECTED.value:
                reason = f"{req.title} evidence was rejected: {req.rejection_reason or 'Correction required.'}"

            active_blockers.append({
                "requirement_id": req.id,
                "code": req.code,
                "title": req.title,
                "state": req.state,
                "verification_mode": req.verification_mode,
                "reason": reason
            })

    is_ready = len(active_blockers) == 0
    status = "READY" if is_ready else "NOT_READY"

    return {
        "gate": target_gate,
        "is_ready": is_ready,
        "status": status,
        "active_blockers": active_blockers,
        "blocking_total": len(blocking_requirements),
        "blocking_satisfied": satisfied_count,
        "blocking_unresolved": len(active_blockers)
    }


def calculate_progress(requirements: List[Requirement]) -> Dict[str, Any]:
    """
    Calculates progress metric strictly based on verified requirement count.
    Does NOT output a misleading 'readiness percentage'.
    """
    total = len(requirements)
    verified = sum(1 for r in requirements if r.state == RequirementState.VERIFIED.value)
    needs_verification = sum(1 for r in requirements if r.state == RequirementState.NEEDS_VERIFICATION.value)
    missing = sum(1 for r in requirements if r.state == RequirementState.MISSING.value)
    in_progress = sum(1 for r in requirements if r.state == RequirementState.IN_PROGRESS.value)
    evidence_received = sum(1 for r in requirements if r.state == RequirementState.EVIDENCE_RECEIVED.value)
    rejected = sum(1 for r in requirements if r.state == RequirementState.REJECTED.value)

    return {
        "total_count": total,
        "resolved_count": verified,
        "verified_count": verified,
        "needs_verification_count": needs_verification,
        "missing_count": missing,
        "in_progress_count": in_progress,
        "evidence_received_count": evidence_received,
        "rejected_count": rejected,
        "display_progress": f"{verified} of {total} requirements resolved"
    }
