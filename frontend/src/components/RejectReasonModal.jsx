import React, { useState } from 'react';
import { validateRejectionReason } from './lifecycleModel';

/**
 * RejectReasonModal Component
 * Captures mandatory justification for evidence/requirement rejection.
 *
 * Requirements:
 * - Rejection reason is strictly mandatory.
 * - Does not allow submission without a non-empty explanation.
 */
export function RejectReasonModal({
  isOpen,
  requirement,
  onClose,
  onReject,
  loading = false,
}) {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState(null);

  if (!isOpen || !requirement) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    const validation = validateRejectionReason(reason);
    if (!validation.valid) {
      setValidationError(validation.error);
      return;
    }

    try {
      setValidationError(null);
      await onReject(reason.trim(), notes.trim() || null);
      handleClose();
    } catch (err) {
      setValidationError(err.message || 'Failed to reject requirement.');
    }
  };

  const handleClose = () => {
    setReason('');
    setNotes('');
    setValidationError(null);
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-modal-title"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !loading) handleClose();
      }}
    >
      <div className="modal-container reject-modal">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-kicker kicker-danger">REVIEWER ACTION</span>
            <h3 id="reject-modal-title" className="modal-title">
              Reject Requirement Evidence
            </h3>
            <span className="modal-target-req">
              Target: <strong>{requirement.code}</strong> — {requirement.title}
            </span>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={handleClose}
            disabled={loading}
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="modal-form">
          {validationError && (
            <div className="modal-error-banner" role="alert">
              <span>{validationError}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="rejection-reason" className="form-label">
              Reason for Rejection <span className="label-required">*</span>
            </label>
            <textarea
              id="rejection-reason"
              rows={3}
              className="form-textarea"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="Explain why the submitted evidence does not substantiate this requirement..."
              disabled={loading}
              required
            />
            <span className="form-hint">
              This explanation will be recorded in the audit trail and displayed to the applicant.
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="reviewer-notes" className="form-label">
              Internal Reviewer Notes <span className="label-optional">(Optional)</span>
            </label>
            <input
              id="reviewer-notes"
              type="text"
              className="form-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Requested re-issuance with university seal"
              disabled={loading}
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-danger"
              disabled={!reason.trim() || loading}
            >
              {loading ? 'Recording Rejection...' : 'Confirm Rejection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RejectReasonModal;
