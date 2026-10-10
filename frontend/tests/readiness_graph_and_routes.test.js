import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveReadinessGraph } from '../src/views/readinessGraphModel.js';
import { filterRequirements } from '../src/components/matrixModel.js';
import { deriveActionPlanModel } from '../src/components/actionPlanModel.js';

// Canonical Baseline Fixture
const SAMPLE_AGGREGATE = {
  application: {
    id: 'app-001',
    title: 'FSSAI Internship Program 2026 Application',
  },
  policy_document: {
    id: 'doc-fssai-2026',
    title: 'FSSAI Internship Scheme Guidelines 2026',
    document_type: 'POLICY_PDF',
    is_demo_seed: true,
  },
  progress: {
    total_count: 8,
    resolved_count: 4,
    verified_count: 4,
    needs_verification_count: 2,
    missing_count: 2,
    in_progress_count: 0,
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
        reason: 'College NOC is missing and required before JOINING.',
      },
      {
        requirement_id: 'req-08',
        code: 'FSSAI-REQ-08',
        title: 'Character Certificate',
        state: 'MISSING',
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
      title: 'B.Tech / Graduate Degree Marksheet',
      category: 'ELIGIBILITY',
      state: 'VERIFIED',
      verification_mode: 'OCR_ANALYSIS',
      blocking_stages: ['APPLICATION_SUBMISSION', 'JOINING'],
      source_citation: { section: 'Section 4.1' },
      evidence_links: [
        { evidence_id: 'ev-01', file_name: 'degree_marksheet.pdf' },
      ],
    },
    {
      id: 'req-02',
      code: 'FSSAI-REQ-02',
      title: 'Government Photo ID (Aadhaar / Passport)',
      category: 'DOCUMENTATION',
      state: 'VERIFIED',
      verification_mode: 'OCR_ANALYSIS',
      blocking_stages: ['APPLICATION_SUBMISSION'],
      evidence_links: [
        { evidence_id: 'ev-02', file_name: 'aadhaar_card.pdf' },
      ],
    },
    {
      id: 'req-03',
      code: 'FSSAI-REQ-03',
      title: 'Bonafide Student Certificate',
      category: 'ELIGIBILITY',
      state: 'VERIFIED',
      verification_mode: 'HUMAN_CONFIRMATION',
      blocking_stages: ['APPLICATION_SUBMISSION'],
      evidence_links: [],
    },
    {
      id: 'req-04',
      code: 'FSSAI-REQ-04',
      title: 'No Prior Criminal Record Undertaking',
      category: 'CONDUCT',
      state: 'VERIFIED',
      verification_mode: 'ATTESTATION',
      blocking_stages: ['JOINING'],
      evidence_links: [],
    },
    {
      id: 'req-05',
      code: 'FSSAI-REQ-05',
      title: 'Recommendation Letter from Head of Department',
      category: 'DOCUMENTATION',
      state: 'NEEDS_VERIFICATION',
      verification_mode: 'HUMAN_CONFIRMATION',
      blocking_stages: ['JOINING'],
      evidence_links: [
        { evidence_id: 'ev-05', file_name: 'hod_recommendation.pdf' },
      ],
    },
    {
      id: 'req-06',
      code: 'FSSAI-REQ-06',
      title: 'Medical Fitness Certificate',
      category: 'DOCUMENTATION',
      state: 'NEEDS_VERIFICATION',
      verification_mode: 'HUMAN_CONFIRMATION',
      blocking_stages: ['JOINING'],
      evidence_links: [],
    },
    {
      id: 'req-07',
      code: 'FSSAI-REQ-07',
      title: 'College NOC',
      category: 'PREREQUISITE',
      state: 'MISSING',
      verification_mode: 'HUMAN_CONFIRMATION',
      blocking_stages: ['JOINING'],
      evidence_links: [],
    },
    {
      id: 'req-08',
      code: 'FSSAI-REQ-08',
      title: 'Character Certificate',
      category: 'CONDUCT',
      state: 'MISSING',
      verification_mode: 'HUMAN_CONFIRMATION',
      blocking_stages: ['JOINING'],
      evidence_links: [],
    },
  ],
  dependencies: [
    {
      id: 'dep-01',
      prerequisite_id: 'req-03',
      dependent_id: 'req-07',
      relationship_type: 'PREREQUISITE',
    },
  ],
};

// ---------------------------------------------------------------------------
// 1. Readiness Graph Derivation Tests
// ---------------------------------------------------------------------------

test('ReadinessGraph - Handles empty or null aggregate gracefully', () => {
  const resultNull = deriveReadinessGraph(null);
  assert.equal(resultNull.hasData, false);
  assert.equal(resultNull.nodes.length, 0);
  assert.equal(resultNull.edges.length, 0);

  const resultEmpty = deriveReadinessGraph({ requirements: [] });
  assert.equal(resultEmpty.hasData, false);
  assert.equal(resultEmpty.nodes.length, 0);
  assert.equal(resultEmpty.edges.length, 0);
});

test('ReadinessGraph - Derives Policy, Requirement, Evidence, and Gate nodes accurately', () => {
  const graph = deriveReadinessGraph(SAMPLE_AGGREGATE, 'JOINING');
  assert.equal(graph.hasData, true);
  assert.equal(graph.totalRequirements, 8);

  // Policy Node exists
  const policyNode = graph.nodes.find((n) => n.type === 'policyNode');
  assert.ok(policyNode);
  assert.equal(policyNode.data.id, 'doc-fssai-2026');
  assert.equal(policyNode.data.title, 'FSSAI Internship Scheme Guidelines 2026');

  // Requirement Nodes exist
  const reqNodes = graph.nodes.filter((n) => n.type === 'requirementNode');
  assert.equal(reqNodes.length, 8);

  const nocNode = reqNodes.find((n) => n.data.code === 'FSSAI-REQ-07');
  assert.ok(nocNode);
  assert.equal(nocNode.data.isBlocker, true);
  assert.equal(nocNode.data.state, 'MISSING');

  const degreeNode = reqNodes.find((n) => n.data.code === 'FSSAI-REQ-01');
  assert.ok(degreeNode);
  assert.equal(degreeNode.data.isBlocker, false);
  assert.equal(degreeNode.data.state, 'VERIFIED');

  // Evidence Nodes exist for linked evidence
  const evidenceNodes = graph.nodes.filter((n) => n.type === 'evidenceNode');
  assert.equal(evidenceNodes.length, 3); // ev-01, ev-02, ev-05

  // Stage Gate Nodes exist
  const gateNodes = graph.nodes.filter((n) => n.type === 'stageGateNode');
  assert.equal(gateNodes.length, 4);

  const joiningGate = gateNodes.find((n) => n.data.key === 'JOINING');
  assert.ok(joiningGate);
  assert.equal(joiningGate.data.isCurrent, true);
  assert.equal(joiningGate.data.hasBlockers, true);
  assert.equal(joiningGate.data.blockerCount, 2);
  assert.equal(joiningGate.data.isReady, false);
});

test('ReadinessGraph - Prerequisite dependencies strictly map genuine backend relations', () => {
  const graph = deriveReadinessGraph(SAMPLE_AGGREGATE, 'JOINING');

  // Must have prerequisite edge between req-03 and req-07
  const prereqEdge = graph.edges.find((e) => e.id === 'edge-dep-dep-01');
  assert.ok(prereqEdge);
  assert.equal(prereqEdge.source, 'req-03');
  assert.equal(prereqEdge.target, 'req-07');
  assert.equal(prereqEdge.animated, true);
  assert.equal(prereqEdge.label, 'Prerequisite');

  // Must not have invented edges between arbitrary requirements
  const fakeEdge = graph.edges.find(
    (e) => e.source === 'req-01' && e.target === 'req-08'
  );
  assert.equal(fakeEdge, undefined);
});

test('ReadinessGraph - Structural edges link Policy to Requirements and Requirements to Gates', () => {
  const graph = deriveReadinessGraph(SAMPLE_AGGREGATE, 'JOINING');

  // Every requirement has an edge from the Policy node
  SAMPLE_AGGREGATE.requirements.forEach((req) => {
    const policyEdge = graph.edges.find((e) => e.id === `edge-policy-${req.id}`);
    assert.ok(policyEdge);
    assert.equal(policyEdge.source, 'node-policy');
    assert.equal(policyEdge.target, req.id);
  });

  // Requirements blocking JOINING have edges to gate-JOINING
  const req07GateEdge = graph.edges.find(
    (e) => e.source === 'req-07' && e.target === 'gate-JOINING'
  );
  assert.ok(req07GateEdge);
  assert.equal(req07GateEdge.style.stroke, '#E11D48'); // Blocker styling
});

// ---------------------------------------------------------------------------
// 2. Requirements Matrix Filtering Tests
// ---------------------------------------------------------------------------

test('RequirementsFilter - Status filter returns exact matches', () => {
  const allReqs = SAMPLE_AGGREGATE.requirements;

  const verified = filterRequirements(allReqs, { statusFilter: 'VERIFIED' });
  assert.equal(verified.length, 4);

  const review = filterRequirements(allReqs, { statusFilter: 'NEEDS_VERIFICATION' });
  assert.equal(review.length, 2);

  const missing = filterRequirements(allReqs, { statusFilter: 'MISSING' });
  assert.equal(missing.length, 2);

  const inProg = filterRequirements(allReqs, { statusFilter: 'IN_PROGRESS' });
  assert.equal(inProg.length, 0);
});

test('RequirementsFilter - Category filter returns exact matches', () => {
  const allReqs = SAMPLE_AGGREGATE.requirements;

  const eligibility = filterRequirements(allReqs, { categoryFilter: 'ELIGIBILITY' });
  assert.equal(eligibility.length, 2);

  const doc = filterRequirements(allReqs, { categoryFilter: 'DOCUMENTATION' });
  assert.equal(doc.length, 3);

  const prereq = filterRequirements(allReqs, { categoryFilter: 'PREREQUISITE' });
  assert.equal(prereq.length, 1);
  assert.equal(prereq[0].code, 'FSSAI-REQ-07');
});

test('RequirementsFilter - Combined search and category filter', () => {
  const allReqs = SAMPLE_AGGREGATE.requirements;

  const searchResult = filterRequirements(allReqs, {
    categoryFilter: 'DOCUMENTATION',
    searchQuery: 'Photo ID',
  });
  assert.equal(searchResult.length, 1);
  assert.equal(searchResult[0].code, 'FSSAI-REQ-02');
});

// ---------------------------------------------------------------------------
// 3. Action Plan Model Tests
// ---------------------------------------------------------------------------

test('ActionPlanModel - Groups requirements into actionable priority buckets', () => {
  const model = deriveActionPlanModel(SAMPLE_AGGREGATE, 'JOINING');
  assert.equal(model.hasData, true);
  assert.equal(model.activeGate, 'JOINING');

  // Blocking group
  assert.equal(model.counts.blocking, 2);
  assert.equal(model.groups.BLOCKING.length, 2);
  assert.equal(model.groups.BLOCKING[0].code, 'FSSAI-REQ-07');
  assert.equal(model.groups.BLOCKING[1].code, 'FSSAI-REQ-08');

  // Needs verification group
  assert.equal(model.counts.needsVerification, 2);
  assert.equal(model.groups.NEEDS_VERIFICATION.length, 2);

  // Completed group
  assert.equal(model.counts.completed, 4);
  assert.equal(model.groups.COMPLETED.length, 4);
});
