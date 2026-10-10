import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveMetricBarModel,
  getStatusConfig,
  isRequirementActiveBlocker,
  formatVerificationMode,
  formatCategory,
  formatBlockingStages,
  filterRequirements,
  REQUIREMENT_STATUSES,
} from '../src/components/matrixModel.js';

// Canonical 8 FSSAI baseline mock fixtures (reflecting backend read model)
const CANONICAL_FSSAI_AGGREGATE = {
  active_gate: 'JOINING',
  progress: {
    total_count: 8,
    resolved_count: 4,
    verified_count: 4,
    needs_verification_count: 2,
    missing_count: 2,
    in_progress_count: 0,
    evidence_received_count: 0,
    rejected_count: 0,
    display_progress: '4 of 8 requirements resolved',
  },
  gate_readiness: {
    gate: 'JOINING',
    is_ready: false,
    status: 'NOT_READY',
    active_blockers: [
      {
        requirement_id: 'req-07',
        code: 'FSSAI-REQ-07',
        title: 'College NOC',
        state: 'MISSING',
        verification_mode: 'HUMAN_CONFIRMATION',
        reason: 'College NOC is missing and required before JOINING.',
      },
      {
        requirement_id: 'req-08',
        code: 'FSSAI-REQ-08',
        title: 'Character Certificate',
        state: 'MISSING',
        verification_mode: 'HUMAN_CONFIRMATION',
        reason: 'Character Certificate is missing and required before JOINING.',
      },
    ],
    blocking_total: 2,
    blocking_satisfied: 0,
    blocking_unresolved: 2,
  },
  requirements: [
    {
      id: 'req-01',
      code: 'FSSAI-REQ-01',
      title: 'B.Tech Information Technology',
      description: 'Must be enrolled in or completed a recognized degree.',
      category: 'ELIGIBILITY',
      blocking_stages: ['APPLICATION_SUBMISSION'],
      verification_mode: 'AUTOMATED_EVALUATION',
      state: 'VERIFIED',
    },
    {
      id: 'req-02',
      code: 'FSSAI-REQ-02',
      title: '3rd Year',
      description: 'Candidate must have completed at least 2nd year.',
      category: 'ELIGIBILITY',
      blocking_stages: ['APPLICATION_SUBMISSION'],
      verification_mode: 'AUTOMATED_EVALUATION',
      state: 'VERIFIED',
    },
    {
      id: 'req-03',
      code: 'FSSAI-REQ-03',
      title: 'Full-time study',
      description: 'Enrolled as a full-time regular student.',
      category: 'ELIGIBILITY',
      blocking_stages: ['APPLICATION_SUBMISSION'],
      verification_mode: 'AUTOMATED_EVALUATION',
      state: 'VERIFIED',
    },
    {
      id: 'req-04',
      code: 'FSSAI-REQ-04',
      title: 'Academic qualification',
      description: 'Degree program in technology, science, or allied fields.',
      category: 'ELIGIBILITY',
      blocking_stages: ['APPLICATION_SUBMISSION'],
      verification_mode: 'AUTOMATED_EVALUATION',
      state: 'VERIFIED',
    },
    {
      id: 'req-05',
      code: 'FSSAI-REQ-05',
      title: 'Recognized institute',
      description: 'Institution must be approved under UGC/AICTE.',
      category: 'DOCUMENTATION',
      blocking_stages: ['APPLICATION_SUBMISSION'],
      verification_mode: 'HUMAN_CONFIRMATION',
      state: 'NEEDS_VERIFICATION',
    },
    {
      id: 'req-06',
      code: 'FSSAI-REQ-06',
      title: 'Personal laptop',
      description: 'Interns must possess personal laptop for duty.',
      category: 'PREREQUISITE',
      blocking_stages: ['COMPLETION'],
      verification_mode: 'HUMAN_CONFIRMATION',
      state: 'NEEDS_VERIFICATION',
    },
    {
      id: 'req-07',
      code: 'req-07',
      title: 'College NOC',
      description: 'No Objection Certificate from Head of Institution.',
      category: 'DOCUMENTATION',
      blocking_stages: ['JOINING'],
      verification_mode: 'HUMAN_CONFIRMATION',
      state: 'MISSING',
    },
    {
      id: 'req-08',
      code: 'req-08',
      title: 'Character Certificate',
      description: 'Certificate of good conduct issued by college.',
      category: 'CONDUCT',
      blocking_stages: ['JOINING'],
      verification_mode: 'HUMAN_CONFIRMATION',
      state: 'MISSING',
    },
  ],
};

// ============================================================================
// 1. MetricBar Tests
// ============================================================================

test('MetricBar - No-data state outputs neutral placeholders', () => {
  const model = deriveMetricBarModel(null, 'JOINING');

  assert.equal(model.hasData, false);
  assert.equal(model.total, '—');
  assert.equal(model.resolved, '—');
  assert.equal(model.verified, '—');
  assert.equal(model.needsVerification, '—');
  assert.equal(model.missing, '—');
  assert.equal(model.activeBlockers, '—');
  assert.equal(model.activeGate, 'JOINING');
  assert.equal(model.displayProgress, null);
});

test('MetricBar - Backend-provided metrics match canonical FSSAI baseline', () => {
  const model = deriveMetricBarModel(CANONICAL_FSSAI_AGGREGATE, 'JOINING');

  assert.equal(model.hasData, true);
  assert.equal(model.total, 8);
  assert.equal(model.resolved, 4);
  assert.equal(model.verified, 4);
  assert.equal(model.needsVerification, 2);
  assert.equal(model.missing, 2);
  assert.equal(model.activeBlockers, 2);
  assert.equal(model.activeGate, 'JOINING');
  assert.equal(model.displayProgress, '4 of 8 requirements resolved');
});

test('MetricBar - Dynamic update after requirement verification (5 resolved, 1 blocker)', () => {
  const mutatedAggregate = {
    ...CANONICAL_FSSAI_AGGREGATE,
    progress: {
      ...CANONICAL_FSSAI_AGGREGATE.progress,
      resolved_count: 5,
      verified_count: 5,
      missing_count: 1,
      display_progress: '5 of 8 requirements resolved',
    },
    gate_readiness: {
      ...CANONICAL_FSSAI_AGGREGATE.gate_readiness,
      active_blockers: [CANONICAL_FSSAI_AGGREGATE.gate_readiness.active_blockers[1]], // only character certificate
      blocking_satisfied: 1,
      blocking_unresolved: 1,
    },
  };

  const model = deriveMetricBarModel(mutatedAggregate, 'JOINING');

  assert.equal(model.total, 8);
  assert.equal(model.resolved, 5);
  assert.equal(model.verified, 5);
  assert.equal(model.missing, 1);
  assert.equal(model.activeBlockers, 1);
  assert.equal(model.displayProgress, '5 of 8 requirements resolved');
});

// ============================================================================
// 2. StatusBadge Tests
// ============================================================================

test('StatusBadge - Maps all required lifecycle states to distinct readable text and CSS classes', () => {
  const verified = getStatusConfig(REQUIREMENT_STATUSES.VERIFIED);
  assert.equal(verified.label, 'Verified');
  assert.equal(verified.className, 'badge-verified');

  const needsVerification = getStatusConfig(REQUIREMENT_STATUSES.NEEDS_VERIFICATION);
  assert.equal(needsVerification.label, 'Needs Verification');
  assert.equal(needsVerification.className, 'badge-needs-verification');

  const missing = getStatusConfig(REQUIREMENT_STATUSES.MISSING);
  assert.equal(missing.label, 'Missing');
  assert.equal(missing.className, 'badge-missing');

  const inProgress = getStatusConfig(REQUIREMENT_STATUSES.IN_PROGRESS);
  assert.equal(inProgress.label, 'In Progress');
  assert.equal(inProgress.className, 'badge-in-progress');

  const evidenceReceived = getStatusConfig(REQUIREMENT_STATUSES.EVIDENCE_RECEIVED);
  assert.equal(evidenceReceived.label, 'Evidence Received');
  assert.equal(evidenceReceived.className, 'badge-evidence-received');

  const rejected = getStatusConfig(REQUIREMENT_STATUSES.REJECTED);
  assert.equal(rejected.label, 'Rejected');
  assert.equal(rejected.className, 'badge-rejected');
});

test('StatusBadge - Gracefully handles undefined/null state', () => {
  const fallback = getStatusConfig(null);
  assert.equal(fallback.label, '—');
  assert.equal(fallback.className, 'badge-neutral');
});

// ============================================================================
// 3. RequirementCard & Blocker Semantics Tests
// ============================================================================

test('RequirementCard - Correctly identifies active blockers for current gate', () => {
  const gateReadiness = CANONICAL_FSSAI_AGGREGATE.gate_readiness;

  // College NOC (req-07) is in active_blockers
  const nocReq = CANONICAL_FSSAI_AGGREGATE.requirements.find((r) => r.id === 'req-07');
  assert.equal(isRequirementActiveBlocker(nocReq, gateReadiness), true);

  // Character Certificate (req-08) is in active_blockers
  const charReq = CANONICAL_FSSAI_AGGREGATE.requirements.find((r) => r.id === 'req-08');
  assert.equal(isRequirementActiveBlocker(charReq, gateReadiness), true);

  // B.Tech (req-01) is verified, NOT a blocker
  const btechReq = CANONICAL_FSSAI_AGGREGATE.requirements.find((r) => r.id === 'req-01');
  assert.equal(isRequirementActiveBlocker(btechReq, gateReadiness), false);

  // Laptop (req-06) blocks COMPLETION, not JOINING, so NOT in active_blockers
  const laptopReq = CANONICAL_FSSAI_AGGREGATE.requirements.find((r) => r.id === 'req-06');
  assert.equal(isRequirementActiveBlocker(laptopReq, gateReadiness), false);
});

test('RequirementCard - Human-friendly metadata projection', () => {
  assert.equal(formatVerificationMode('HUMAN_CONFIRMATION'), 'Human Confirmation');
  assert.equal(formatVerificationMode('AUTOMATED_EVALUATION'), 'Automated Engine');
  assert.equal(formatCategory('DOCUMENTATION'), 'Documentation');
  assert.equal(formatCategory('ELIGIBILITY'), 'Eligibility');
  assert.equal(formatBlockingStages(['JOINING']), 'Joining');
  assert.equal(
    formatBlockingStages(['APPLICATION_SUBMISSION', 'JOINING']),
    'Application Submission, Joining'
  );
});

// ============================================================================
// 4. RequirementList Filtering & Selection Tests
// ============================================================================

test('RequirementList - Renders all 8 requirements when filter is ALL', () => {
  const filtered = filterRequirements(CANONICAL_FSSAI_AGGREGATE.requirements, {
    statusFilter: 'ALL',
    categoryFilter: 'ALL',
  });
  assert.equal(filtered.length, 8);
});

test('RequirementList - Filters correctly by status without mutating data', () => {
  const verified = filterRequirements(CANONICAL_FSSAI_AGGREGATE.requirements, {
    statusFilter: 'VERIFIED',
  });
  assert.equal(verified.length, 4);
  assert.ok(verified.every((r) => r.state === 'VERIFIED'));

  const needsVer = filterRequirements(CANONICAL_FSSAI_AGGREGATE.requirements, {
    statusFilter: 'NEEDS_VERIFICATION',
  });
  assert.equal(needsVer.length, 2);
  assert.ok(needsVer.every((r) => r.state === 'NEEDS_VERIFICATION'));

  const missing = filterRequirements(CANONICAL_FSSAI_AGGREGATE.requirements, {
    statusFilter: 'MISSING',
  });
  assert.equal(missing.length, 2);
  assert.ok(missing.every((r) => r.state === 'MISSING'));
});

test('RequirementList - Filters correctly by category', () => {
  const eligibility = filterRequirements(CANONICAL_FSSAI_AGGREGATE.requirements, {
    categoryFilter: 'ELIGIBILITY',
  });
  assert.equal(eligibility.length, 4);

  const documentation = filterRequirements(CANONICAL_FSSAI_AGGREGATE.requirements, {
    categoryFilter: 'DOCUMENTATION',
  });
  assert.equal(documentation.length, 2);

  const conduct = filterRequirements(CANONICAL_FSSAI_AGGREGATE.requirements, {
    categoryFilter: 'CONDUCT',
  });
  assert.equal(conduct.length, 1);
  assert.equal(conduct[0].title, 'Character Certificate');
});

test('RequirementList - Filters by search query across code, title, and description', () => {
  const queryNoc = filterRequirements(CANONICAL_FSSAI_AGGREGATE.requirements, {
    searchQuery: 'NOC',
  });
  assert.equal(queryNoc.length, 1);
  assert.equal(queryNoc[0].title, 'College NOC');

  const queryLaptop = filterRequirements(CANONICAL_FSSAI_AGGREGATE.requirements, {
    searchQuery: 'laptop',
  });
  assert.equal(queryLaptop.length, 1);
  assert.equal(queryLaptop[0].title, 'Personal laptop');
});
