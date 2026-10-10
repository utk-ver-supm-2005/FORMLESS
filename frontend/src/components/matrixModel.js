/**
 * Pure model and projection helpers for Milestone 4 (Metrics & Requirement Matrix).
 * Decoupled from React DOM for 100% testability under Node's native test runner.
 */

export const REQUIREMENT_STATUSES = {
  VERIFIED: 'VERIFIED',
  NEEDS_VERIFICATION: 'NEEDS_VERIFICATION',
  MISSING: 'MISSING',
  IN_PROGRESS: 'IN_PROGRESS',
  EVIDENCE_RECEIVED: 'EVIDENCE_RECEIVED',
  REJECTED: 'REJECTED',
};

export const STATUS_CONFIG = {
  VERIFIED: {
    label: 'Verified',
    className: 'badge-verified',
    description: 'Criteria satisfied and certified',
  },
  NEEDS_VERIFICATION: {
    label: 'Needs Verification',
    className: 'badge-needs-verification',
    description: 'Requires human or external authority verification',
  },
  MISSING: {
    label: 'Missing',
    className: 'badge-missing',
    description: 'Mandatory requirement not yet submitted',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    className: 'badge-in-progress',
    description: 'Action initiated, awaiting documentation',
  },
  EVIDENCE_RECEIVED: {
    label: 'Evidence Received',
    className: 'badge-evidence-received',
    description: 'Evidence submitted, pending reviewer evaluation',
  },
  REJECTED: {
    label: 'Rejected',
    className: 'badge-rejected',
    description: 'Submitted evidence rejected with feedback',
  },
};

/**
 * Returns label and CSS class for a given requirement status.
 */
export function getStatusConfig(state) {
  if (!state) {
    return {
      label: '—',
      className: 'badge-neutral',
      description: 'Unknown state',
    };
  }
  const normalized = String(state).toUpperCase();
  return (
    STATUS_CONFIG[normalized] || {
      label: normalized.replace(/_/g, ' '),
      className: 'badge-neutral',
      description: 'Custom state',
    }
  );
}

/**
 * Derives view model for MetricBar from backend aggregate.
 * Does NOT perform calculations; reads authoritative backend values only.
 */
export function deriveMetricBarModel(aggregate, activeGate = 'JOINING') {
  if (!aggregate) {
    return {
      hasData: false,
      total: '—',
      resolved: '—',
      verified: '—',
      needsVerification: '—',
      missing: '—',
      activeBlockers: '—',
      activeGate,
      displayProgress: null,
    };
  }

  const progress = aggregate.progress;
  const gateReadiness = aggregate.gate_readiness;

  // Active blockers count from backend gate readiness or aggregate
  let blockerCount = '—';
  if (gateReadiness?.active_blockers && Array.isArray(gateReadiness.active_blockers)) {
    blockerCount = gateReadiness.active_blockers.length;
  } else if (typeof gateReadiness?.blocking_unresolved === 'number') {
    blockerCount = gateReadiness.blocking_unresolved;
  } else if (aggregate.active_blockers && Array.isArray(aggregate.active_blockers)) {
    blockerCount = aggregate.active_blockers.length;
  }

  return {
    hasData: Boolean(progress),
    total: typeof progress?.total_count === 'number' ? progress.total_count : '—',
    resolved: typeof progress?.resolved_count === 'number' ? progress.resolved_count : '—',
    verified: typeof progress?.verified_count === 'number' ? progress.verified_count : '—',
    needsVerification:
      typeof progress?.needs_verification_count === 'number'
        ? progress.needs_verification_count
        : '—',
    missing: typeof progress?.missing_count === 'number' ? progress.missing_count : '—',
    activeBlockers: blockerCount,
    activeGate: gateReadiness?.gate || activeGate,
    displayProgress: progress?.display_progress || null,
  };
}

/**
 * Checks if a requirement is identified by the backend as an active blocker for the gate.
 */
export function isRequirementActiveBlocker(requirement, gateReadiness) {
  if (!requirement || !gateReadiness?.active_blockers) {
    return false;
  }

  const blockers = gateReadiness.active_blockers;
  if (!Array.isArray(blockers)) {
    return false;
  }

  return blockers.some((b) => {
    if (b.requirement_id && requirement.id && b.requirement_id === requirement.id) {
      return true;
    }
    if (b.code && requirement.code && b.code === requirement.code) {
      return true;
    }
    return false;
  });
}

/**
 * Formats verification mode into friendly human label.
 */
export function formatVerificationMode(mode) {
  if (!mode) return 'Standard';
  switch (String(mode).toUpperCase()) {
    case 'HUMAN_CONFIRMATION':
      return 'Human Confirmation';
    case 'AUTOMATED_EVALUATION':
      return 'Automated Engine';
    case 'INSTITUTE_REGISTRY':
      return 'Institutional Registry';
    case 'SYSTEM':
      return 'System Evaluation';
    default:
      return String(mode)
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

/**
 * Formats category code into readable title case.
 */
export function formatCategory(category) {
  if (!category) return 'General';
  return String(category)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Formats blocking stages list for display.
 */
export function formatBlockingStages(stages) {
  if (!stages || !Array.isArray(stages) || stages.length === 0) {
    return null;
  }
  return stages
    .map((s) =>
      String(s)
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase())
    )
    .join(', ');
}

/**
 * Pure presentational filter for requirements list.
 * Never mutates state or recalculates requirement statuses.
 */
export function filterRequirements(
  requirements,
  { statusFilter = 'ALL', categoryFilter = 'ALL', searchQuery = '' } = {}
) {
  if (!requirements || !Array.isArray(requirements)) {
    return [];
  }

  return requirements.filter((req) => {
    // 1. Status Filter
    if (statusFilter && statusFilter !== 'ALL') {
      const targetState = String(statusFilter).toUpperCase();
      if (String(req.state).toUpperCase() !== targetState) {
        return false;
      }
    }

    // 2. Category Filter
    if (categoryFilter && categoryFilter !== 'ALL') {
      const targetCat = String(categoryFilter).toUpperCase();
      if (String(req.category).toUpperCase() !== targetCat) {
        return false;
      }
    }

    // 3. Search Query (Case-insensitive across code, title, and description)
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      const codeMatch = req.code?.toLowerCase().includes(query);
      const titleMatch = req.title?.toLowerCase().includes(query);
      const descMatch = req.description?.toLowerCase().includes(query);
      if (!codeMatch && !titleMatch && !descMatch) {
        return false;
      }
    }

    return true;
  });
}
