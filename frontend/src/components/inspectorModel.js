/**
 * Pure projection models and formatting helpers for Milestone 5:
 * Requirement Inspector & Policy Traceability.
 */

/**
 * Derives presentation model for policy source citation.
 * Handles missing/partial citations gracefully.
 */
export function deriveSourceCitationModel(citation) {
  if (!citation || typeof citation !== 'object') {
    return {
      hasCitation: false,
      section: null,
      page: null,
      pageLabel: null,
      quote: null,
      confidenceScore: null,
      fallbackMessage: 'Source citation unavailable for this requirement.',
    };
  }

  const section = citation.section ? String(citation.section).trim() : null;
  const page = typeof citation.page === 'number' || typeof citation.page === 'string'
    ? citation.page
    : null;
  const quote = citation.quote ? String(citation.quote).trim() : null;
  const hasContent = Boolean(section || page !== null || quote);

  if (!hasContent) {
    return {
      hasCitation: false,
      section: null,
      page: null,
      pageLabel: null,
      quote: null,
      confidenceScore: null,
      fallbackMessage: 'Source citation unavailable for this requirement.',
    };
  }

  return {
    hasCitation: true,
    section: section || 'Unspecified Section',
    page,
    pageLabel: page !== null ? `Page ${page}` : null,
    quote,
    confidenceScore:
      typeof citation.confidence_score === 'number'
        ? Math.round(citation.confidence_score * 100)
        : null,
    fallbackMessage: null,
  };
}

/**
 * Maps field identifiers to human-readable labels.
 */
export function formatRuleField(field) {
  if (!field) return 'Field';
  const normalized = String(field).toLowerCase();
  switch (normalized) {
    case 'cgpa':
      return 'CGPA';
    case 'year_of_study':
      return 'Year of Study';
    case 'degree':
      return 'Degree Program';
    case 'enrollment_type':
      return 'Enrollment Type';
    case 'institute_recognized':
      return 'Institute Accreditation';
    default:
      return String(field)
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

/**
 * Maps rule operators to mathematical/institutional symbols.
 */
export function formatRuleOperator(operator) {
  if (!operator) return '=';
  const op = String(operator).toUpperCase();
  switch (op) {
    case 'EQUALS':
    case 'EQ':
      return '=';
    case 'GTE':
      return '≥';
    case 'LTE':
      return '≤';
    case 'GT':
      return '>';
    case 'LT':
      return '<';
    case 'IN':
      return '∈ (One of)';
    case 'NOT_EQUALS':
    case 'NEQ':
      return '≠';
    case 'CONTAINS':
      return 'Contains';
    default:
      return op;
  }
}

/**
 * Formats expected value for clean display.
 */
export function formatRuleExpectedValue(val) {
  if (val === null || val === undefined) {
    return 'Not specified';
  }
  if (Array.isArray(val)) {
    return val.join(', ');
  }
  if (typeof val === 'boolean') {
    return val ? 'True' : 'False';
  }
  if (val === 'FULL_TIME') {
    return 'Full-Time';
  }
  return String(val);
}

/**
 * Derives presentation model for automated rule evaluation conditions.
 */
export function deriveRulesModel(rules) {
  if (!rules || !Array.isArray(rules) || rules.length === 0) {
    return {
      hasRules: false,
      rules: [],
      fallbackMessage:
        'No automated evaluation rules defined. This requirement is evaluated via institutional documentation or reviewer confirmation.',
    };
  }

  const formattedRules = rules.map((r) => {
    const isSatisfied = String(r.evaluation_status).toUpperCase() === 'SATISFIED';
    const isFailed = String(r.evaluation_status).toUpperCase() === 'FAILED';
    const isPending =
      !r.evaluation_status ||
      String(r.evaluation_status).toUpperCase() === 'NEEDS_VERIFICATION' ||
      String(r.evaluation_status).toUpperCase() === 'PENDING';

    return {
      id: r.id || String(Math.random()),
      field: r.field || 'unknown',
      fieldLabel: formatRuleField(r.field),
      operator: r.operator || 'EQUALS',
      operatorSymbol: formatRuleOperator(r.operator),
      expectedValue: formatRuleExpectedValue(r.expected_value),
      evaluationStatus: r.evaluation_status || 'PENDING',
      evaluationMessage: r.evaluation_message || null,
      isSatisfied,
      isFailed,
      isPending,
    };
  });

  return {
    hasRules: true,
    rules: formattedRules,
    fallbackMessage: null,
  };
}

/**
 * Derives presentation model for blocking impact on stage gates.
 */
export function deriveBlockingImpactModel(requirement, gateReadiness, activeGate = 'JOINING') {
  if (!requirement) {
    return {
      isBlocker: false,
      stagesFormatted: null,
      statusLabel: 'Not a current blocker',
      reason: null,
      activeGate,
    };
  }

  const stages = requirement.blocking_stages;
  const stagesFormatted =
    Array.isArray(stages) && stages.length > 0
      ? stages
          .map((s) =>
            String(s)
              .replace(/_/g, ' ')
              .toLowerCase()
              .replace(/\b\w/g, (c) => c.toUpperCase())
          )
          .join(', ')
      : 'None specified';

  const blockers = gateReadiness?.active_blockers;
  let matchingBlocker = null;

  if (Array.isArray(blockers)) {
    matchingBlocker = blockers.find(
      (b) =>
        (b.requirement_id && b.requirement_id === requirement.id) ||
        (b.code && b.code === requirement.code)
    );
  }

  const isBlocker = Boolean(matchingBlocker);
  const targetGate = gateReadiness?.gate || activeGate;

  return {
    isBlocker,
    stagesFormatted,
    statusLabel: isBlocker
      ? `Active blocker for ${targetGate} gate`
      : 'Not a current blocker',
    blockerCallout: isBlocker ? `BLOCKING ${targetGate.toUpperCase()}` : null,
    reason: matchingBlocker?.reason || null,
    activeGate: targetGate,
  };
}
