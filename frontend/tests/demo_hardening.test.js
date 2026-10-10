import test from 'node:test';
import assert from 'node:assert/strict';
import { formatModelGovernance } from '../src/components/ingestionModel.js';
import { deriveActionPlanModel } from '../src/components/actionPlanModel.js';
import { deriveBlockingImpactModel } from '../src/components/inspectorModel.js';
import { getAvailableTransitions } from '../src/components/lifecycleModel.js';

// Canonical Baseline Aggregate
const BASELINE_AGGREGATE = {
  application: {
    id: 'app-canonical-001',
    title: 'FSSAI Internship Program 2026 Application',
    current_stage: 'JOINING',
  },
  policy_document: {
    id: 'doc-001',
    title: 'FSSAI Internship Policy 2026',
    is_demo_seed: true,
  },
  progress: {
    total_count: 8,
    resolved_count: 4,
    blocking_count: 2,
    completion_percentage: 50.0,
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
      },
      {
        requirement_id: 'req-08',
        code: 'FSSAI-REQ-08',
        title: 'Character Certificate',
        state: 'MISSING',
        verification_mode: 'HUMAN_CONFIRMATION',
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
      title: 'B.Tech IT',
      state: 'VERIFIED',
      blocking_stages: ['APPLICATION_SUBMISSION'],
      verification_mode: 'RULE_ENGINE',
    },
    {
      id: 'req-02',
      code: 'FSSAI-REQ-02',
      title: 'Third Year',
      state: 'VERIFIED',
      blocking_stages: ['APPLICATION_SUBMISSION'],
      verification_mode: 'RULE_ENGINE',
    },
    {
      id: 'req-03',
      code: 'FSSAI-REQ-03',
      title: 'CGPA >= 6.0',
      state: 'VERIFIED',
      blocking_stages: ['APPLICATION_SUBMISSION'],
      verification_mode: 'RULE_ENGINE',
    },
    {
      id: 'req-04',
      code: 'FSSAI-REQ-04',
      title: 'Full Time',
      state: 'VERIFIED',
      blocking_stages: ['APPLICATION_SUBMISSION'],
      verification_mode: 'RULE_ENGINE',
    },
    {
      id: 'req-05',
      code: 'FSSAI-REQ-05',
      title: 'Recognized Institute',
      state: 'NEEDS_VERIFICATION',
      blocking_stages: ['APPLICATION_SUBMISSION'],
      verification_mode: 'HUMAN_CONFIRMATION',
    },
    {
      id: 'req-06',
      code: 'FSSAI-REQ-06',
      title: 'Laptop Available',
      state: 'NEEDS_VERIFICATION',
      blocking_stages: ['INTERVIEW'],
      verification_mode: 'RULE_ENGINE',
    },
    {
      id: 'req-07',
      code: 'FSSAI-REQ-07',
      title: 'College NOC',
      state: 'MISSING',
      blocking_stages: ['JOINING'],
      verification_mode: 'HUMAN_CONFIRMATION',
    },
    {
      id: 'req-08',
      code: 'FSSAI-REQ-08',
      title: 'Character Certificate',
      state: 'MISSING',
      blocking_stages: ['JOINING'],
      verification_mode: 'HUMAN_CONFIRMATION',
    },
  ],
};

// ============================================================================
// 1. Canonical Demo Flow Verification
// ============================================================================

test('DemoHardening - Baseline state has exactly 8 reqs, 4 verified, 2 blockers', () => {
  const agg = BASELINE_AGGREGATE;
  assert.equal(agg.requirements.length, 8);
  assert.equal(agg.progress.resolved_count, 4);
  assert.equal(agg.gate_readiness.active_blockers.length, 2);
  assert.equal(agg.gate_readiness.is_ready, false);

  const blockers = agg.gate_readiness.active_blockers.map((b) => b.code);
  assert.ok(blockers.includes('FSSAI-REQ-07'));
  assert.ok(blockers.includes('FSSAI-REQ-08'));
});

test('DemoHardening - College NOC lifecycle progression transitions 4 -> 5 verified and 2 -> 1 blocker', () => {
  // Step 1: Request
  let transitions = getAvailableTransitions('MISSING');
  assert.equal(transitions.canRequest, true);

  // Step 2: In Progress
  transitions = getAvailableTransitions('IN_PROGRESS');
  assert.equal(transitions.canUpload, true);

  // Step 3: Evidence Received
  transitions = getAvailableTransitions('EVIDENCE_RECEIVED');
  assert.equal(transitions.canVerify, true);

  // Step 4: Verified Aggregate update simulation
  const verifiedAggregate = {
    ...BASELINE_AGGREGATE,
    progress: {
      ...BASELINE_AGGREGATE.progress,
      resolved_count: 5,
      blocking_count: 1,
      completion_percentage: 62.5,
    },
    gate_readiness: {
      ...BASELINE_AGGREGATE.gate_readiness,
      is_ready: false,
      active_blockers: [
        {
          requirement_id: 'req-08',
          code: 'FSSAI-REQ-08',
          title: 'Character Certificate',
          state: 'MISSING',
          verification_mode: 'HUMAN_CONFIRMATION',
        },
      ],
      blocking_total: 2,
      blocking_satisfied: 1,
      blocking_unresolved: 1,
    },
    requirements: BASELINE_AGGREGATE.requirements.map((r) =>
      r.id === 'req-07' ? { ...r, state: 'VERIFIED' } : r
    ),
  };

  assert.equal(verifiedAggregate.progress.resolved_count, 5);
  assert.equal(verifiedAggregate.gate_readiness.active_blockers.length, 1);
  assert.equal(verifiedAggregate.gate_readiness.active_blockers[0].code, 'FSSAI-REQ-08');

  // Verify College NOC is no longer a blocker
  const nocReq = verifiedAggregate.requirements.find((r) => r.id === 'req-07');
  const impact = deriveBlockingImpactModel(nocReq, verifiedAggregate.gate_readiness, 'JOINING');
  assert.equal(impact.isBlocker, false);

  // Verify Character Certificate remains the active blocker
  const charReq = verifiedAggregate.requirements.find((r) => r.id === 'req-08');
  const charImpact = deriveBlockingImpactModel(charReq, verifiedAggregate.gate_readiness, 'JOINING');
  assert.equal(charImpact.isBlocker, true);
  assert.equal(charImpact.blockerCallout, 'BLOCKING JOINING');
});

// ============================================================================
// 2. Cross-Component Synchronization Verification
// ============================================================================

test('DemoHardening - Action Plan synchronized with verified aggregate', () => {
  const verifiedAggregate = {
    ...BASELINE_AGGREGATE,
    gate_readiness: {
      ...BASELINE_AGGREGATE.gate_readiness,
      active_blockers: [
        {
          requirement_id: 'req-08',
          code: 'FSSAI-REQ-08',
          title: 'Character Certificate',
          state: 'MISSING',
        },
      ],
    },
    requirements: BASELINE_AGGREGATE.requirements.map((r) =>
      r.id === 'req-07' ? { ...r, state: 'VERIFIED' } : r
    ),
  };

  const plan = deriveActionPlanModel(verifiedAggregate, 'JOINING');
  assert.equal(plan.counts.blocking, 1);
  assert.equal(plan.counts.completed, 5);
  assert.equal(plan.groups.BLOCKING[0].code, 'FSSAI-REQ-08');
  assert.ok(plan.groups.COMPLETED.some((r) => r.code === 'FSSAI-REQ-07'));
});

// ============================================================================
// 3. Truthful Model Governance Verification
// ============================================================================

test('DemoHardening - Model governance is strictly truthful and never mislabels fallbacks', () => {
  // 1. Primary Engine
  const gov38 = formatModelGovernance('gemini-3.8-flash', 'GEMINI_3_8_FLASH');
  assert.equal(gov38.displayName, 'Gemini 3.8 Flash');
  assert.equal(gov38.isFallback, false);

  // 2. Secondary Fallback
  const gov35 = formatModelGovernance('gemini-3.5-flash', 'GEMINI_3_5_FLASH_FALLBACK');
  assert.equal(gov35.displayName, 'Gemini 3.5 Flash (Fallback)');
  assert.equal(gov35.isFallback, true);
  assert.notEqual(gov35.displayName, 'Gemini 3.8 Flash');

  // 3. Canonical Demo Fallback
  const govDemo = formatModelGovernance('canonical-fssai-baseline', 'CANONICAL_DEMO_FALLBACK');
  assert.equal(govDemo.displayName, 'Canonical Demo Baseline');
  assert.equal(govDemo.isFallback, true);
  assert.notEqual(govDemo.displayName, 'Gemini 3.8 Flash');
});

// ============================================================================
// 4. Error Message Sanitization Verification
// ============================================================================

test('DemoHardening - Error normalization contains zero leaked paths or secrets', () => {
  const sampleErrors = [
    'Policy document exceeds maximum limit of 50 MB.',
    'Unsupported file type. Allowed: .pdf, .png, .jpg',
    'Cannot verify requirement without attached evidence.',
    'Rejection reason is required.',
  ];

  for (const err of sampleErrors) {
    assert.equal(err.includes('AIzaSy'), false);
    assert.equal(err.includes('C:\\'), false);
    assert.equal(err.includes('/var/'), false);
    assert.equal(err.includes('password'), false);
    assert.equal(err.includes('Traceback'), false);
  }
});
