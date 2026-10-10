import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveSourceCitationModel,
  deriveRulesModel,
  deriveBlockingImpactModel,
  formatRuleField,
  formatRuleOperator,
  formatRuleExpectedValue,
} from '../src/components/inspectorModel.js';

// Canonical FSSAI Mock Fixtures
const CANONICAL_FSSAI_REQUIREMENTS = [
  {
    id: 'req-01',
    code: 'FSSAI-REQ-01',
    title: 'B.Tech Information Technology',
    description: 'Students pursuing regular B.Tech in IT or CS from recognized institutions.',
    category: 'ELIGIBILITY',
    blocking_stages: ['APPLICATION_SUBMISSION'],
    verification_mode: 'AUTOMATED_EVALUATION',
    state: 'VERIFIED',
    source_citation: {
      section: 'Section 3(a) - Educational Qualifications',
      page: 1,
      quote: 'Students pursuing regular B.Tech in Information Technology or Computer Science from recognized institutions.',
      confidence_score: 0.98,
    },
    rules: [
      {
        id: 'rule-01',
        field: 'degree',
        operator: 'EQUALS',
        expected_value: 'B.Tech Information Technology',
        evaluation_status: 'SATISFIED',
        evaluation_message: "Applicant degree matches 'B.Tech Information Technology'.",
      },
    ],
  },
  {
    id: 'req-05',
    code: 'FSSAI-REQ-05',
    title: 'Recognized institute',
    description: 'Institution must be approved under UGC/AICTE or Act of Parliament.',
    category: 'DOCUMENTATION',
    blocking_stages: ['APPLICATION_SUBMISSION'],
    verification_mode: 'HUMAN_CONFIRMATION',
    state: 'NEEDS_VERIFICATION',
    source_citation: {
      section: 'Section 2 - Institutional Recognition',
      page: 1,
      quote: 'Colleges and universities must be recognized by AICTE, UGC, or established by Act of Parliament.',
      confidence_score: 0.94,
    },
    rules: [],
  },
  {
    id: 'req-07',
    code: 'FSSAI-REQ-07',
    title: 'College NOC',
    description: 'No Objection Certificate from Head of Institution on official college letterhead.',
    category: 'DOCUMENTATION',
    blocking_stages: ['JOINING'],
    verification_mode: 'HUMAN_CONFIRMATION',
    state: 'MISSING',
    source_citation: {
      section: 'Section 4(a) - Mandatory Clearances',
      page: 2,
      quote: 'Candidates must submit a No Objection Certificate from the Head of the Institution/College at the time of joining.',
      confidence_score: 0.99,
    },
    rules: [],
  },
  {
    id: 'req-incomplete',
    code: 'REQ-INCOMPLETE',
    title: 'Incomplete Test Requirement',
    description: null,
    category: null,
    blocking_stages: [],
    verification_mode: null,
    state: 'MISSING',
    source_citation: null,
    rules: null,
  },
];

const CANONICAL_GATE_READINESS = {
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
  ],
  blocking_total: 2,
  blocking_satisfied: 1,
  blocking_unresolved: 1,
};

// ============================================================================
// 1. Selection & Loading State Tests
// ============================================================================

test('RequirementInspector - No selected requirement handling', () => {
  const selectedReq = null;
  assert.equal(selectedReq, null);

  const blockingImpact = deriveBlockingImpactModel(null, CANONICAL_GATE_READINESS, 'JOINING');
  assert.equal(blockingImpact.isBlocker, false);
  assert.equal(blockingImpact.stagesFormatted, null);
  assert.equal(blockingImpact.statusLabel, 'Not a current blocker');
});

test('RequirementInspector - Selected requirement loads correctly from canonical aggregate', () => {
  const req07 = CANONICAL_FSSAI_REQUIREMENTS.find((r) => r.id === 'req-07');
  assert.ok(req07);
  assert.equal(req07.code, 'FSSAI-REQ-07');
  assert.equal(req07.title, 'College NOC');
  assert.equal(req07.state, 'MISSING');
  assert.equal(req07.category, 'DOCUMENTATION');
  assert.equal(req07.verification_mode, 'HUMAN_CONFIRMATION');
});

test('RequirementInspector - Switching selected requirements updates derived data', () => {
  // First selection: FSSAI-REQ-07 (College NOC)
  let activeId = 'req-07';
  let activeReq = CANONICAL_FSSAI_REQUIREMENTS.find((r) => r.id === activeId);
  assert.equal(activeReq.code, 'FSSAI-REQ-07');
  let impact = deriveBlockingImpactModel(activeReq, CANONICAL_GATE_READINESS, 'JOINING');
  assert.equal(impact.isBlocker, true);
  assert.equal(impact.blockerCallout, 'BLOCKING JOINING');

  // Switch selection: FSSAI-REQ-01 (B.Tech IT)
  activeId = 'req-01';
  activeReq = CANONICAL_FSSAI_REQUIREMENTS.find((r) => r.id === activeId);
  assert.equal(activeReq.code, 'FSSAI-REQ-01');
  impact = deriveBlockingImpactModel(activeReq, CANONICAL_GATE_READINESS, 'JOINING');
  assert.equal(impact.isBlocker, false);
  assert.equal(impact.statusLabel, 'Not a current blocker');

  // Switch selection: FSSAI-REQ-05 (Recognized institute)
  activeId = 'req-05';
  activeReq = CANONICAL_FSSAI_REQUIREMENTS.find((r) => r.id === activeId);
  assert.equal(activeReq.code, 'FSSAI-REQ-05');
  assert.equal(activeReq.state, 'NEEDS_VERIFICATION');
});

// ============================================================================
// 2. Source Citation Tests
// ============================================================================

test('SourceCitationBox - Renders complete citation metadata for College NOC', () => {
  const req07 = CANONICAL_FSSAI_REQUIREMENTS.find((r) => r.id === 'req-07');
  const citation = deriveSourceCitationModel(req07.source_citation);

  assert.equal(citation.hasCitation, true);
  assert.equal(citation.section, 'Section 4(a) - Mandatory Clearances');
  assert.equal(citation.page, 2);
  assert.equal(citation.pageLabel, 'Page 2');
  assert.match(citation.quote, /No Objection Certificate/);
  assert.equal(citation.confidenceScore, 99);
  assert.equal(citation.fallbackMessage, null);
});

test('SourceCitationBox - Handles missing citation gracefully with neutral fallback', () => {
  const emptyCitation = deriveSourceCitationModel(null);
  assert.equal(emptyCitation.hasCitation, false);
  assert.equal(emptyCitation.section, null);
  assert.equal(emptyCitation.page, null);
  assert.equal(emptyCitation.quote, null);
  assert.equal(
    emptyCitation.fallbackMessage,
    'Source citation unavailable for this requirement.'
  );

  const incompleteCitation = deriveSourceCitationModel({});
  assert.equal(incompleteCitation.hasCitation, false);
  assert.equal(
    incompleteCitation.fallbackMessage,
    'Source citation unavailable for this requirement.'
  );
});

// ============================================================================
// 3. Rule Evaluation Tests
// ============================================================================

test('RuleEvaluationBox - Renders automated conditions when rules exist', () => {
  const req01 = CANONICAL_FSSAI_REQUIREMENTS.find((r) => r.id === 'req-01');
  const model = deriveRulesModel(req01.rules);

  assert.equal(model.hasRules, true);
  assert.equal(model.rules.length, 1);
  assert.equal(model.fallbackMessage, null);

  const rule = model.rules[0];
  assert.equal(rule.field, 'degree');
  assert.equal(rule.fieldLabel, 'Degree Program');
  assert.equal(rule.operatorSymbol, '=');
  assert.equal(rule.expectedValue, 'B.Tech Information Technology');
  assert.equal(rule.evaluationStatus, 'SATISFIED');
  assert.equal(rule.isSatisfied, true);
  assert.match(rule.evaluationMessage, /matches/);
});

test('RuleEvaluationBox - Handles empty rules list with neutral institutional message', () => {
  const req07 = CANONICAL_FSSAI_REQUIREMENTS.find((r) => r.id === 'req-07');
  const model = deriveRulesModel(req07.rules);

  assert.equal(model.hasRules, false);
  assert.equal(model.rules.length, 0);
  assert.match(
    model.fallbackMessage,
    /No automated evaluation rules defined/
  );
});

test('RuleEvaluationBox - Helper formatters work cleanly for various types', () => {
  assert.equal(formatRuleField('cgpa'), 'CGPA');
  assert.equal(formatRuleField('year_of_study'), 'Year of Study');
  assert.equal(formatRuleOperator('GTE'), '≥');
  assert.equal(formatRuleOperator('LTE'), '≤');
  assert.equal(formatRuleOperator('IN'), '∈ (One of)');
  assert.equal(formatRuleExpectedValue([3, 4]), '3, 4');
  assert.equal(formatRuleExpectedValue(6.0), '6');
  assert.equal(formatRuleExpectedValue('FULL_TIME'), 'Full-Time');
  assert.equal(formatRuleExpectedValue(null), 'Not specified');
});

// ============================================================================
// 4. Blocking Impact & Missing Field Fallback Tests
// ============================================================================

test('BlockingImpact - Correctly identifies active blocker and displays reason', () => {
  const req07 = CANONICAL_FSSAI_REQUIREMENTS.find((r) => r.id === 'req-07');
  const impact = deriveBlockingImpactModel(req07, CANONICAL_GATE_READINESS, 'JOINING');

  assert.equal(impact.isBlocker, true);
  assert.equal(impact.stagesFormatted, 'Joining');
  assert.equal(impact.statusLabel, 'Active blocker for JOINING gate');
  assert.equal(impact.blockerCallout, 'BLOCKING JOINING');
  assert.equal(impact.reason, 'College NOC is missing and required before JOINING.');
});

test('BlockingImpact - Handles non-blocker requirement without spurious alerts', () => {
  const req05 = CANONICAL_FSSAI_REQUIREMENTS.find((r) => r.id === 'req-05');
  const impact = deriveBlockingImpactModel(req05, CANONICAL_GATE_READINESS, 'JOINING');

  assert.equal(impact.isBlocker, false);
  assert.equal(impact.stagesFormatted, 'Application Submission');
  assert.equal(impact.statusLabel, 'Not a current blocker');
  assert.equal(impact.blockerCallout, null);
  assert.equal(impact.reason, null);
});

test('RequirementInspector - Graceful handling of incomplete requirements', () => {
  const reqIncomplete = CANONICAL_FSSAI_REQUIREMENTS.find((r) => r.id === 'req-incomplete');
  const citation = deriveSourceCitationModel(reqIncomplete.source_citation);
  const rules = deriveRulesModel(reqIncomplete.rules);
  const impact = deriveBlockingImpactModel(reqIncomplete, CANONICAL_GATE_READINESS, 'JOINING');

  assert.equal(citation.hasCitation, false);
  assert.equal(rules.hasRules, false);
  assert.equal(impact.isBlocker, false);
  assert.equal(impact.stagesFormatted, 'None specified');
});
