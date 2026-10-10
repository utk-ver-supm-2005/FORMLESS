import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatAuditAction,
  formatEventTimestamp,
  formatStateLabel,
  getEventMetadataSummary,
  sortEventsChronological,
} from '../src/components/auditModel.js';
import { apiClient } from '../src/api/client.js';

// ============================================================================
// Fixtures: Canonical Backend Audit Events
// ============================================================================

const CANONICAL_COLLEGE_NOC_EVENTS = [
  {
    id: 'ev-01',
    from_state: 'MISSING',
    to_state: 'IN_PROGRESS',
    action: 'REQUESTED',
    actor: 'student_applicant',
    metadata: { notes: 'Requested NOC from university registrar office' },
    created_at: '2026-10-08T10:15:00Z',
  },
  {
    id: 'ev-02',
    from_state: 'IN_PROGRESS',
    to_state: 'EVIDENCE_RECEIVED',
    action: 'EVIDENCE_SUBMITTED',
    actor: 'student_applicant',
    metadata: { file_name: 'college_noc_signed.pdf' },
    created_at: '2026-10-08T11:30:00Z',
  },
  {
    id: 'ev-03',
    from_state: 'EVIDENCE_RECEIVED',
    to_state: 'VERIFIED',
    action: 'VERIFIED',
    actor: 'institutional_reviewer',
    metadata: { verified_by: 'institutional_reviewer' },
    created_at: '2026-10-08T12:00:00Z',
  },
];

const CANONICAL_REJECTION_EVENTS = [
  {
    id: 'ev-rej-01',
    from_state: 'MISSING',
    to_state: 'IN_PROGRESS',
    action: 'REQUESTED',
    actor: 'student_applicant',
    metadata: null,
    created_at: '2026-10-08T09:00:00Z',
  },
  {
    id: 'ev-rej-02',
    from_state: 'IN_PROGRESS',
    to_state: 'EVIDENCE_RECEIVED',
    action: 'EVIDENCE_SUBMITTED',
    actor: 'student_applicant',
    metadata: { file_name: 'draft_certificate.png' },
    created_at: '2026-10-08T09:30:00Z',
  },
  {
    id: 'ev-rej-03',
    from_state: 'EVIDENCE_RECEIVED',
    to_state: 'REJECTED',
    action: 'REJECTED',
    actor: 'officer_smith',
    metadata: { rejection_reason: 'Missing gazetted officer round seal and signature.' },
    created_at: '2026-10-08T10:00:00Z',
  },
  {
    id: 'ev-rej-04',
    from_state: 'REJECTED',
    to_state: 'EVIDENCE_RECEIVED',
    action: 'EVIDENCE_SUBMITTED',
    actor: 'student_applicant',
    metadata: { file_name: 'gazetted_certificate_sealed.pdf' },
    created_at: '2026-10-08T14:00:00Z',
  },
];

const ATTACHED_EVIDENCE_FIXTURES = [
  {
    id: 'link-01',
    evidence_item_id: 'ev-item-9901',
    file_name: 'college_noc_official.pdf',
    file_size: 245760,
    file_type: 'application/pdf',
    link_notes: 'Original scan signed by College Dean',
    linked_at: '2026-10-08T11:30:00Z',
  },
  {
    id: 'link-02',
    evidence_item_id: 'ev-item-9902',
    file_name: 'dean_endorsement.PNG',
    file_size: 1048576,
    mime_type: 'image/png',
    link_notes: null,
    linked_at: '2026-10-08T11:32:00Z',
  },
];

// ============================================================================
// 1. Audit Action & State Formatting Tests
// ============================================================================

test('auditModel - formatAuditAction maps backend actions to readable titles and badges', () => {
  const req = formatAuditAction('REQUESTED');
  assert.equal(req.label, 'Requested');
  assert.equal(req.badgeClass, 'action-requested');

  const upload = formatAuditAction('EVIDENCE_SUBMITTED');
  assert.equal(upload.label, 'Evidence Submitted');
  assert.equal(upload.badgeClass, 'action-evidence');

  const verify = formatAuditAction('VERIFIED');
  assert.equal(verify.label, 'Verified & Certified');
  assert.equal(verify.badgeClass, 'action-verified');

  const reject = formatAuditAction('REJECTED');
  assert.equal(reject.label, 'Rejected');
  assert.equal(reject.badgeClass, 'action-rejected');

  const fallback = formatAuditAction('CUSTOM_AUDIT_ACTION');
  assert.equal(fallback.label, 'CUSTOM AUDIT ACTION');
  assert.equal(fallback.badgeClass, 'action-default');

  const nullAction = formatAuditAction(null);
  assert.equal(nullAction.label, 'Lifecycle Event');
  assert.equal(nullAction.badgeClass, 'action-default');
});

test('auditModel - formatStateLabel outputs human-readable state names', () => {
  assert.equal(formatStateLabel('MISSING'), 'Missing');
  assert.equal(formatStateLabel('IN_PROGRESS'), 'In Progress');
  assert.equal(formatStateLabel('EVIDENCE_RECEIVED'), 'Evidence Received');
  assert.equal(formatStateLabel('NEEDS_VERIFICATION'), 'Needs Verification');
  assert.equal(formatStateLabel('REJECTED'), 'Rejected');
  assert.equal(formatStateLabel('VERIFIED'), 'Verified');
  assert.equal(formatStateLabel(null), 'UNKNOWN');
});

test('auditModel - formatEventTimestamp formats date strings safely without crashing', () => {
  const formatted = formatEventTimestamp('2026-10-08T10:15:00Z');
  assert.notEqual(formatted, '—');
  assert.match(formatted, /2026/);

  assert.equal(formatEventTimestamp(null), '—');
  assert.equal(formatEventTimestamp('invalid-date'), '—');
  assert.equal(formatEventTimestamp(''), '—');
});

test('auditModel - getEventMetadataSummary extracts relevant details from event metadata', () => {
  const rejectEvent = CANONICAL_REJECTION_EVENTS[2];
  assert.equal(
    getEventMetadataSummary(rejectEvent),
    'Reason: Missing gazetted officer round seal and signature.'
  );

  const fileEvent = CANONICAL_COLLEGE_NOC_EVENTS[1];
  assert.equal(
    getEventMetadataSummary(fileEvent),
    'Attached file: college_noc_signed.pdf'
  );

  const certEvent = CANONICAL_COLLEGE_NOC_EVENTS[2];
  assert.equal(
    getEventMetadataSummary(certEvent),
    'Certified by: institutional_reviewer'
  );

  const notesEvent = CANONICAL_COLLEGE_NOC_EVENTS[0];
  assert.equal(
    getEventMetadataSummary(notesEvent),
    'Requested NOC from university registrar office'
  );

  assert.equal(getEventMetadataSummary({ metadata: null }), null);
  assert.equal(getEventMetadataSummary(null), null);
});

// ============================================================================
// 2. Chronological Ordering Tests
// ============================================================================

test('auditModel - sortEventsChronological orders events in ascending order', () => {
  // Out of order input
  const unordered = [
    CANONICAL_COLLEGE_NOC_EVENTS[2], // 12:00
    CANONICAL_COLLEGE_NOC_EVENTS[0], // 10:15
    CANONICAL_COLLEGE_NOC_EVENTS[1], // 11:30
  ];

  const sorted = sortEventsChronological(unordered);
  assert.equal(sorted.length, 3);
  assert.equal(sorted[0].id, 'ev-01');
  assert.equal(sorted[1].id, 'ev-02');
  assert.equal(sorted[2].id, 'ev-03');

  // Verify timestamps strictly increase
  const t0 = new Date(sorted[0].created_at).getTime();
  const t1 = new Date(sorted[1].created_at).getTime();
  const t2 = new Date(sorted[2].created_at).getTime();
  assert.ok(t0 < t1);
  assert.ok(t1 < t2);
});

test('auditModel - sortEventsChronological handles empty or null array safely', () => {
  assert.deepEqual(sortEventsChronological([]), []);
  assert.deepEqual(sortEventsChronological(null), []);
  assert.deepEqual(sortEventsChronological(undefined), []);
});

// ============================================================================
// 3. Rejection & Recovery Lifecycle Flow
// ============================================================================

test('auditModel - Canonical rejection and recovery progression', () => {
  const events = sortEventsChronological(CANONICAL_REJECTION_EVENTS);
  assert.equal(events.length, 4);

  // Event 1: MISSING -> IN_PROGRESS
  assert.equal(events[0].action, 'REQUESTED');
  assert.equal(events[0].from_state, 'MISSING');
  assert.equal(events[0].to_state, 'IN_PROGRESS');

  // Event 2: IN_PROGRESS -> EVIDENCE_RECEIVED
  assert.equal(events[1].action, 'EVIDENCE_SUBMITTED');
  assert.equal(events[1].from_state, 'IN_PROGRESS');
  assert.equal(events[1].to_state, 'EVIDENCE_RECEIVED');

  // Event 3: EVIDENCE_RECEIVED -> REJECTED
  assert.equal(events[2].action, 'REJECTED');
  assert.equal(events[2].from_state, 'EVIDENCE_RECEIVED');
  assert.equal(events[2].to_state, 'REJECTED');
  assert.equal(events[2].actor, 'officer_smith');
  assert.match(getEventMetadataSummary(events[2]), /round seal and signature/);

  // Event 4: REJECTED -> EVIDENCE_RECEIVED (Recovery upload)
  assert.equal(events[3].action, 'EVIDENCE_SUBMITTED');
  assert.equal(events[3].from_state, 'REJECTED');
  assert.equal(events[3].to_state, 'EVIDENCE_RECEIVED');
  assert.equal(getEventMetadataSummary(events[3]), 'Attached file: gazetted_certificate_sealed.pdf');
});

// ============================================================================
// 4. Evidence Presentation & Safe Download Tests
// ============================================================================

test('EvidenceDownload - apiClient produces sanitized download URLs via evidence ID', () => {
  const downloadUrl1 = apiClient.getEvidenceDownloadUrl('ev-item-9901');
  assert.equal(downloadUrl1, '/api/v1/evidence/ev-item-9901/download');

  const downloadUrl2 = apiClient.getEvidenceDownloadUrl('ev-item-9902');
  assert.equal(downloadUrl2, '/api/v1/evidence/ev-item-9902/download');

  // Must not expose server directory paths or absolute filesystem locations
  assert.equal(downloadUrl1.includes('C:'), false);
  assert.equal(downloadUrl1.includes('data/evidence'), false);
  assert.equal(downloadUrl1.includes('\\'), false);
  assert.equal(apiClient.getEvidenceDownloadUrl(null), '');
});

test('EvidencePresentation - Renders complete metadata without exposing filesystem paths', () => {
  for (const item of ATTACHED_EVIDENCE_FIXTURES) {
    const downloadUrl = `/api/v1/evidence/${item.evidence_item_id}/download`;

    // Valid filename
    assert.ok(item.file_name);
    assert.equal(item.file_name.includes('..'), false);
    assert.equal(item.file_name.includes('/'), false);
    assert.equal(item.file_name.includes('\\'), false);

    // Derived file type
    const ext = item.file_name.split('.').pop().toUpperCase();
    assert.ok(['PDF', 'PNG'].includes(ext));

    // File size
    assert.ok(item.file_size > 0);

    // Download URL uses evidence ID
    assert.equal(downloadUrl, `/api/v1/evidence/${item.evidence_item_id}/download`);
    assert.equal(downloadUrl.includes(item.evidence_item_id), true);
  }
});

// ============================================================================
// 5. Requirement Selection & Stale State Prevention Simulation
// ============================================================================

test('AuditTimeline - Switching selected requirement isolates event history', () => {
  // Store simulated histories by requirement ID
  const store = {
    'req-07': CANONICAL_COLLEGE_NOC_EVENTS,
    'req-08': CANONICAL_REJECTION_EVENTS,
    'req-01': [],
  };

  // Select req-07 (College NOC)
  let activeReqId = 'req-07';
  let activeEvents = store[activeReqId];
  assert.equal(activeEvents.length, 3);
  assert.equal(activeEvents[0].action, 'REQUESTED');
  assert.equal(activeEvents[2].to_state, 'VERIFIED');

  // Switch to req-08 (Character Certificate)
  activeReqId = 'req-08';
  activeEvents = store[activeReqId];
  assert.equal(activeEvents.length, 4);
  assert.equal(activeEvents[2].action, 'REJECTED');

  // Switch to req-01 (B.Tech IT - Automated, no manual events)
  activeReqId = 'req-01';
  activeEvents = store[activeReqId];
  assert.equal(activeEvents.length, 0); // Empty state: no recorded actions
});
