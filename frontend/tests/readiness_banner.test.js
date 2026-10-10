import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveReadinessViewModel } from '../src/components/readinessModel.js';

test('ReadinessBanner - State A: No data / initializing produces PENDING state model', () => {
  const model = deriveReadinessViewModel(null, 'JOINING', null);

  assert.equal(model.state, 'PENDING');
  assert.equal(model.targetGate, 'JOINING');
  assert.equal(model.badgeLabel, 'READINESS PENDING');
  assert.match(model.message, /Awaiting gate readiness evaluation/);
  assert.equal(model.isReady, false);
  assert.equal(model.hasData, false);
  assert.equal(model.blockerCount, 0);
  assert.deepEqual(model.activeBlockers, []);
});

test('ReadinessBanner - State B: is_ready === true produces READY state model', () => {
  const aggregate = {
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

  const model = deriveReadinessViewModel(aggregate, 'JOINING', null);

  assert.equal(model.state, 'READY');
  assert.equal(model.targetGate, 'JOINING');
  assert.equal(model.badgeLabel, 'STAGE READY');
  assert.match(model.message, /All criteria blocking this stage are verified/);
  assert.equal(model.isReady, true);
  assert.equal(model.hasData, true);
  assert.equal(model.blockerCount, 0);
  assert.equal(model.blockingTotal, 2);
  assert.equal(model.blockingSatisfied, 2);
});

test('ReadinessBanner - State C: is_ready === false produces NOT_READY with canonical blockers', () => {
  const aggregate = {
    gate_readiness: {
      gate: 'JOINING',
      is_ready: false,
      status: 'NOT_READY',
      active_blockers: [
        {
          requirement_id: 'req_07',
          code: 'FSSAI-REQ-07',
          title: 'College NOC',
          state: 'MISSING',
          verification_mode: 'HUMAN_CONFIRMATION',
          reason: 'College NOC is missing and required before JOINING.',
        },
        {
          requirement_id: 'req_08',
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
  };

  const model = deriveReadinessViewModel(aggregate, 'JOINING', 'req_07');

  assert.equal(model.state, 'NOT_READY');
  assert.equal(model.targetGate, 'JOINING');
  assert.equal(model.badgeLabel, 'STAGE NOT READY');
  assert.match(model.message, /2 unresolved requirements are blocking clearance/);
  assert.equal(model.isReady, false);
  assert.equal(model.hasData, true);
  assert.equal(model.blockerCount, 2);

  // Verify canonical blockers preserved
  assert.equal(model.activeBlockers[0].code, 'FSSAI-REQ-07');
  assert.equal(model.activeBlockers[0].title, 'College NOC');
  assert.equal(model.activeBlockers[0].isSelected, true);

  assert.equal(model.activeBlockers[1].code, 'FSSAI-REQ-08');
  assert.equal(model.activeBlockers[1].title, 'Character Certificate');
  assert.equal(model.activeBlockers[1].isSelected, false);
});

test('ReadinessBanner - Dynamic update: 1 blocker remaining after partial resolution', () => {
  const aggregate = {
    gate_readiness: {
      gate: 'JOINING',
      is_ready: false,
      status: 'NOT_READY',
      active_blockers: [
        {
          requirement_id: 'req_08',
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
  };

  const model = deriveReadinessViewModel(aggregate, 'JOINING', null);

  assert.equal(model.state, 'NOT_READY');
  assert.equal(model.blockerCount, 1);
  assert.match(model.message, /1 unresolved requirement is blocking clearance/);
  assert.equal(model.activeBlockers[0].code, 'FSSAI-REQ-08');
  assert.equal(model.blockingSatisfied, 1);
});

test('ReadinessBanner - Stage Gate flexibility', () => {
  const aggregate = {
    gate_readiness: {
      gate: 'APPLICATION_SUBMISSION',
      is_ready: true,
      status: 'READY',
      active_blockers: [],
    },
  };

  const model = deriveReadinessViewModel(aggregate, 'APPLICATION_SUBMISSION', null);
  assert.equal(model.targetGate, 'APPLICATION_SUBMISSION');
  assert.equal(model.isReady, true);
});
