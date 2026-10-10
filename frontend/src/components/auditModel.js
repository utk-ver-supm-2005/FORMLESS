/**
 * Audit Model & Presentation Helpers
 *
 * Provides human-readable presentation for append-only requirement transition events,
 * state transition flow badges, and timestamps. Adheres strictly to the single-source-of-truth
 * architecture: never infers transitions or fabricates audit events in React.
 */

/**
 * Maps raw backend action tokens to clean human-readable action titles and badge styling.
 */
export function formatAuditAction(action) {
  const norm = (action || '').toUpperCase();
  switch (norm) {
    case 'REQUESTED':
    case 'REQUEST_REQUIREMENT':
      return {
        label: 'Requested',
        badgeClass: 'action-requested',
        icon: 'action-request',
      };
    case 'EVIDENCE_SUBMITTED':
    case 'UPLOAD_EVIDENCE':
      return {
        label: 'Evidence Submitted',
        badgeClass: 'action-evidence',
        icon: 'action-upload',
      };
    case 'VERIFIED':
    case 'VERIFY_REQUIREMENT':
      return {
        label: 'Verified & Certified',
        badgeClass: 'action-verified',
        icon: 'action-check',
      };
    case 'REJECTED':
    case 'REJECT_REQUIREMENT':
      return {
        label: 'Rejected',
        badgeClass: 'action-rejected',
        icon: 'action-reject',
      };
    default:
      return {
        label: action ? action.replace(/_/g, ' ') : 'Lifecycle Event',
        badgeClass: 'action-default',
        icon: 'action-dot',
      };
  }
}

/**
 * Formats ISO timestamp into human-readable date and time.
 * Gracefully handles null/undefined without crashing or printing undefined.
 */
export function formatEventTimestamp(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

/**
 * Formats lifecycle state names for readable display.
 */
export function formatStateLabel(state) {
  if (!state) return 'UNKNOWN';
  switch (state.toUpperCase()) {
    case 'MISSING':
      return 'Missing';
    case 'IN_PROGRESS':
      return 'In Progress';
    case 'EVIDENCE_RECEIVED':
      return 'Evidence Received';
    case 'NEEDS_VERIFICATION':
      return 'Needs Verification';
    case 'REJECTED':
      return 'Rejected';
    case 'VERIFIED':
      return 'Verified';
    default:
      return state.replace(/_/g, ' ');
  }
}

/**
 * Extracts concise notes or contextual metadata from event payload.
 */
export function getEventMetadataSummary(event) {
  if (!event) return null;
  const meta = event.metadata || {};

  if (meta.rejection_reason) {
    return `Reason: ${meta.rejection_reason}`;
  }
  if (meta.file_name) {
    return `Attached file: ${meta.file_name}`;
  }
  if (meta.verified_by) {
    return `Certified by: ${meta.verified_by}`;
  }
  if (meta.notes) {
    return meta.notes;
  }
  return null;
}

/**
 * Sorts events strictly in ascending chronological order.
 */
export function sortEventsChronological(events = []) {
  if (!Array.isArray(events)) return [];
  return [...events].sort((a, b) => {
    const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tA - tB;
  });
}
