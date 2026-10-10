/**
 * Ingestion Model & Presentation Helpers
 *
 * Implements truthful model governance, long-running timer formatting,
 * static pipeline stage explanations, and actionable error normalization
 * for the FORMLESS policy ingestion pipeline.
 */

export const PIPELINE_EXPLANATIONS = [
  'Analyzing policy structure',
  'Extracting requirements and source citations',
  'Normalizing machine-readable criteria',
  'Evaluating applicant profile',
  'Calculating stage-gate readiness',
];

/**
 * Formats seconds into mm:ss display (e.g. 01:42).
 */
export function formatElapsedTime(seconds = 0) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const mins = Math.floor(s / 60);
  const remSecs = s % 60;
  const padMin = String(mins).padStart(2, '0');
  const padSec = String(remSecs).padStart(2, '0');
  return `${padMin}:${padSec}`;
}

/**
 * Provides truthful timing status cues based on elapsed duration.
 * Does NOT cancel requests or fake remaining time.
 */
export function getIngestionTimingMessage(seconds = 0) {
  if (seconds >= 180) {
    return {
      message: 'Analysis is taking longer than usual. The request is still running.',
      isExtended: true,
      severity: 'warning',
    };
  }
  if (seconds >= 120) {
    return {
      message: 'Still processing. Institutional policy extraction can take several minutes for complex documents.',
      isExtended: true,
      severity: 'info',
    };
  }
  return {
    message: null,
    isExtended: false,
    severity: null,
  };
}

/**
 * Truthfully formats model and extraction source metadata.
 * Strict rule: Never label a fallback extraction as Gemini 3.8 Flash.
 */
export function formatModelGovernance(modelUsed, extractionSource) {
  const normSource = (extractionSource || '').toUpperCase();
  const normModel = (modelUsed || '').toLowerCase();

  if (normSource === 'CANONICAL_DEMO_FALLBACK' || normModel === 'canonical-fssai-baseline') {
    return {
      displayName: 'Canonical Demo Baseline',
      isFallback: true,
      badgeClass: 'badge-fallback',
      description: 'Pre-verified canonical policy baseline loaded.',
    };
  }

  if (
    normSource === 'GEMINI_3_5_FLASH_FALLBACK' ||
    normModel === 'gemini-3.5-flash'
  ) {
    return {
      displayName: 'Gemini 3.5 Flash (Fallback)',
      isFallback: true,
      badgeClass: 'badge-fallback',
      description: 'Secondary fallback extraction model.',
    };
  }

  if (
    normSource === 'GEMINI_3_8_FLASH' ||
    normModel === 'gemini-3.8-flash'
  ) {
    return {
      displayName: 'Gemini 3.8 Flash',
      isFallback: false,
      badgeClass: 'badge-gemini',
      description: 'Primary institutional policy reasoning engine.',
    };
  }

  // Graceful generic presentation
  return {
    displayName: modelUsed || 'Automated Policy Engine',
    isFallback: false,
    badgeClass: 'badge-gemini',
    description: 'Automated policy extraction.',
  };
}

/**
 * Normalizes HTTP/API error states into user-facing, actionable error descriptions.
 */
export function formatIngestionError(error) {
  if (!error) return null;

  const status = error.status || 0;
  const msg = error.message || (typeof error === 'string' ? error : 'Policy extraction failed.');

  if (status === 400) {
    return {
      title: 'Invalid Document',
      detail: msg.includes('empty')
        ? 'The selected policy file is empty (0 bytes). Please upload a valid policy PDF.'
        : msg.includes('PDF')
          ? 'Only PDF (.pdf) documents are accepted for institutional policy analysis.'
          : msg,
      canRetry: true,
      offerDemoReset: false,
    };
  }

  if (status === 413) {
    return {
      title: 'Document Exceeds Size Limit',
      detail: 'Policy document exceeds the 50 MB limit. Please select a PDF smaller than 50 MB.',
      canRetry: true,
      offerDemoReset: false,
    };
  }

  if (status === 502) {
    return {
      title: 'Gemini Extraction Error',
      detail: 'Gemini upstream service encountered an issue processing the document structure. Please try again.',
      canRetry: true,
      offerDemoReset: true,
    };
  }

  if (status === 503) {
    return {
      title: 'Gemini Service Unavailable',
      detail: 'Gemini policy reasoning service or API key is currently unavailable. Please verify your backend configuration.',
      canRetry: true,
      offerDemoReset: true,
    };
  }

  if (status === 0 || msg.includes('Unable to connect') || msg.includes('Failed to fetch')) {
    return {
      title: 'Backend Connection Failed',
      detail: 'Unable to connect to FORMLESS compliance backend. Please ensure the server is running on port 8000.',
      canRetry: true,
      offerDemoReset: true,
    };
  }

  return {
    title: 'Policy Ingestion Failed',
    detail: msg,
    canRetry: true,
    offerDemoReset: true,
  };
}

/**
 * Formats byte count into human-readable size string.
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
