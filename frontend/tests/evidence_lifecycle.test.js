import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAvailableTransitions,
  validateEvidenceFile,
  validateRejectionReason,
  formatFileSize,
  MAX_EVIDENCE_SIZE_BYTES,
  ALLOWED_EVIDENCE_EXTENSIONS,
} from '../src/components/lifecycleModel.js';

// ============================================================================
// Fixtures: Canonical FSSAI Baseline & Progression States
// ============================================================================

const BASELINE_AGGREGATE = {
  application: {
    id: 'app-fssai-001',
    applicant_id: 'demo_applicant_01',
    policy_name: 'FSSAI Internship Policy 2024',
    created_at: '2026-10-08T10:00:00Z',
  },
  metrics: {
    total: 8,
    verified: 4,
    needs_verification: 2,
    missing: 2,
    rejected: 0,
    in_progress: 0,
    active_blockers: 2,
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
      id: 'req-07',
      code: 'FSSAI-REQ-07',
      title: 'College NOC',
      description: 'No Objection Certificate from Head of Institution on official college letterhead.',
      category: 'DOCUMENTATION',
      blocking_stages: ['JOINING'],
      verification_mode: 'HUMAN_CONFIRMATION',
      state: 'MISSING',
      evidence_links: [],
      rejection_reason: null,
      source_citation: {
        section: 'Section 4(a) - Mandatory Clearances',
        page: 2,
        quote: 'Candidates must submit a No Objection Certificate from the Head of the Institution/College at the time of joining.',
      },
    },
    {
      id: 'req-08',
      code: 'FSSAI-REQ-08',
      title: 'Character Certificate',
      description: 'Certificate from Gazetted Officer.',
      category: 'DOCUMENTATION',
      blocking_stages: ['JOINING'],
      verification_mode: 'HUMAN_CONFIRMATION',
      state: 'MISSING',
      evidence_links: [],
      rejection_reason: null,
      source_citation: null,
    },
  ],
};

test('LifecycleModel - Allowed extensions include PDF and standard image formats', () => {
  assert.ok(ALLOWED_EVIDENCE_EXTENSIONS.includes('.pdf'));
  assert.ok(ALLOWED_EVIDENCE_EXTENSIONS.includes('.png'));
  assert.ok(ALLOWED_EVIDENCE_EXTENSIONS.includes('.jpg'));
  assert.ok(ALLOWED_EVIDENCE_EXTENSIONS.includes('.jpeg'));
});

// ============================================================================
// 1. Available Actions by Lifecycle State
// ============================================================================

test('LifecycleModel - Available actions for MISSING state', () => {
  const transitions = getAvailableTransitions('MISSING');
  assert.equal(transitions.canRequest, true);
  assert.equal(transitions.canUpload, true);
  assert.equal(transitions.canVerify, false);
  assert.equal(transitions.canReject, false);
  assert.equal(transitions.isVerified, false);
  assert.equal(transitions.isRejected, false);
});

test('LifecycleModel - Available actions for IN_PROGRESS state', () => {
  const transitions = getAvailableTransitions('IN_PROGRESS');
  assert.equal(transitions.canRequest, false);
  assert.equal(transitions.canUpload, true);
  assert.equal(transitions.canVerify, false);
  assert.equal(transitions.canReject, false);
  assert.equal(transitions.isVerified, false);
  assert.equal(transitions.isRejected, false);
});

test('LifecycleModel - Available actions for EVIDENCE_RECEIVED state', () => {
  const transitions = getAvailableTransitions('EVIDENCE_RECEIVED');
  assert.equal(transitions.canRequest, false);
  assert.equal(transitions.canUpload, true);
  assert.equal(transitions.canVerify, true);
  assert.equal(transitions.canReject, true);
  assert.equal(transitions.isVerified, false);
  assert.equal(transitions.isRejected, false);
});

test('LifecycleModel - Available actions for NEEDS_VERIFICATION state', () => {
  const transitions = getAvailableTransitions('NEEDS_VERIFICATION');
  assert.equal(transitions.canRequest, false);
  assert.equal(transitions.canUpload, true);
  assert.equal(transitions.canVerify, true);
  assert.equal(transitions.canReject, true);
  assert.equal(transitions.isVerified, false);
  assert.equal(transitions.isRejected, false);
});

test('LifecycleModel - Available actions for REJECTED state', () => {
  const transitions = getAvailableTransitions('REJECTED');
  assert.equal(transitions.canRequest, false);
  assert.equal(transitions.canUpload, true); // Allows replacement evidence upload
  assert.equal(transitions.canVerify, false);
  assert.equal(transitions.canReject, false);
  assert.equal(transitions.isVerified, false);
  assert.equal(transitions.isRejected, true);
});

test('LifecycleModel - Available actions for VERIFIED state (terminal)', () => {
  const transitions = getAvailableTransitions('VERIFIED');
  assert.equal(transitions.canRequest, false);
  assert.equal(transitions.canUpload, false);
  assert.equal(transitions.canVerify, false);
  assert.equal(transitions.canReject, false);
  assert.equal(transitions.isVerified, true);
  assert.equal(transitions.isRejected, false);
});

test('LifecycleModel - Handles unknown or null state safely', () => {
  const nullTransitions = getAvailableTransitions(null);
  assert.equal(nullTransitions.canRequest, false);
  assert.equal(nullTransitions.canUpload, false);
  assert.equal(nullTransitions.canVerify, false);

  const unknownTransitions = getAvailableTransitions('NON_EXISTENT');
  assert.equal(unknownTransitions.canRequest, false);
  assert.equal(unknownTransitions.canUpload, false);
});

// ============================================================================
// 2. Evidence Upload File Validations
// ============================================================================

test('LifecycleModel - Evidence validation rejects missing or null file', () => {
  const resNull = validateEvidenceFile(null);
  assert.equal(resNull.valid, false);
  assert.match(resNull.error, /select a file/i);

  const resUndefined = validateEvidenceFile(undefined);
  assert.equal(resUndefined.valid, false);
});

test('LifecycleModel - Evidence validation rejects 0-byte file', () => {
  const emptyFile = { name: 'college_noc.pdf', size: 0, type: 'application/pdf' };
  const res = validateEvidenceFile(emptyFile);
  assert.equal(res.valid, false);
  assert.match(res.error, /file is empty/i);
});

test('LifecycleModel - Evidence validation rejects files exceeding 10 MB', () => {
  const oversizeFile = {
    name: 'large_scan.pdf',
    size: MAX_EVIDENCE_SIZE_BYTES + 1024,
    type: 'application/pdf',
  };
  const res = validateEvidenceFile(oversizeFile);
  assert.equal(res.valid, false);
  assert.match(res.error, /exceeds maximum limit of 10 MB/i);
});

test('LifecycleModel - Evidence validation rejects unsupported file extensions', () => {
  const invalidFiles = [
    { name: 'malicious.exe', size: 2048, type: 'application/x-msdownload' },
    { name: 'document.docx', size: 2048, type: 'application/vnd.openxmlformats' },
    { name: 'archive.zip', size: 2048, type: 'application/zip' },
  ];

  for (const f of invalidFiles) {
    const res = validateEvidenceFile(f);
    assert.equal(res.valid, false);
    assert.match(res.error, /Unsupported file type/i);
  }
});

test('LifecycleModel - Evidence validation accepts valid PDF, PNG, and JPG files <= 10 MB', () => {
  const validFiles = [
    { name: 'college_noc.pdf', size: 250 * 1024, type: 'application/pdf' },
    { name: 'scan_id.png', size: 500 * 1024, type: 'image/png' },
    { name: 'signature.jpg', size: 120 * 1024, type: 'image/jpeg' },
    { name: 'document.JPEG', size: 10 * 1024 * 1024, type: 'image/jpeg' },
  ];

  for (const f of validFiles) {
    const res = validateEvidenceFile(f);
    assert.equal(res.valid, true);
    assert.equal(res.error, null);
  }
});

// ============================================================================
// 3. Rejection Reason Validations
// ============================================================================

test('LifecycleModel - Reject reason validation requires non-empty string', () => {
  assert.equal(validateRejectionReason(null).valid, false);
  assert.equal(validateRejectionReason('').valid, false);
  assert.equal(validateRejectionReason('   ').valid, false);
});

test('LifecycleModel - Reject reason validation enforces minimum explanatory length', () => {
  const shortRes = validateRejectionReason('no');
  assert.equal(shortRes.valid, false);
  assert.match(shortRes.error, /clear and descriptive/i);
});

test('LifecycleModel - Reject reason validation accepts meaningful explanation', () => {
  const validRes = validateRejectionReason('Institutional seal is not legible on page 1.');
  assert.equal(validRes.valid, true);
  assert.equal(validRes.error, null);
});

// ============================================================================
// 4. File Size Formatting Utility
// ============================================================================

test('LifecycleModel - formatFileSize formats byte values cleanly', () => {
  assert.equal(formatFileSize(0), '0 B');
  assert.equal(formatFileSize(500), '500 B');
  assert.equal(formatFileSize(1024), '1 KB');
  assert.equal(formatFileSize(1536), '1.5 KB');
  assert.equal(formatFileSize(1048576), '1 MB');
  assert.equal(formatFileSize(10485760), '10 MB');
  assert.equal(formatFileSize(null), '—');
  assert.equal(formatFileSize(-1), '—');
});

// ============================================================================
// 5. Complete Canonical Mutation Flow & Aggregate Replacement
// ============================================================================

test('LifecycleFlow - Step 1: Request Requirement transitions MISSING -> IN_PROGRESS', () => {
  const selectedId = 'req-07';
  let aggregate = JSON.parse(JSON.stringify(BASELINE_AGGREGATE));

  // Initial state check
  const initialReq = aggregate.requirements.find((r) => r.id === selectedId);
  assert.equal(initialReq.state, 'MISSING');
  assert.equal(getAvailableTransitions(initialReq.state).canRequest, true);

  // Simulated backend response for POST /api/v1/requirements/req-07/request
  const requestedAggregate = {
    ...aggregate,
    metrics: {
      ...aggregate.metrics,
      missing: 1,
      in_progress: 1,
    },
    requirements: aggregate.requirements.map((r) =>
      r.id === selectedId ? { ...r, state: 'IN_PROGRESS' } : r
    ),
  };

  // State update simulation (ApplicationContext.setAggregate)
  aggregate = requestedAggregate;

  // Selected requirement retains selection and reflects updated state
  const updatedReq = aggregate.requirements.find((r) => r.id === selectedId);
  assert.equal(updatedReq.state, 'IN_PROGRESS');
  assert.equal(getAvailableTransitions(updatedReq.state).canRequest, false);
  assert.equal(getAvailableTransitions(updatedReq.state).canUpload, true);
  // Metrics reflect backend aggregate
  assert.equal(aggregate.metrics.in_progress, 1);
  assert.equal(aggregate.metrics.missing, 1);
});

test('LifecycleFlow - Step 2: Upload Evidence transitions IN_PROGRESS -> EVIDENCE_RECEIVED', () => {
  const selectedId = 'req-07';
  let aggregate = JSON.parse(JSON.stringify(BASELINE_AGGREGATE));

  // Simulated backend response for POST /api/v1/requirements/req-07/evidence
  const evidenceUploadedAggregate = {
    ...aggregate,
    metrics: {
      ...aggregate.metrics,
      missing: 1,
      needs_verification: 3,
    },
    requirements: aggregate.requirements.map((r) =>
      r.id === selectedId
        ? {
            ...r,
            state: 'EVIDENCE_RECEIVED',
            evidence_links: [
              {
                id: 'link-01',
                evidence_item_id: 'ev-item-01',
                file_name: 'college_noc.pdf',
                file_size: 245760,
                file_type: 'application/pdf',
                link_notes: 'Issued by Registrar',
                linked_at: '2026-10-08T12:00:00Z',
              },
            ],
          }
        : r
    ),
  };

  // Context replacement
  aggregate = evidenceUploadedAggregate;

  const updatedReq = aggregate.requirements.find((r) => r.id === selectedId);
  assert.equal(updatedReq.state, 'EVIDENCE_RECEIVED');
  assert.equal(updatedReq.evidence_links.length, 1);
  assert.equal(updatedReq.evidence_links[0].file_name, 'college_noc.pdf');

  const transitions = getAvailableTransitions(updatedReq.state);
  assert.equal(transitions.canVerify, true);
  assert.equal(transitions.canReject, true);
  assert.equal(transitions.canUpload, true);
});

test('LifecycleFlow - Step 3: Verify Requirement transitions EVIDENCE_RECEIVED -> VERIFIED and updates blockers', () => {
  const selectedId = 'req-07';
  let aggregate = JSON.parse(JSON.stringify(BASELINE_AGGREGATE));

  // Simulated backend response for POST /api/v1/requirements/req-07/verify
  // Resolving College NOC decreases active blockers from 2 -> 1 and increases verified 4 -> 5
  const verifiedAggregate = {
    ...aggregate,
    metrics: {
      ...aggregate.metrics,
      verified: 5,
      needs_verification: 2,
      missing: 1,
      active_blockers: 1, // Character Certificate is now the sole remaining blocker
    },
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
    requirements: aggregate.requirements.map((r) =>
      r.id === selectedId
        ? {
            ...r,
            state: 'VERIFIED',
            verified_by: 'institutional_reviewer',
            verified_at: '2026-10-08T12:15:00Z',
          }
        : r
    ),
  };

  // Context replacement
  aggregate = verifiedAggregate;

  const verifiedReq = aggregate.requirements.find((r) => r.id === selectedId);
  assert.equal(verifiedReq.state, 'VERIFIED');
  assert.equal(verifiedReq.verified_by, 'institutional_reviewer');

  // Available transitions
  const transitions = getAvailableTransitions(verifiedReq.state);
  assert.equal(transitions.isVerified, true);
  assert.equal(transitions.canVerify, false);
  assert.equal(transitions.canReject, false);
  assert.equal(transitions.canUpload, false);

  // Global readiness reflects backend aggregate
  assert.equal(aggregate.metrics.verified, 5);
  assert.equal(aggregate.metrics.active_blockers, 1);
  assert.equal(aggregate.gate_readiness.is_ready, false);
  assert.equal(aggregate.gate_readiness.active_blockers.length, 1);
  assert.equal(aggregate.gate_readiness.active_blockers[0].code, 'FSSAI-REQ-08');
});

test('LifecycleFlow - Alternative Flow: Reject Requirement records reason and supports recovery upload', () => {
  const selectedId = 'req-07';
  let aggregate = JSON.parse(JSON.stringify(BASELINE_AGGREGATE));

  // Simulated backend response for POST /api/v1/requirements/req-07/reject
  const rejectionReason = 'College seal missing from scanned NOC document.';
  const rejectedAggregate = {
    ...aggregate,
    metrics: {
      ...aggregate.metrics,
      rejected: 1,
      missing: 1,
      active_blockers: 2,
    },
    requirements: aggregate.requirements.map((r) =>
      r.id === selectedId
        ? {
            ...r,
            state: 'REJECTED',
            rejection_reason: rejectionReason,
          }
        : r
    ),
  };

  // Context replacement
  aggregate = rejectedAggregate;

  const rejectedReq = aggregate.requirements.find((r) => r.id === selectedId);
  assert.equal(rejectedReq.state, 'REJECTED');
  assert.equal(rejectedReq.rejection_reason, rejectionReason);

  // Transitions: can upload replacement evidence to recover
  const transitions = getAvailableTransitions(rejectedReq.state);
  assert.equal(transitions.isRejected, true);
  assert.equal(transitions.canUpload, true);
  assert.equal(transitions.canVerify, false);
  assert.equal(transitions.canReject, false);
});
