import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveOverviewHeroModel,
  deriveReadinessSummaryModel,
  deriveAttentionItems,
  deriveRecentActivityEvents,
} from '../src/views/overviewModel.js';

// Canonical Baseline Fixture for testing
const CANONICAL_AGGREGATE = {
  application: {
    id: 'app-canonical-001',
    title: 'FSSAI Internship Program 2026 Application',
    current_stage: 'JOINING',
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
      title: 'B.Tech IT Degree',
      state: 'VERIFIED',
      transition_events: [
        {
          id: 'ev-01',
          action: 'VERIFIED',
          actor: 'Demo Reviewer',
          created_at: '2026-03-01T10:00:00Z',
        },
      ],
    },
    {
      id: 'req-02',
      code: 'FSSAI-REQ-02',
      title: 'Minimum 60% Marks',
      state: 'VERIFIED',
      transition_events: [],
    },
    {
      id: 'req-05',
      code: 'FSSAI-REQ-05',
      title: 'Course Relevance Letter',
      state: 'NEEDS_VERIFICATION',
      transition_events: [],
    },
    {
      id: 'req-06',
      code: 'FSSAI-REQ-06',
      title: 'Recommendation Letter',
      state: 'NEEDS_VERIFICATION',
      transition_events: [],
    },
    {
      id: 'req-07',
      code: 'FSSAI-REQ-07',
      title: 'College NOC',
      state: 'MISSING',
      transition_events: [
        {
          id: 'ev-02',
          action: 'REQUESTED',
          actor: 'Applicant',
          created_at: '2026-03-02T14:30:00Z',
        },
      ],
    },
    {
      id: 'req-08',
      code: 'FSSAI-REQ-08',
      title: 'Character Certificate',
      state: 'MISSING',
      transition_events: [],
    },
  ],
};

test('OverviewModel - Hero: produces NOT_READY headline with 2 blockers for canonical demo', () => {
  const hero = deriveOverviewHeroModel(CANONICAL_AGGREGATE, 'JOINING');

  assert.equal(hero.state, 'NOT_READY');
  assert.equal(hero.isReady, false);
  assert.equal(hero.targetGate, 'JOINING');
  assert.equal(hero.blockerCount, 2);
  assert.equal(hero.headline, 'You’re not ready for joining yet.');
  assert.equal(hero.subline, '2 requirements are currently blocking the JOINING gate.');
});

test('OverviewModel - Hero: singular grammar when exactly 1 blocker remains', () => {
  const singleBlockerAggregate = {
    ...CANONICAL_AGGREGATE,
    gate_readiness: {
      ...CANONICAL_AGGREGATE.gate_readiness,
      active_blockers: [CANONICAL_AGGREGATE.gate_readiness.active_blockers[0]],
      blocking_unresolved: 1,
    },
  };

  const hero = deriveOverviewHeroModel(singleBlockerAggregate, 'JOINING');

  assert.equal(hero.state, 'NOT_READY');
  assert.equal(hero.blockerCount, 1);
  assert.equal(hero.headline, 'You’re not ready for joining yet.');
  assert.equal(hero.subline, '1 requirement is currently blocking the JOINING gate.');
});

test('OverviewModel - Hero: produces READY state when all criteria are verified', () => {
  const readyAggregate = {
    ...CANONICAL_AGGREGATE,
    gate_readiness: {
      gate: 'JOINING',
      is_ready: true,
      status: 'READY',
      active_blockers: [],
      blocking_total: 2,
      blocking_satisfied: 2,
      blocking_unresolved: 0,
    },
  };

  const hero = deriveOverviewHeroModel(readyAggregate, 'JOINING');

  assert.equal(hero.state, 'READY');
  assert.equal(hero.isReady, true);
  assert.equal(hero.blockerCount, 0);
  assert.equal(hero.headline, 'Ready for joining.');
  assert.equal(hero.subline, 'All mandatory criteria and stage blockers have been verified.');
});

test('OverviewModel - Hero: produces PENDING state when aggregate is null', () => {
  const hero = deriveOverviewHeroModel(null, 'JOINING');

  assert.equal(hero.state, 'PENDING');
  assert.equal(hero.isReady, false);
  assert.equal(hero.hasData, false);
  assert.match(hero.headline, /Evaluating readiness for joining/);
});

test('OverviewModel - Readiness Summary: derives correct verified, needs verification, missing, total counts', () => {
  const summary = deriveReadinessSummaryModel(CANONICAL_AGGREGATE);

  assert.equal(summary.verified, 4);
  assert.equal(summary.needsVerification, 2);
  assert.equal(summary.missing, 2);
  assert.equal(summary.total, 8);
  assert.equal(summary.verifiedPct, 50);
  assert.equal(summary.needsVerificationPct, 25);
  assert.equal(summary.missingPct, 25);
  assert.equal(summary.displayProgress, '4 of 8 requirements resolved');
  assert.ok(Array.isArray(summary.stageTimeline));
  assert.equal(summary.stageTimeline.length, 4);
});

test('OverviewModel - Stage Timeline: maps stage states correctly for canonical demo', () => {
  const summary = deriveReadinessSummaryModel(CANONICAL_AGGREGATE, 'JOINING');
  const [stage1, stage2, stage3, stage4] = summary.stageTimeline;

  // Stages 1 and 2 precede JOINING, so completed
  assert.equal(stage1.state, 'completed');
  assert.equal(stage1.isPassed, true);
  assert.equal(stage2.state, 'completed');
  assert.equal(stage2.isPassed, true);

  // Stage 3 is JOINING with 2 blockers, so active
  assert.equal(stage3.key, 'JOINING');
  assert.equal(stage3.state, 'active');
  assert.equal(stage3.isCurrent, true);
  assert.equal(stage3.isPassed, false);
  assert.match(stage3.sub, /2 Blockers/);

  // Stage 4 is ONBOARDING, so upcoming
  assert.equal(stage4.key, 'ONBOARDING');
  assert.equal(stage4.state, 'upcoming');
  assert.equal(stage4.isPassed, false);
});

test('OverviewModel - Stage Timeline: marks active stage as completed when is_ready is true', () => {
  const readyAggregate = {
    ...CANONICAL_AGGREGATE,
    gate_readiness: {
      ...CANONICAL_AGGREGATE.gate_readiness,
      is_ready: true,
      active_blockers: [],
    },
  };
  const summary = deriveReadinessSummaryModel(readyAggregate, 'JOINING');
  const stage3 = summary.stageTimeline[2];

  assert.equal(stage3.key, 'JOINING');
  assert.equal(stage3.state, 'completed');
  assert.equal(stage3.isPassed, true);
  assert.equal(stage3.sub, 'Cleared');
});

test('OverviewModel - Attention: strictly excludes verified requirements', () => {
  const attention = deriveAttentionItems(CANONICAL_AGGREGATE, 'JOINING');

  // Should have exactly 4 items (2 blockers + 2 needs-verification; req-01 and req-02 verified are excluded)
  assert.equal(attention.length, 4);
  const ids = attention.map((item) => item.id);
  assert.ok(!ids.includes('req-01'), 'Verified req-01 must not appear in attention list');
  assert.ok(!ids.includes('req-02'), 'Verified req-02 must not appear in attention list');
});

test('OverviewModel - Attention: prioritizes active blockers first, then needs-verification', () => {
  const attention = deriveAttentionItems(CANONICAL_AGGREGATE, 'JOINING');

  // Priority 1: blockers (req-07, req-08)
  assert.equal(attention[0].isBlocker, true);
  assert.equal(attention[0].priority, 1);
  assert.match(attention[0].statusLabel, /blocks joining/);

  assert.equal(attention[1].isBlocker, true);
  assert.equal(attention[1].priority, 1);
  assert.match(attention[1].statusLabel, /blocks joining/);

  // Priority 2: needs verification (req-05, req-06)
  assert.equal(attention[2].isBlocker, false);
  assert.equal(attention[2].priority, 2);
  assert.equal(attention[2].statusLabel, 'Needs verification');

  assert.equal(attention[3].isBlocker, false);
  assert.equal(attention[3].priority, 2);
  assert.equal(attention[3].statusLabel, 'Needs verification');
});

test('OverviewModel - Attention: provides valid navigation detail URLs', () => {
  const attention = deriveAttentionItems(CANONICAL_AGGREGATE, 'JOINING');
  assert.equal(attention[0].detailUrl, '/requirements?detail=req-07');
});

test('OverviewModel - Attention: returns empty array when all requirements are certified', () => {
  const allVerifiedAggregate = {
    ...CANONICAL_AGGREGATE,
    requirements: [
      { id: 'req-01', state: 'VERIFIED' },
      { id: 'req-02', state: 'VERIFIED' },
    ],
    gate_readiness: {
      is_ready: true,
      active_blockers: [],
    },
  };

  const attention = deriveAttentionItems(allVerifiedAggregate, 'JOINING');
  assert.deepEqual(attention, []);
});

test('OverviewModel - Recent Activity: flattens, sorts chronologically descending, and formats events', () => {
  const events = deriveRecentActivityEvents(CANONICAL_AGGREGATE, 5);

  assert.equal(events.length, 2);
  // ev-02 was created at 2026-03-02, ev-01 at 2026-03-01. Newest (ev-02) should be first.
  assert.equal(events[0].id, 'ev-02');
  assert.equal(events[0].actionLabel, 'Requested');
  assert.equal(events[0].actor, 'Applicant');
  assert.equal(events[0].requirementCode, 'FSSAI-REQ-07');

  assert.equal(events[1].id, 'ev-01');
  assert.equal(events[1].actionLabel, 'Verified & Certified');
  assert.equal(events[1].actor, 'Demo Reviewer');
  assert.equal(events[1].requirementCode, 'FSSAI-REQ-01');
});
