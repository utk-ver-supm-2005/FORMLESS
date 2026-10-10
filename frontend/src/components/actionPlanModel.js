/**
 * Pure data models and projection helpers for Milestone 7: Action Plan & Blockers.
 * Decoupled from React DOM for 100% testability under Node's native test runner.
 *
 * Source of Truth:
 * - ApplicationContext.aggregate (exclusively backend-derived read model)
 *
 * Strictly performs presentation-only grouping; never calculates readiness,
 * blocker semantics, or verified counts locally.
 */

export const ACTION_PLAN_GROUPS = {
  BLOCKING: 'BLOCKING',
  NEEDS_VERIFICATION: 'NEEDS_VERIFICATION',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
};

export const GROUP_CONFIG = {
  BLOCKING: {
    key: 'BLOCKING',
    title: 'BLOCKING / ACTION REQUIRED',
    description: 'Active obstacles preventing stage-gate approval. Immediate resolution required.',
    emptyMessage: 'No active blockers.',
    badgeClass: 'badge-missing',
    cardVariant: 'card-blocking',
  },
  NEEDS_VERIFICATION: {
    key: 'NEEDS_VERIFICATION',
    title: 'NEEDS VERIFICATION',
    description: 'Criteria awaiting human or institutional officer confirmation.',
    emptyMessage: 'No requirements awaiting verification.',
    badgeClass: 'badge-needs-verification',
    cardVariant: 'card-attention',
  },
  IN_PROGRESS: {
    key: 'IN_PROGRESS',
    title: 'IN PROGRESS',
    description: 'Active items in lifecycle progression (in progress, evidence received, or awaiting revision).',
    emptyMessage: 'No items currently in progress.',
    badgeClass: 'badge-in-progress',
    cardVariant: 'card-in-progress',
  },
  COMPLETED: {
    key: 'COMPLETED',
    title: 'COMPLETED',
    description: 'Certified criteria satisfied and permanently locked for compliance.',
    emptyMessage: 'Nothing completed yet.',
    badgeClass: 'badge-verified',
    cardVariant: 'card-completed',
  },
};

/**
 * Returns action cue text based on requirement group and active gate.
 */
export function getActionCue(state, isBlocker, activeGate = 'JOINING') {
  if (isBlocker) {
    return `Resolve this before ${activeGate}.`;
  }
  const normalized = String(state || '').toUpperCase();
  switch (normalized) {
    case 'NEEDS_VERIFICATION':
      return 'Verification required.';
    case 'IN_PROGRESS':
      return 'Awaiting evidence or confirmation.';
    case 'EVIDENCE_RECEIVED':
      return 'Evidence submitted, pending review.';
    case 'REJECTED':
      return 'Correction or replacement evidence required.';
    case 'VERIFIED':
      return 'Requirement verified.';
    case 'MISSING':
      return 'Action required.';
    default:
      return 'Review requirement details.';
  }
}

/**
 * Derives the Action Plan view model from authoritative backend aggregate.
 * Strictly presentation-only grouping without local arithmetic.
 *
 * Prioritizes:
 * 1. Requirements blocking the active gate (gate_readiness.active_blockers)
 * 2. Requirements needing verification (NEEDS_VERIFICATION)
 * 3. Requirements currently in progress (IN_PROGRESS, EVIDENCE_RECEIVED, REJECTED)
 * 4. Completed requirements (VERIFIED)
 */
export function deriveActionPlanModel(aggregate, activeGate = 'JOINING') {
  if (!aggregate) {
    return {
      hasData: false,
      activeGate,
      groups: {
        BLOCKING: [],
        NEEDS_VERIFICATION: [],
        IN_PROGRESS: [],
        COMPLETED: [],
      },
      counts: {
        blocking: 0,
        needsVerification: 0,
        inProgress: 0,
        completed: 0,
        total: 0,
      },
    };
  }

  const requirements = Array.isArray(aggregate.requirements) ? aggregate.requirements : [];
  const gateReadiness = aggregate.gate_readiness || null;
  const currentGate = gateReadiness?.gate || aggregate.active_gate || activeGate;

  // 1. Group A: BLOCKING / ACTION REQUIRED
  // Authoritative blockers strictly from backend gate_readiness.active_blockers
  const backendBlockers = Array.isArray(gateReadiness?.active_blockers)
    ? gateReadiness.active_blockers
    : Array.isArray(aggregate.active_blockers)
    ? aggregate.active_blockers
    : [];

  const blockerRequirementIds = new Set(
    backendBlockers.map((b) => b.requirement_id || b.id).filter(Boolean)
  );

  const blockingItems = backendBlockers.map((blocker) => {
    const reqId = blocker.requirement_id || blocker.id;
    const req = requirements.find((r) => r.id === reqId) || {};
    return {
      id: reqId || req.id,
      code: blocker.code || req.code || '—',
      title: blocker.title || req.title || 'Untitled Requirement',
      state: req.state || blocker.state || 'MISSING',
      category: req.category || null,
      verificationMode: req.verification_mode || blocker.verification_mode || null,
      blockedStage: currentGate,
      reason: blocker.reason || `${blocker.title || req.title} is required before ${currentGate}.`,
      actionCue: `Resolve this before ${currentGate}.`,
      isBlocker: true,
      originalRequirement: req,
    };
  });

  // 2. Group B: NEEDS VERIFICATION
  // Requirements in state NEEDS_VERIFICATION that are not already listed as active gate blockers
  const needsVerificationItems = requirements
    .filter((r) => r.state === 'NEEDS_VERIFICATION' && !blockerRequirementIds.has(r.id))
    .map((r) => ({
      id: r.id,
      code: r.code,
      title: r.title,
      state: r.state,
      category: r.category,
      verificationMode: r.verification_mode,
      blockedStage: null,
      reason: 'Requires officer verification rather than automated satisfaction.',
      actionCue: 'Verification required.',
      isBlocker: false,
      originalRequirement: r,
    }));

  // 3. Group C: IN PROGRESS
  // Requirements in state IN_PROGRESS, EVIDENCE_RECEIVED, or REJECTED that are not active gate blockers
  // (Note: If an item is in progress but NOT an active blocker for this gate, or when displaying in-progress work)
  const inProgressItems = requirements
    .filter(
      (r) =>
        (r.state === 'IN_PROGRESS' || r.state === 'EVIDENCE_RECEIVED' || r.state === 'REJECTED') &&
        !blockerRequirementIds.has(r.id)
    )
    .map((r) => ({
      id: r.id,
      code: r.code,
      title: r.title,
      state: r.state,
      category: r.category,
      verificationMode: r.verification_mode,
      blockedStage: null,
      reason: r.rejection_reason || 'Lifecycle action initiated; awaiting substantiating records.',
      actionCue: getActionCue(r.state, false, currentGate),
      isBlocker: false,
      originalRequirement: r,
    }));

  // 4. Group D: COMPLETED
  // Requirements in state VERIFIED
  const completedItems = requirements
    .filter((r) => r.state === 'VERIFIED')
    .map((r) => ({
      id: r.id,
      code: r.code,
      title: r.title,
      state: r.state,
      category: r.category,
      verificationMode: r.verification_mode,
      blockedStage: null,
      reason: r.verified_by ? `Certified by ${r.verified_by}.` : 'Requirement satisfied and certified.',
      actionCue: 'Requirement verified.',
      isBlocker: false,
      originalRequirement: r,
    }));

  return {
    hasData: true,
    activeGate: currentGate,
    groups: {
      BLOCKING: blockingItems,
      NEEDS_VERIFICATION: needsVerificationItems,
      IN_PROGRESS: inProgressItems,
      COMPLETED: completedItems,
    },
    counts: {
      blocking: blockingItems.length,
      needsVerification: needsVerificationItems.length,
      inProgress: inProgressItems.length,
      completed: completedItems.length,
      total: requirements.length,
    },
  };
}
