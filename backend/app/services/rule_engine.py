import json
from typing import Any, Dict, List, Optional, Tuple
from app.models import (
    ApplicantProfile,
    Requirement,
    RequirementRule,
    RuleCombinationLogic,
    RuleEvaluationStatus,
    RuleOperator,
)


def extract_field_value(profile: ApplicantProfile, field_name: str) -> Tuple[bool, Any]:
    """
    Extract a field value from ApplicantProfile (either standard attributes or extra attributes_json).
    Returns (found: bool, value: Any).
    """
    if hasattr(profile, field_name):
        val = getattr(profile, field_name)
        if val is not None:
            return True, val

    try:
        extras = json.loads(profile.attributes_json)
        if isinstance(extras, dict) and field_name in extras:
            val = extras[field_name]
            if val is not None:
                return True, val
    except Exception:
        pass

    return False, None


def evaluate_single_rule(rule: RequirementRule, profile: ApplicantProfile) -> Tuple[RuleEvaluationStatus, str]:
    """
    Deterministically evaluates a single RequirementRule against an ApplicantProfile.
    Returns (RuleEvaluationStatus, message).
    """
    found, actual_val = extract_field_value(profile, rule.field)
    if not found or actual_val is None:
        return (
            RuleEvaluationStatus.NEEDS_VERIFICATION,
            f"Field '{rule.field}' is missing or null on applicant profile."
        )

    expected = rule.expected_value
    op = rule.operator

    try:
        if op == RuleOperator.EQUALS.value:
            if isinstance(actual_val, str) and isinstance(expected, str):
                match = actual_val.strip().lower() == expected.strip().lower()
            else:
                match = actual_val == expected
            return (
                RuleEvaluationStatus.SATISFIED if match else RuleEvaluationStatus.NOT_SATISFIED,
                f"Evaluated '{rule.field}' ({actual_val}) EQUALS '{expected}': {match}"
            )

        elif op == RuleOperator.NOT_EQUALS.value:
            if isinstance(actual_val, str) and isinstance(expected, str):
                match = actual_val.strip().lower() != expected.strip().lower()
            else:
                match = actual_val != expected
            return (
                RuleEvaluationStatus.SATISFIED if match else RuleEvaluationStatus.NOT_SATISFIED,
                f"Evaluated '{rule.field}' ({actual_val}) NOT_EQUALS '{expected}': {match}"
            )

        elif op == RuleOperator.IN.value:
            if not isinstance(expected, (list, tuple, set)):
                return (
                    RuleEvaluationStatus.NEEDS_VERIFICATION,
                    f"Operator IN requires expected_value to be a list, got {type(expected).__name__}."
                )
            if isinstance(actual_val, str):
                expected_normalized = [str(x).strip().lower() for x in expected]
                match = actual_val.strip().lower() in expected_normalized
            else:
                match = actual_val in expected
            return (
                RuleEvaluationStatus.SATISFIED if match else RuleEvaluationStatus.NOT_SATISFIED,
                f"Evaluated '{rule.field}' ({actual_val}) IN {expected}: {match}"
            )

        elif op == RuleOperator.NOT_IN.value:
            if not isinstance(expected, (list, tuple, set)):
                return (
                    RuleEvaluationStatus.NEEDS_VERIFICATION,
                    f"Operator NOT_IN requires expected_value to be a list."
                )
            if isinstance(actual_val, str):
                expected_normalized = [str(x).strip().lower() for x in expected]
                match = actual_val.strip().lower() not in expected_normalized
            else:
                match = actual_val not in expected
            return (
                RuleEvaluationStatus.SATISFIED if match else RuleEvaluationStatus.NOT_SATISFIED,
                f"Evaluated '{rule.field}' ({actual_val}) NOT_IN {expected}: {match}"
            )

        elif op in (RuleOperator.GTE.value, RuleOperator.LTE.value, RuleOperator.GT.value, RuleOperator.LT.value):
            try:
                num_actual = float(actual_val)
                num_expected = float(expected)
            except (ValueError, TypeError):
                return (
                    RuleEvaluationStatus.NEEDS_VERIFICATION,
                    f"Cannot numerically compare '{rule.field}' ({actual_val}) with '{expected}'."
                )

            if op == RuleOperator.GTE.value:
                match = num_actual >= num_expected
            elif op == RuleOperator.LTE.value:
                match = num_actual <= num_expected
            elif op == RuleOperator.GT.value:
                match = num_actual > num_expected
            else:  # LT
                match = num_actual < num_expected

            return (
                RuleEvaluationStatus.SATISFIED if match else RuleEvaluationStatus.NOT_SATISFIED,
                f"Evaluated '{rule.field}' ({num_actual}) {op} {num_expected}: {match}"
            )

        elif op == RuleOperator.CONTAINS.value:
            if isinstance(actual_val, (list, tuple, set)):
                match = expected in actual_val
            elif isinstance(actual_val, str) and isinstance(expected, str):
                match = expected.strip().lower() in actual_val.strip().lower()
            else:
                match = False
            return (
                RuleEvaluationStatus.SATISFIED if match else RuleEvaluationStatus.NOT_SATISFIED,
                f"Evaluated '{rule.field}' ({actual_val}) CONTAINS '{expected}': {match}"
            )

        else:
            return (
                RuleEvaluationStatus.NEEDS_VERIFICATION,
                f"Unsupported operator '{op}'."
            )

    except Exception as exc:
        return (
            RuleEvaluationStatus.NEEDS_VERIFICATION,
            f"Error during rule evaluation: {str(exc)}"
        )


def evaluate_requirement_rules(
    requirement: Requirement,
    rules: List[RequirementRule],
    profile: ApplicantProfile,
) -> Dict[str, Any]:
    """
    Deterministically evaluates all rules associated with a requirement using the
    requirement's rule_combination_logic (ALL or ANY).
    Returns an evaluation result structure. Does NOT modify requirement lifecycle state.
    """
    if not rules:
        return {
            "requirement_id": requirement.id,
            "requirement_code": requirement.code,
            "combination_logic": requirement.rule_combination_logic,
            "overall_status": RuleEvaluationStatus.NEEDS_VERIFICATION.value,
            "rule_count": 0,
            "evaluations": [],
            "message": "No machine-evaluable rules defined for this requirement."
        }

    evaluations = []
    statuses = []

    for rule in rules:
        status, msg = evaluate_single_rule(rule, profile)
        evaluations.append({
            "rule_id": rule.id,
            "field": rule.field,
            "operator": rule.operator,
            "expected_value": rule.expected_value,
            "status": status.value,
            "message": msg
        })
        statuses.append(status)

    combination = requirement.rule_combination_logic or RuleCombinationLogic.ALL.value

    if combination == RuleCombinationLogic.ANY.value:
        # If any rule is SATISFIED, requirement rules are satisfied
        if any(s == RuleEvaluationStatus.SATISFIED for s in statuses):
            overall = RuleEvaluationStatus.SATISFIED
        elif all(s == RuleEvaluationStatus.NOT_SATISFIED for s in statuses):
            overall = RuleEvaluationStatus.NOT_SATISFIED
        else:
            overall = RuleEvaluationStatus.NEEDS_VERIFICATION
    else:  # Default ALL
        # All must be SATISFIED
        if all(s == RuleEvaluationStatus.SATISFIED for s in statuses):
            overall = RuleEvaluationStatus.SATISFIED
        elif any(s == RuleEvaluationStatus.NOT_SATISFIED for s in statuses):
            overall = RuleEvaluationStatus.NOT_SATISFIED
        else:
            overall = RuleEvaluationStatus.NEEDS_VERIFICATION

    return {
        "requirement_id": requirement.id,
        "requirement_code": requirement.code,
        "combination_logic": combination,
        "overall_status": overall.value,
        "rule_count": len(rules),
        "evaluations": evaluations,
        "message": f"Evaluated {len(rules)} rules with logic {combination} -> {overall.value}"
    }
