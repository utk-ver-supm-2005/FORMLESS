import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTION_PLAN_GROUPS,
  GROUP_CONFIG,
  getActionCue,
  deriveActionPlanModel,
} from '../src/components/actionPlanModel.js';

// ============================================================================
// Fixtures: Canonical FSSAI Baseline & Evolution States
// ============================================================================

const CANONICAL_BASELINE_AGGREGATE = {
  application: {
    id: 'app-fssai-001',
    applicant_id: 'demo_applicant_01',
    policy_name: 'FSSAI Internship Policy 2024',
  },
  active_gate: 'JOINING',
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
  requirements: [
    {
      id: 'req-01',
      code: 'FSSAI-REQ-01',
      title: 'B.Tech Information Technology',
      category: 'ELIGIBILITY',
      blocking_stages: ['APPLICATION_SUBMISSION'],
      verification_mode: 'AUTOMATED_EVALUATION',
      state: 'VERIFIED',
      verified_by: 'Automated Rule Engine',
    },
    {
      id: 'req-02',
      code: 'FSSAI-REQ-02',
      title: 'Third or Fourth Year of Study',
      category: 'ELIGIBILITY',
      blocking_stages: ['APPLICATION_SUBMISSION'],
      verification_mode: 'AUTOMATED_EVALUATION',
      state: 'VERIFIED',
      verified_by: 'Automated Rule Engine',
    },
    {
      id: 'req-03',
      code: 'FSSAI-REQ-03',
      title: 'Regular Full-Time Enrollment',
      category: 'ELIGIBILITY',
      blocking_stages: ['APPLICATION_SUBMISSION'],
      verification_mode: 'AUTOMATED_EVALUATION',
      state: 'VERIFIED',
      verified_by: 'Automated Rule Engine',
    },
    {
      id: 'req-04',
      code: 'FSSAI-REQ-04',
      title: 'Minimum 6.0 CGPA',
      category: 'ELIGIBILITY',
      blocking_stages: ['APPLICATION_SUBMISSION'],
      verification_mode: 'AUTOMATED_EVALUATION',
      state: 'VERIFIED',
      verified_by: 'Automated Rule Engine',
    },
    {
      id: 'req-05',
      code: 'FSSAI-REQ-05',
      title: 'Recognized institute',
      category: 'DOCUMENTATION',
      blocking_stages: ['APPLICATION_SUBMISSION'],
      verification_mode: 'HUMAN_CONFIRMATION',
      state: 'NEEDS_VERIFICATION',
    },
    {
      id: 'req-06',
      code: 'FSSAI-REQ-06',
      title: 'Personal laptop',
      category: 'FACILITIES',
      blocking_stages: ['APPLICATION_SUBMISSION'],
      verification_mode: 'HUMAN_CONFIRMATION',
      state: 'NEEDS_VERIFICATION',
    },
    {
      id: 'req-07',
      code: 'FSSAI-REQ-07',
      title: 'College NOC',
      category: 'DOCUMENTATION',
      blocking_stages: ['JOINING'],
      verification_mode: 'HUMAN_CONFIRMATION',
      state: 'MISSING',
    },
    {
      id: 'req-08',
      code: 'FSSAI-REQ-08',
      title: 'Character Certificate',
      category: 'DOCUMENTATION',
      blocking_stages: ['JOINING'],
      verification_mode: 'HUMAN_CONFIRMATION',
      state: 'MISSING',
    },
  ],
};

// ============================================================================
// 1. Group Constants & Action Cues
// ============================================================================

test('ActionPlanModel - Defines 4 canonical action groups with correct metadata', () => {
  assert.equal(ACTION_PLAN_GROUPS.BLOCKING, 'BLOCKING');
  assert.equal(ACTION_PLAN_GROUPS.NEEDS_VERIFICATION, 'NEEDS_VERIFICATION');
  assert.equal(ACTION_PLAN_GROUPS.IN_PROGRESS, 'IN_PROGRESS');
  assert.equal(ACTION_PLAN_GROUPS.COMPLETED, 'COMPLETED');

  assert.equal(GROUP_CONFIG.BLOCKING.title, 'BLOCKING / ACTION REQUIRED');
  assert.equal(GROUP_CONFIG.BLOCKING.emptyMessage, 'No active blockers.');
  assert.equal(GROUP_CONFIG.NEEDS_VERIFICATION.title, 'NEEDS VERIFICATION');
  assert.equal(GROUP_CONFIG.NEEDS_VERIFICATION.emptyMessage, 'No requirements awaiting verification.');
  assert.equal(GROUP_CONFIG.IN_PROGRESS.title, 'IN PROGRESS');
  assert.equal(
    GROUP_CONFIG.IN_PROGRESS.description,
    'Active items in lifecycle progression (in progress, evidence received, or awaiting revision).'
  );
  assert.equal(GROUP_CONFIG.IN_PROGRESS.emptyMessage, 'No items currently in progress.');
  assert.equal(GROUP_CONFIG.COMPLETED.title, 'COMPLETED');
  assert.equal(GROUP_CONFIG.COMPLETED.emptyMessage, 'Nothing completed yet.');
});

test('ActionPlanModel - Generates action-oriented cues by state and blocker role', () => {
  assert.equal(getActionCue('MISSING', true, 'JOINING'), 'Resolve this before JOINING.');
  assert.equal(getActionCue('NEEDS_VERIFICATION', false, 'JOINING'), 'Verification required.');
  assert.equal(getActionCue('IN_PROGRESS', false, 'JOINING'), 'Awaiting evidence or confirmation.');
  assert.equal(getActionCue('EVIDENCE_RECEIVED', false, 'JOINING'), 'Evidence submitted, pending review.');
  assert.equal(getActionCue('REJECTED', false, 'JOINING'), 'Correction or replacement evidence required.');
  assert.equal(getActionCue('VERIFIED', false, 'JOINING'), 'Requirement verified.');
});

// ============================================================================
// 2. Baseline Grouping Tests
// ============================================================================

test('ActionPlanModel - Baseline Blocker Group displays College NOC and Character Certificate', () => {
  const model = deriveActionPlanModel(CANONICAL_BASELINE_AGGREGATE, 'JOINING');
  assert.equal(model.hasData, true);
  assert.equal(model.activeGate, 'JOINING');

  const blockers = model.groups.BLOCKING;
  assert.equal(blockers.length, 2);

  const blockerCodes = blockers.map((b) => b.code);
  assert.ok(blockerCodes.includes('FSSAI-REQ-07'), 'College NOC must be in blockers');
  assert.ok(blockerCodes.includes('FSSAI-REQ-08'), 'Character Certificate must be in blockers');

  const req07 = blockers.find((b) => b.code === 'FSSAI-REQ-07');
  assert.equal(req07.title, 'College NOC');
  assert.equal(req07.state, 'MISSING');
  assert.equal(req07.blockedStage, 'JOINING');
  assert.equal(req07.reason, 'College NOC is missing and required before JOINING.');
  assert.equal(req07.actionCue, 'Resolve this before JOINING.');
  assert.equal(req07.isBlocker, true);
});

test('ActionPlanModel - Baseline Needs Verification Group displays non-blocking verification items', () => {
  const model = deriveActionPlanModel(CANONICAL_BASELINE_AGGREGATE, 'JOINING');
  const needsVer = model.groups.NEEDS_VERIFICATION;

  assert.equal(needsVer.length, 2);
  const codes = needsVer.map((item) => item.code);
  assert.ok(codes.includes('FSSAI-REQ-05'), 'Recognized institute must be in Needs Verification');
  assert.ok(codes.includes('FSSAI-REQ-06'), 'Personal laptop must be in Needs Verification');

  const req05 = needsVer.find((i) => i.code === 'FSSAI-REQ-05');
  assert.equal(req05.title, 'Recognized institute');
  assert.equal(req05.state, 'NEEDS_VERIFICATION');
  assert.equal(req05.actionCue, 'Verification required.');
  assert.equal(req05.isBlocker, false);
});

test('ActionPlanModel - Baseline In Progress Group is empty with correct count', () => {
  const model = deriveActionPlanModel(CANONICAL_BASELINE_AGGREGATE, 'JOINING');
  const inProgress = model.groups.IN_PROGRESS;

  assert.equal(inProgress.length, 0);
  assert.equal(model.counts.inProgress, 0);
});

test('ActionPlanModel - Baseline Completed Group displays 4 verified requirements', () => {
  const model = deriveActionPlanModel(CANONICAL_BASELINE_AGGREGATE, 'JOINING');
  const completed = model.groups.COMPLETED;

  assert.equal(completed.length, 4);
  assert.equal(model.counts.completed, 4);

  const codes = completed.map((i) => i.code);
  assert.ok(codes.includes('FSSAI-REQ-01'));
  assert.ok(codes.includes('FSSAI-REQ-02'));
  assert.ok(codes.includes('FSSAI-REQ-03'));
  assert.ok(codes.includes('FSSAI-REQ-04'));

  const req01 = completed.find((i) => i.code === 'FSSAI-REQ-01');
  assert.equal(req01.state, 'VERIFIED');
  assert.equal(req01.actionCue, 'Requirement verified.');
  assert.match(req01.reason, /Certified by Automated Rule Engine/);
});

// ============================================================================
// 3. Prioritization & Empty Group States
// ============================================================================

test('ActionPlanModel - Prioritizes groups in strict order: Blocking -> Needs Verification -> In Progress -> Completed', () => {
  const model = deriveActionPlanModel(CANONICAL_BASELINE_AGGREGATE, 'JOINING');
  const groupKeys = Object.keys(model.groups);

  assert.deepEqual(groupKeys, [
    ACTION_PLAN_GROUPS.BLOCKING,
    ACTION_PLAN_GROUPS.NEEDS_VERIFICATION,
    ACTION_PLAN_GROUPS.IN_PROGRESS,
    ACTION_PLAN_GROUPS.COMPLETED,
  ]);
});

test('ActionPlanModel - Clean empty state handling when no requirements or aggregate is null', () => {
  const nullModel = deriveActionPlanModel(null, 'JOINING');
  assert.equal(nullModel.hasData, false);
  assert.equal(nullModel.counts.total, 0);
  assert.equal(nullModel.counts.blocking, 0);
  assert.equal(nullModel.groups.BLOCKING.length, 0);

  const emptyAggregate = {
    requirements: [],
    gate_readiness: { gate: 'JOINING', active_blockers: [] },
  };
  const emptyModel = deriveActionPlanModel(emptyAggregate, 'JOINING');
  assert.equal(emptyModel.hasData, true);
  assert.equal(emptyModel.counts.total, 0);
  assert.equal(emptyModel.counts.blocking, 0);
  assert.equal(emptyModel.counts.needsVerification, 0);
  assert.equal(emptyModel.counts.inProgress, 0);
  assert.equal(emptyModel.counts.completed, 0);
});

// ============================================================================
// 4. Dynamic Backend-Driven Evolution Tests
// ============================================================================

test('ActionPlanModel - Dynamic update when College NOC transitions to IN_PROGRESS', () => {
  // Simulate backend aggregate after Request Requirement
  const requestedAggregate = {
    ...CANONICAL_BASELINE_AGGREGATE,
    gate_readiness: {
      ...CANONICAL_BASELINE_AGGREGATE.gate_readiness,
      active_blockers: [
        {
          requirement_id: 'req-07',
          code: 'FSSAI-REQ-07',
          title: 'College NOC',
          state: 'IN_PROGRESS',
          verification_mode: 'HUMAN_CONFIRMATION',
          reason: 'College NOC is currently in progress.',
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
    },
    requirements: CANONICAL_BASELINE_AGGREGATE.requirements.map((r) =>
      r.id === 'req-07' ? { ...r, state: 'IN_PROGRESS' } : r
    ),
  };

  const model = deriveActionPlanModel(requestedAggregate, 'JOINING');
  assert.equal(model.counts.blocking, 2);

  const req07 = model.groups.BLOCKING.find((b) => b.code === 'FSSAI-REQ-07');
  assert.ok(req07);
  assert.equal(req07.state, 'IN_PROGRESS');
  assert.equal(req07.reason, 'College NOC is currently in progress.');
});

test('ActionPlanModel - Dynamic update after College NOC is VERIFIED (Blockers 2 -> 1, College NOC moves to Completed)', () => {
  // Simulate backend aggregate after College NOC verification
  const verifiedAggregate = {
    ...CANONICAL_BASELINE_AGGREGATE,
    gate_readiness: {
      gate: 'JOINING',
      is_ready: false,
      status: 'NOT_READY',
      active_blockers: [
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
      blocking_satisfied: 1,
      blocking_unresolved: 1,
    },
    progress: {
      ...CANONICAL_BASELINE_AGGREGATE.progress,
      verified_count: 5,
      resolved_count: 5,
    },
    requirements: CANONICAL_BASELINE_AGGREGATE.requirements.map((r) =>
      r.id === 'req-07'
        ? {
            ...r,
            state: 'VERIFIED',
            verified_by: 'institutional_reviewer',
            verified_at: '2026-10-08T12:00:00Z',
          }
        : r
    ),
  };

  const model = deriveActionPlanModel(verifiedAggregate, 'JOINING');

  // 1. Blockers count decreased from 2 -> 1
  assert.equal(model.counts.blocking, 1);
  assert.equal(model.groups.BLOCKING.length, 1);
  assert.equal(model.groups.BLOCKING[0].code, 'FSSAI-REQ-08');
  assert.equal(model.groups.BLOCKING[0].title, 'Character Certificate');

  // 2. College NOC is no longer in Blockers
  const foundInBlockers = model.groups.BLOCKING.some((b) => b.code === 'FSSAI-REQ-07');
  assert.equal(foundInBlockers, false, 'College NOC must disappear from active blockers');

  // 3. College NOC moved to Completed
  assert.equal(model.counts.completed, 5);
  const foundInCompleted = model.groups.COMPLETED.some((c) => c.code === 'FSSAI-REQ-07');
  assert.equal(foundInCompleted, true, 'College NOC must now appear under Completed');

  const completedNoc = model.groups.COMPLETED.find((c) => c.code === 'FSSAI-REQ-07');
  assert.equal(completedNoc.state, 'VERIFIED');
  assert.equal(completedNoc.reason, 'Certified by institutional_reviewer.');

  // 4. Character Certificate remains the sole blocker
  assert.equal(model.groups.BLOCKING[0].code, 'FSSAI-REQ-08');
});

test('ActionPlanModel - Non-blocking In Progress requirement correctly populates In Progress group', () => {
  // Suppose requirement 05 (Recognized institute) has evidence uploaded (IN_PROGRESS)
  // Since REQ-05 blocks APPLICATION_SUBMISSION (not JOINING), it's not a JOINING blocker
  const inProgressAggregate = {
    ...CANONICAL_BASELINE_AGGREGATE,
    requirements: CANONICAL_BASELINE_AGGREGATE.requirements.map((r) =>
      r.id === 'req-05' ? { ...r, state: 'IN_PROGRESS' } : r
    ),
  };

  const model = deriveActionPlanModel(inProgressAggregate, 'JOINING');
  assert.equal(model.counts.inProgress, 1);
  assert.equal(model.groups.IN_PROGRESS.length, 1);
  assert.equal(model.groups.IN_PROGRESS[0].code, 'FSSAI-REQ-05');
  assert.equal(model.groups.IN_PROGRESS[0].title, 'Recognized institute');
  assert.equal(model.groups.IN_PROGRESS[0].state, 'IN_PROGRESS');
  assert.equal(model.groups.IN_PROGRESS[0].actionCue, 'Awaiting evidence or confirmation.');
});
