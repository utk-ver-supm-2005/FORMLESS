import React from 'react';
import { getAvailableTransitions } from './lifecycleModel';

/**
 * TransitionActionToolbar Component
 * Renders contextual compliance actions for the inspected requirement
 * strictly based on its active lifecycle state.
 *
 * Supported Actions:
 * - Request Requirement (MISSING -> IN_PROGRESS)
 * - Upload Evidence (IN_PROGRESS/MISSING/REJECTED -> EVIDENCE_RECEIVED)
 * - Verify Requirement (EVIDENCE_RECEIVED/NEEDS_VERIFICATION -> VERIFIED)
 * - Reject Evidence (EVIDENCE_RECEIVED/NEEDS_VERIFICATION -> REJECTED)
 */
export function TransitionActionToolbar({
  requirement,
  onRequest,
  onOpenUpload,
  onVerify,
  onOpenReject,
  loading = false,
}) {
  if (!requirement) return null;

  const transitions = getAvailableTransitions(requirement.state);

  return (
    <div className="transition-toolbar" role="region" aria-label="Requirement Lifecycle Actions">
      <div className="section-header-row">
        <div className="section-title-group">
          <span className="section-icon" aria-hidden="true">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </span>
          <h4 className="inspector-section-heading">LIFECYCLE ACTIONS</h4>
        </div>
        <span className="toolbar-state-hint">Current: {requirement.state}</span>
      </div>

      <div className="toolbar-actions-container">
        {/* 1. VERIFIED: Non-actionable certification state */}
        {transitions.isVerified && (
          <div className="certified-state-card">
            <span className="certified-check" aria-hidden="true">
              ✓
            </span>
            <div className="certified-text">
              <span className="certified-title">Requirement Certified</span>
              <p className="certified-desc">
                Verified criteria are certified satisfied. No further action required.
              </p>
            </div>
          </div>
        )}

        {/* 2. REJECTED: Recovery via replacement evidence */}
        {transitions.isRejected && (
          <div className="rejected-state-card">
            <div className="rejection-alert">
              <span className="rejection-icon" aria-hidden="true">
                ⚠
              </span>
              <div className="rejection-content">
                <span className="rejection-title">Evidence Rejected</span>
                <p className="rejection-reason-text">
                  {requirement.rejection_reason || 'Correction or re-issuance required.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn-action-primary"
              onClick={onOpenUpload}
              disabled={loading}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Upload Replacement Evidence</span>
            </button>
          </div>
        )}

        {/* 3. MISSING: Request Requirement or direct upload */}
        {transitions.canRequest && (
          <div className="actions-button-row">
            <button
              type="button"
              className="btn-action-primary"
              onClick={onRequest}
              disabled={loading}
              title="Transition requirement from MISSING to IN_PROGRESS"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>{loading ? 'Requesting...' : 'Request Requirement'}</span>
            </button>

            <button
              type="button"
              className="btn-action-secondary"
              onClick={onOpenUpload}
              disabled={loading}
              title="Upload evidence directly"
            >
              <span>Upload Evidence</span>
            </button>
          </div>
        )}

        {/* 4. IN_PROGRESS: Upload Evidence */}
        {requirement.state === 'IN_PROGRESS' && (
          <div className="actions-button-row">
            <button
              type="button"
              className="btn-action-primary"
              onClick={onOpenUpload}
              disabled={loading}
              title="Upload official evidence file"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Upload Evidence</span>
            </button>
          </div>
        )}

        {/* 5. EVIDENCE_RECEIVED or NEEDS_VERIFICATION: Verify or Reject */}
        {(transitions.canVerify || transitions.canReject) && (
          <div className="actions-button-column">
            <div className="actions-button-row">
              <button
                type="button"
                className="btn-action-success"
                onClick={onVerify}
                disabled={loading}
                title="Review attached evidence and certify as VERIFIED"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{loading ? 'Verifying...' : 'Verify Requirement'}</span>
              </button>

              <button
                type="button"
                className="btn-action-danger"
                onClick={onOpenReject}
                disabled={loading}
                title="Reject submitted evidence with reason"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <span>Reject Evidence</span>
              </button>
            </div>

            <button
              type="button"
              className="btn-action-subtle"
              onClick={onOpenUpload}
              disabled={loading}
            >
              + Upload Additional Evidence
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default TransitionActionToolbar;
