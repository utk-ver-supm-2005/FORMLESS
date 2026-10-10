/**
 * Pure models, validation helpers, and transition state projections
 * for Milestone 6: Evidence & Requirement Lifecycle Actions.
 *
 * Decoupled from React DOM for 100% testability under Node's native test runner.
 */

export const MAX_EVIDENCE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_EVIDENCE_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg'];

export const ALLOWED_EVIDENCE_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/pjpeg',
  'image/jpg',
];

/**
 * Returns permissible lifecycle actions for a requirement based on its current state.
 * Strictly adheres to backend domain transitions in evidence_service.py.
 */
export function getAvailableTransitions(state) {
  if (!state) {
    return {
      canRequest: false,
      canUpload: false,
      canVerify: false,
      canReject: false,
      isVerified: false,
      isRejected: false,
    };
  }

  const normalized = String(state).toUpperCase();

  switch (normalized) {
    case 'MISSING':
      return {
        canRequest: true,
        canUpload: true,
        canVerify: false,
        canReject: false,
        isVerified: false,
        isRejected: false,
      };

    case 'IN_PROGRESS':
      return {
        canRequest: false,
        canUpload: true,
        canVerify: false,
        canReject: false,
        isVerified: false,
        isRejected: false,
      };

    case 'EVIDENCE_RECEIVED':
      return {
        canRequest: false,
        canUpload: true,
        canVerify: true,
        canReject: true,
        isVerified: false,
        isRejected: false,
      };

    case 'NEEDS_VERIFICATION':
      return {
        canRequest: false,
        canUpload: true,
        canVerify: true,
        canReject: true,
        isVerified: false,
        isRejected: false,
      };

    case 'REJECTED':
      return {
        canRequest: false,
        canUpload: true, // Supports replacement evidence upload to recover to EVIDENCE_RECEIVED
        canVerify: false,
        canReject: false,
        isVerified: false,
        isRejected: true,
      };

    case 'VERIFIED':
      return {
        canRequest: false,
        canUpload: false,
        canVerify: false,
        canReject: false,
        isVerified: true,
        isRejected: false,
      };

    default:
      return {
        canRequest: false,
        canUpload: false,
        canVerify: false,
        canReject: false,
        isVerified: false,
        isRejected: false,
      };
  }
}

/**
 * Validates evidence file size and extension for upload.
 */
export function validateEvidenceFile(file) {
  if (!file) {
    return { valid: false, error: 'Please select a file to upload.' };
  }

  if (file.size === 0) {
    return { valid: false, error: 'Selected file is empty.' };
  }

  if (file.size > MAX_EVIDENCE_SIZE_BYTES) {
    const mbSize = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${mbSize} MB) exceeds maximum limit of 10 MB.`,
    };
  }

  const fileName = (file.name || '').toLowerCase();
  const hasAllowedExt = ALLOWED_EVIDENCE_EXTENSIONS.some((ext) =>
    fileName.endsWith(ext)
  );
  const hasAllowedMime =
    !file.type || ALLOWED_EVIDENCE_MIME_TYPES.includes(file.type.toLowerCase());

  if (!hasAllowedExt || !hasAllowedMime) {
    return {
      valid: false,
      error: 'Unsupported file type. Please upload a PDF, PNG, or JPG document.',
    };
  }

  return { valid: true, error: null };
}

/**
 * Validates reviewer rejection reason.
 */
export function validateRejectionReason(reason) {
  if (!reason || !reason.trim()) {
    return {
      valid: false,
      error: 'A specific rejection reason is required for audit compliance.',
    };
  }

  if (reason.trim().length < 4) {
    return {
      valid: false,
      error: 'Please provide a clear and descriptive rejection explanation.',
    };
  }

  return { valid: true, error: null };
}

/**
 * Formats byte counts into human-readable strings.
 */
export function formatFileSize(bytes) {
  if (typeof bytes !== 'number' || bytes < 0) return '—';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
