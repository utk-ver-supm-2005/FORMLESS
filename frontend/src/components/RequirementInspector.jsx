import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApplication } from '../context';
import StatusBadge from './StatusBadge';
import SourceCitationBox from './SourceCitationBox';
import RuleEvaluationBox from './RuleEvaluationBox';
import EvidenceAttachmentList from './EvidenceAttachmentList';
import TransitionActionToolbar from './TransitionActionToolbar';
import EvidenceUploadModal from './EvidenceUploadModal';
import RejectReasonModal from './RejectReasonModal';
import AuditTimeline from './AuditTimeline';
import {
  formatCategory,
  formatVerificationMode,
} from './matrixModel';
import { deriveBlockingImpactModel } from './inspectorModel';

/**
 * RequirementInspector Component
 * Renders complete policy traceability, citation excerpts, rule engine evaluations,
 * stage-gate blocking impact, attached evidence documents, and lifecycle actions.
 *
 * Source of Truth:
 * - ApplicationContext.selectedRequirement
 *
 * State Mutations:
 * - All lifecycle actions (request, upload, verify, reject) call backend endpoints
 *   and replace ApplicationContext.aggregate directly with backend-refreshed aggregate.
 */
export function RequirementInspector({ onClose }) {
  const {
    selectedRequirement,
    setSelectedRequirementId,
    aggregate,
    activeGate,
    requestRequirement,
    uploadEvidence,
    verifyRequirement,
    rejectRequirement,
    mutationPending,
  } = useApplication();

  const [searchParams, setSearchParams] = useSearchParams();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [actionError, setActionError] = useState(null);

  const handleCloseClick = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (typeof onClose === 'function') {
      onClose();
    } else {
      setSelectedRequirementId(null);
      const nextParams = new URLSearchParams(searchParams);
      if (nextParams.has('detail')) {
        nextParams.delete('detail');
        setSearchParams(nextParams, { replace: true });
      }
    }
  };

  const gateReadiness = aggregate?.gate_readiness || null;

  // Empty State: No requirement selected
  if (!selectedRequirement) {
    return (
      <aside className="requirement-inspector-drawer empty" aria-label="Requirement Inspector">
        <div className="inspector-empty-state">
          <div className="empty-state-icon" aria-hidden="true">
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <h3 className="inspector-empty-title">SELECT A REQUIREMENT</h3>
          <p className="inspector-empty-desc">
            Choose a requirement from the matrix to inspect its policy basis,
            rules, and current compliance state.
          </p>
          <span className="inspector-empty-badge">
            Inspection Workspace • Ready
          </span>
        </div>
      </aside>
    );
  }

  const categoryLabel = formatCategory(selectedRequirement.category);
  const verificationModeLabel = formatVerificationMode(
    selectedRequirement.verification_mode
  );
  const blockingImpact = deriveBlockingImpactModel(
    selectedRequirement,
    gateReadiness,
    activeGate
  );

  // 1. Action: Request Requirement (MISSING -> IN_PROGRESS)
  const handleRequest = async () => {
    if (mutationPending) return;
    setActionError(null);
    try {
      await requestRequirement(selectedRequirement.id);
    } catch (err) {
      setActionError(err.message || 'Failed to request requirement.');
    }
  };

  // 2. Action: Upload Evidence (IN_PROGRESS/MISSING/REJECTED -> EVIDENCE_RECEIVED)
  const handleUpload = async (file, notes) => {
    if (mutationPending) return;
    setActionError(null);
    try {
      await uploadEvidence(selectedRequirement.id, file, undefined, notes);
    } catch (err) {
      setActionError(err.message || 'Failed to upload evidence.');
      throw err;
    }
  };

  // 3. Action: Verify Requirement (EVIDENCE_RECEIVED/NEEDS_VERIFICATION -> VERIFIED)
  const handleVerify = async () => {
    if (mutationPending) return;
    setActionError(null);
    try {
      await verifyRequirement(selectedRequirement.id);
    } catch (err) {
      setActionError(err.message || 'Failed to verify requirement.');
    }
  };

  // 4. Action: Reject Requirement (EVIDENCE_RECEIVED/NEEDS_VERIFICATION -> REJECTED)
  const handleReject = async (reason, notes) => {
    if (mutationPending) return;
    setActionError(null);
    try {
      await rejectRequirement(selectedRequirement.id, reason, undefined, notes);
    } catch (err) {
      setActionError(err.message || 'Failed to reject requirement.');
      throw err;
    }
  };

  return (
    <aside
      className="requirement-inspector-drawer"
      aria-label={`Requirement Inspector for ${selectedRequirement.code}`}
      data-testid="requirement-inspector"
    >
      {/* 1. Header Toolbar */}
      <div className="inspector-header">
        <div className="inspector-header-meta">
          <span className="inspector-kicker">REQUIREMENT INSPECTOR</span>
          <div className="inspector-code-row">
            <span className="inspector-code">{selectedRequirement.code}</span>
            <span className="inspector-category-pill">{categoryLabel}</span>
          </div>
        </div>
        <div className="inspector-header-actions">
          <StatusBadge state={selectedRequirement.state} />
          <button
            type="button"
            className="inspector-close-btn"
            onClick={handleCloseClick}
            aria-label="Close requirement inspector"
            title="Close requirement details"
            data-testid="inspector-close-button"
          >
            ×
          </button>
        </div>
      </div>

      {/* 2. Title & Description */}
      <div className="inspector-body-content">
        {actionError && (
          <div className="inspector-error-alert" role="alert">
            <span>{actionError}</span>
            <button
              type="button"
              className="error-dismiss-btn"
              onClick={() => setActionError(null)}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        <div className="inspector-title-section">
          <h2 className="inspector-title">{selectedRequirement.title}</h2>
          <p className="inspector-description">
            {selectedRequirement.description || 'No description provided by policy.'}
          </p>
        </div>

        {/* 3. Policy Source Citation Box */}
        <section className="inspector-section" aria-label="Policy Source">
          <SourceCitationBox citation={selectedRequirement.source_citation} />
        </section>

        {/* 4. Rule Evaluation Box */}
        <section className="inspector-section" aria-label="Rule Conditions">
          <RuleEvaluationBox rules={selectedRequirement.rules} />
        </section>

        {/* 5. Stage-Gate Blocking Impact */}
        <section className="inspector-section" aria-label="Blocking Impact">
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
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </span>
              <h4 className="inspector-section-heading">BLOCKING IMPACT</h4>
            </div>
            <span
              className={`impact-status-tag ${
                blockingImpact.isBlocker ? 'tag-blocker' : 'tag-neutral'
              }`}
            >
              {blockingImpact.statusLabel}
            </span>
          </div>

          <div className="impact-card">
            {blockingImpact.isBlocker && (
              <div className="impact-alert-banner" role="alert">
                <span className="impact-callout-text">
                  {blockingImpact.blockerCallout}
                </span>
                {blockingImpact.reason && (
                  <p className="impact-reason">{blockingImpact.reason}</p>
                )}
              </div>
            )}
            <div className="impact-meta-grid">
              <div className="impact-meta-item">
                <span className="impact-meta-label">Enforced Gates</span>
                <span className="impact-meta-value">
                  {blockingImpact.stagesFormatted}
                </span>
              </div>
              <div className="impact-meta-item">
                <span className="impact-meta-label">Active Gate</span>
                <span className="impact-meta-value">
                  {blockingImpact.activeGate}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Attached Evidence Documents */}
        <section className="inspector-section" aria-label="Evidence Attachments">
          <EvidenceAttachmentList evidenceLinks={selectedRequirement.evidence_links} />
        </section>

        {/* 7. Contextual Lifecycle Actions & Verification Status */}
        <section className="inspector-section" aria-label="Lifecycle Actions">
          <TransitionActionToolbar
            requirement={selectedRequirement}
            onRequest={handleRequest}
            onOpenUpload={() => setIsUploadModalOpen(true)}
            onVerify={handleVerify}
            onOpenReject={() => setIsRejectModalOpen(true)}
            loading={mutationPending}
          />
          <div className="verification-card" style={{ marginTop: '0.75rem' }}>
            <div className="verification-row">
              <span className="verification-label">Evaluation Mode</span>
              <span className="verification-value">{verificationModeLabel}</span>
            </div>
            {selectedRequirement.verified_by && (
              <div className="verification-row">
                <span className="verification-label">Certified By</span>
                <span className="verification-value">
                  {selectedRequirement.verified_by}
                </span>
              </div>
            )}
            {selectedRequirement.verified_at && (
              <div className="verification-row">
                <span className="verification-label">Certified At</span>
                <span className="verification-value">
                  {new Date(selectedRequirement.verified_at).toLocaleDateString()}
                </span>
              </div>
            )}
            {selectedRequirement.rejection_reason && (
              <div className="verification-rejection-note">
                <span className="rejection-label">Rejection Notice:</span>
                <p className="rejection-body">
                  {selectedRequirement.rejection_reason}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* 8. Append-Only Audit History (Milestone 9) */}
        <section className="inspector-section" aria-label="Audit History">
          <AuditTimeline
            requirementId={selectedRequirement.id}
            refreshTrigger={`${selectedRequirement.state}-${selectedRequirement.evidence_links?.length || 0}`}
          />
        </section>
      </div>

      {/* Modal: Evidence Upload */}
      <EvidenceUploadModal
        isOpen={isUploadModalOpen}
        requirement={selectedRequirement}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
        loading={mutationPending}
      />

      {/* Modal: Rejection Reason */}
      <RejectReasonModal
        isOpen={isRejectModalOpen}
        requirement={selectedRequirement}
        onClose={() => setIsRejectModalOpen(false)}
        onReject={handleReject}
        loading={mutationPending}
      />
    </aside>
  );
}

export default RequirementInspector;
