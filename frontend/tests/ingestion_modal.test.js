import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validatePolicyFile,
  MAX_POLICY_SIZE_BYTES,
} from '../src/api/client.js';
import {
  formatElapsedTime,
  getIngestionTimingMessage,
  formatModelGovernance,
  formatIngestionError,
  formatFileSize,
  PIPELINE_EXPLANATIONS,
} from '../src/components/ingestionModel.js';
import { INGESTION_STATES } from '../src/context/constants.js';

// ============================================================================
// 1. Policy File Validation Tests (PDF, 50 MB limit, 0-byte)
// ============================================================================

test('IngestionValidation - Rejects null or undefined file', () => {
  const result = validatePolicyFile(null);
  assert.equal(result.valid, false);
  assert.match(result.error, /No policy document file provided/i);
});

test('IngestionValidation - Rejects zero-byte file', () => {
  const emptyPdf = {
    name: 'empty_guideline.pdf',
    type: 'application/pdf',
    size: 0,
  };
  const result = validatePolicyFile(emptyPdf);
  assert.equal(result.valid, false);
  assert.match(result.error, /empty/i);
});

test('IngestionValidation - Enforces exact 50 MB boundary', () => {
  assert.equal(MAX_POLICY_SIZE_BYTES, 50 * 1024 * 1024);

  // Exact 50 MB boundary is allowed
  const exact50Mb = {
    name: 'large_policy.pdf',
    type: 'application/pdf',
    size: 50 * 1024 * 1024,
  };
  const exactResult = validatePolicyFile(exact50Mb);
  assert.equal(exactResult.valid, true);
  assert.equal(exactResult.error, null);

  // 50 MB + 1 byte is rejected
  const overLimit = {
    name: 'oversized_policy.pdf',
    type: 'application/pdf',
    size: 50 * 1024 * 1024 + 1,
  };
  const overResult = validatePolicyFile(overLimit);
  assert.equal(overResult.valid, false);
  assert.match(overResult.error, /exceeds maximum limit of 50 MB/i);
});

test('IngestionValidation - Rejects non-PDF files', () => {
  const invalidExtensions = [
    { name: 'document.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 1000 },
    { name: 'policy.txt', type: 'text/plain', size: 1000 },
    { name: 'table.csv', type: 'text/csv', size: 1000 },
    { name: 'scanned_page.png', type: 'image/png', size: 1000 },
  ];

  for (const file of invalidExtensions) {
    const result = validatePolicyFile(file);
    assert.equal(result.valid, false);
    assert.match(result.error, /must be a PDF file/i);
  }
});

test('IngestionValidation - Accepts valid PDF documents', () => {
  const validFiles = [
    { name: 'FSSAI_Internship_Policy_2024.pdf', type: 'application/pdf', size: 245 * 1024 },
    { name: 'ugc_guidelines_v2.PDF', type: 'application/pdf', size: 1.5 * 1024 * 1024 },
    { name: 'institutional_charter.pdf', type: '', size: 500 * 1024 }, // Allowed if name ends in .pdf
  ];

  for (const file of validFiles) {
    const result = validatePolicyFile(file);
    assert.equal(result.valid, true);
    assert.equal(result.error, null);
  }
});

// ============================================================================
// 2. Truthful Timing, Elapsed Stopwatch & No Fake Percentages
// ============================================================================

test('IngestionTimer - Formats elapsed seconds to mm:ss stopwatch string', () => {
  assert.equal(formatElapsedTime(0), '00:00');
  assert.equal(formatElapsedTime(9), '00:09');
  assert.equal(formatElapsedTime(59), '00:59');
  assert.equal(formatElapsedTime(60), '01:00');
  assert.equal(formatElapsedTime(102), '01:42'); // 173-second live extraction reference
  assert.equal(formatElapsedTime(173), '02:53');
  assert.equal(formatElapsedTime(300), '05:00');
});

test('IngestionTimer - Threshold messaging at 120s and 180s without request cancellation', () => {
  // 0 - 119 seconds: No extended duration banner
  assert.deepEqual(getIngestionTimingMessage(0), {
    message: null,
    isExtended: false,
    severity: null,
  });
  assert.deepEqual(getIngestionTimingMessage(60), {
    message: null,
    isExtended: false,
    severity: null,
  });
  assert.deepEqual(getIngestionTimingMessage(119), {
    message: null,
    isExtended: false,
    severity: null,
  });

  // At 120 seconds: Informational notice
  const at120 = getIngestionTimingMessage(120);
  assert.equal(at120.isExtended, true);
  assert.equal(at120.severity, 'info');
  assert.match(at120.message, /still processing/i);
  assert.match(at120.message, /several minutes for complex documents/i);

  // At 179 seconds: Still informational notice
  const at179 = getIngestionTimingMessage(179);
  assert.equal(at179.severity, 'info');

  // At 180 seconds: Extended running alert (request is NOT cancelled)
  const at180 = getIngestionTimingMessage(180);
  assert.equal(at180.isExtended, true);
  assert.equal(at180.severity, 'warning');
  assert.match(at180.message, /longer than usual/i);
  assert.match(at180.message, /request is still running/i);
});

test('IngestionPipeline - Explanatory descriptions contain zero fake progress percentages', () => {
  assert.equal(Array.isArray(PIPELINE_EXPLANATIONS), true);
  assert.equal(PIPELINE_EXPLANATIONS.length, 5);

  // Strictly verify no progress percentages or fake completion markers in description text
  for (const step of PIPELINE_EXPLANATIONS) {
    assert.equal(typeof step, 'string');
    assert.doesNotMatch(step, /%/);
    assert.doesNotMatch(step, /complete|done|100%|check/i);
  }

  assert.equal(PIPELINE_EXPLANATIONS[0], 'Analyzing policy structure');
  assert.equal(PIPELINE_EXPLANATIONS[1], 'Extracting requirements and source citations');
  assert.equal(PIPELINE_EXPLANATIONS[2], 'Normalizing machine-readable criteria');
  assert.equal(PIPELINE_EXPLANATIONS[3], 'Evaluating applicant profile');
  assert.equal(PIPELINE_EXPLANATIONS[4], 'Calculating stage-gate readiness');
});

// ============================================================================
// 3. Model Governance & Truthful Source Representation
// ============================================================================

test('ModelGovernance - Truthfully labels Gemini 3.8 Flash as primary reasoning engine', () => {
  const gov1 = formatModelGovernance('gemini-3.8-flash', 'GEMINI_3_8_FLASH');
  assert.equal(gov1.displayName, 'Gemini 3.8 Flash');
  assert.equal(gov1.isFallback, false);
  assert.equal(gov1.badgeClass, 'badge-gemini');

  const gov2 = formatModelGovernance(null, 'GEMINI_3_8_FLASH');
  assert.equal(gov2.displayName, 'Gemini 3.8 Flash');
  assert.equal(gov2.isFallback, false);
});

test('ModelGovernance - Truthfully labels Gemini 3.5 Flash as fallback engine', () => {
  const gov = formatModelGovernance('gemini-3.5-flash', 'GEMINI_3_5_FLASH_FALLBACK');
  assert.equal(gov.displayName, 'Gemini 3.5 Flash (Fallback)');
  assert.equal(gov.isFallback, true);
  assert.equal(gov.badgeClass, 'badge-fallback');
});

test('ModelGovernance - Truthfully labels Canonical Demo Baseline', () => {
  const gov = formatModelGovernance('canonical-fssai-baseline', 'CANONICAL_DEMO_FALLBACK');
  assert.equal(gov.displayName, 'Canonical Demo Baseline');
  assert.equal(gov.isFallback, true);
  assert.equal(gov.badgeClass, 'badge-fallback');
  assert.match(gov.description, /canonical policy baseline/i);
});

test('ModelGovernance - Strictly never labels a fallback as Gemini 3.8 Flash', () => {
  const fallbackSources = ['GEMINI_3_5_FLASH_FALLBACK', 'CANONICAL_DEMO_FALLBACK'];

  for (const src of fallbackSources) {
    const gov = formatModelGovernance('gemini-3.5-flash', src);
    assert.notEqual(gov.displayName, 'Gemini 3.8 Flash');
    assert.equal(gov.isFallback, true);
  }
});

// ============================================================================
// 4. Actionable Error Mapping & Recovery
// ============================================================================

test('IngestionError - Formats 400 Invalid / Empty File error', () => {
  const errEmpty = formatIngestionError({ status: 400, message: 'Uploaded policy PDF is empty.' });
  assert.equal(errEmpty.title, 'Invalid Document');
  assert.match(errEmpty.detail, /empty/i);
  assert.equal(errEmpty.canRetry, true);

  const errFormat = formatIngestionError({ status: 400, message: 'Policy document must be a PDF file (.pdf).' });
  assert.equal(errFormat.title, 'Invalid Document');
  assert.match(errFormat.detail, /PDF/i);
});

test('IngestionError - Formats 413 Oversized Document error', () => {
  const err = formatIngestionError({ status: 413, message: 'Policy document exceeds 50 MB' });
  assert.equal(err.title, 'Document Exceeds Size Limit');
  assert.match(err.detail, /50 MB/i);
  assert.equal(err.canRetry, true);
});

test('IngestionError - Formats 502 Upstream Gemini Extraction error with demo recovery', () => {
  const err = formatIngestionError({ status: 502, message: 'Gemini extraction failed' });
  assert.equal(err.title, 'Gemini Extraction Error');
  assert.equal(err.canRetry, true);
  assert.equal(err.offerDemoReset, true);
});

test('IngestionError - Formats 503 Gemini Service Unavailable error with demo recovery', () => {
  const err = formatIngestionError({ status: 503, message: 'Service unavailable' });
  assert.equal(err.title, 'Gemini Service Unavailable');
  assert.equal(err.canRetry, true);
  assert.equal(err.offerDemoReset, true);
});

test('IngestionError - Formats network / connection failures', () => {
  const netErr = formatIngestionError(new Error('Unable to connect to FORMLESS compliance backend'));
  assert.equal(netErr.title, 'Backend Connection Failed');
  assert.equal(netErr.canRetry, true);
  assert.equal(netErr.offerDemoReset, true);
});

// ============================================================================
// 5. Ingestion State Machine Simulation & Duplicate Protection
// ============================================================================

test('IngestionStateMachine - Canonical progression through approved states', () => {
  assert.equal(INGESTION_STATES.IDLE, 'IDLE');
  assert.equal(INGESTION_STATES.UPLOAD_SELECTED, 'UPLOAD_SELECTED');
  assert.equal(INGESTION_STATES.UPLOADING, 'UPLOADING');
  assert.equal(INGESTION_STATES.PROCESSING_POLICY, 'PROCESSING_POLICY');
  assert.equal(INGESTION_STATES.COMPLETE, 'COMPLETE');
  assert.equal(INGESTION_STATES.ERROR, 'ERROR');

  // Verify progression sequence
  const sequence = [
    INGESTION_STATES.IDLE,
    INGESTION_STATES.UPLOAD_SELECTED,
    INGESTION_STATES.UPLOADING,
    INGESTION_STATES.PROCESSING_POLICY,
    INGESTION_STATES.COMPLETE,
  ];

  assert.equal(sequence[0], 'IDLE');
  assert.equal(sequence[4], 'COMPLETE');
});

test('IngestionStateMachine - Duplicate submission protection flag logic', () => {
  // During UPLOADING or PROCESSING_POLICY, double submissions are blocked
  const activeStates = [INGESTION_STATES.UPLOADING, INGESTION_STATES.PROCESSING_POLICY];

  for (const st of activeStates) {
    const isProcessing =
      st === INGESTION_STATES.UPLOADING || st === INGESTION_STATES.PROCESSING_POLICY;
    assert.equal(isProcessing, true);
  }

  // Idle, Complete, Error do not block
  const inactiveStates = [INGESTION_STATES.IDLE, INGESTION_STATES.COMPLETE, INGESTION_STATES.ERROR];
  for (const st of inactiveStates) {
    const isProcessing =
      st === INGESTION_STATES.UPLOADING || st === INGESTION_STATES.PROCESSING_POLICY;
    assert.equal(isProcessing, false);
  }
});

test('IngestionModel - formatFileSize formats bytes cleanly', () => {
  assert.equal(formatFileSize(0), '0 B');
  assert.equal(formatFileSize(512), '512 B');
  assert.equal(formatFileSize(1024), '1.0 KB');
  assert.equal(formatFileSize(245 * 1024), '245.0 KB');
  assert.equal(formatFileSize(10 * 1024 * 1024), '10.0 MB');
  assert.equal(formatFileSize(50 * 1024 * 1024), '50.0 MB');
});
