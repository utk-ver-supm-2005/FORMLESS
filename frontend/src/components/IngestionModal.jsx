import React, { useRef, useState, useEffect } from 'react';
import { useApplication } from '../context';
import { INGESTION_STATES } from '../context/constants';
import { validatePolicyFile } from '../api/client';
import {
  formatElapsedTime,
  getIngestionTimingMessage,
  formatModelGovernance,
  formatIngestionError,
  formatFileSize,
  PIPELINE_EXPLANATIONS,
} from './ingestionModel';

/**
 * IngestionModal Component
 *
 * Provides the long-running Gemini 3.8 Flash policy PDF ingestion workflow
 * with truthful model governance, live elapsed stopwatch, duplicate-submission
 * protection, and zero fabricated progress metrics.
 */
export function IngestionModal({ isOpen: propIsOpen, onClose: propOnClose }) {
  const context = useApplication();

  // Support both explicit props and context-driven state
  const isOpen = propIsOpen !== undefined ? propIsOpen : context?.isIngestionModalOpen;
  const onClose = propOnClose || context?.closeIngestionModal;

  const {
    ingestionState = INGESTION_STATES.IDLE,
    selectedPolicyFile,
    selectPolicyFile,
    clearPolicyFile,
    ingestionError,
    ingestionResult,
    ingestionElapsedSeconds = 0,
    ingestPolicy,
    resetIngestionState,
    resetFssai,
    activeGate = 'JOINING',
  } = context || {};

  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Derive file validation state directly during render (pure single source of truth)
  const validationResult = selectedPolicyFile ? validatePolicyFile(selectedPolicyFile) : null;
  const localValidationError = validationResult && !validationResult.valid ? validationResult.error : null;

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        const isProcessing =
          ingestionState === INGESTION_STATES.UPLOADING ||
          ingestionState === INGESTION_STATES.PROCESSING_POLICY;
        if (!isProcessing && onClose) {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, ingestionState, onClose]);

  if (!isOpen) return null;

  const isProcessing =
    ingestionState === INGESTION_STATES.UPLOADING ||
    ingestionState === INGESTION_STATES.PROCESSING_POLICY;

  const isComplete = ingestionState === INGESTION_STATES.COMPLETE;
  const isError = ingestionState === INGESTION_STATES.ERROR;
  const timingMessage = getIngestionTimingMessage(ingestionElapsedSeconds);
  const formattedError = formatIngestionError(ingestionError);

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isProcessing) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (isProcessing) return;

    const files = e.dataTransfer?.files;
    if (files && files.length > 0 && selectPolicyFile) {
      selectPolicyFile(files[0]);
    }
  };

  const handleFileChange = (e) => {
    const files = e.target?.files;
    if (files && files.length > 0 && selectPolicyFile) {
      selectPolicyFile(files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedPolicyFile || localValidationError || isProcessing) return;
    try {
      if (ingestPolicy) {
        await ingestPolicy(selectedPolicyFile);
      }
    } catch {
      // Error is tracked in context
    }
  };

  const handleRetry = async () => {
    if (isProcessing) return;
    if (selectedPolicyFile) {
      try {
        if (ingestPolicy) {
          await ingestPolicy(selectedPolicyFile);
        }
      } catch {
        // Handled in context
      }
    } else {
      if (resetIngestionState) resetIngestionState();
    }
  };

  const handleLoadDemo = async () => {
    try {
      if (resetFssai) {
        await resetFssai();
      }
      if (resetIngestionState) resetIngestionState();
      if (onClose) onClose();
    } catch {
      // Handled
    }
  };

  const handleCloseAndReview = () => {
    if (resetIngestionState) resetIngestionState();
    if (onClose) onClose();
  };

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing && onClose) {
          onClose();
        }
      }}
    >
      <div
        className="modal-container ingestion-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ingestion-modal-title"
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-text">
            <h2 id="ingestion-modal-title" className="modal-title">
              {isProcessing
                ? 'Analyzing Institutional Policy'
                : isComplete
                  ? 'Policy Ingestion Complete'
                  : isError
                    ? 'Policy Analysis Alert'
                    : 'Analyze New Policy'}
            </h2>
            <p className="modal-subtitle">
              {isProcessing
                ? 'Gemini 3.8 Flash is extracting requirements and citations.'
                : isComplete
                  ? 'Criteria normalized and applicant readiness calculated.'
                  : isError
                    ? 'The policy document could not be processed.'
                    : 'Upload an institutional guideline PDF for automated requirement extraction.'}
            </p>
          </div>

          {!isProcessing && (
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Close modal"
            >
              ✕
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* ========================================================
              STATE A: IDLE / UPLOAD_SELECTED (Document Selection)
             ======================================================== */}
          {!isProcessing && !isComplete && !isError && (
            <div className="ingestion-selection-view">
              <div
                className={`ingestion-dropzone ${isDragOver ? 'drag-over' : ''} ${selectedPolicyFile ? 'has-file' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                aria-label="Upload policy document dropzone"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,application/pdf"
                  style={{ display: 'none' }}
                  data-testid="policy-file-input"
                />

                <div className="dropzone-icon" aria-hidden="true">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <polyline points="9 15 12 12 15 15" />
                  </svg>
                </div>

                {selectedPolicyFile ? (
                  <div className="dropzone-file-details">
                    <p className="file-name">{selectedPolicyFile.name}</p>
                    <span className="file-size">{formatFileSize(selectedPolicyFile.size)}</span>
                    <span className="file-change-hint">Click or drag another file to replace</span>
                  </div>
                ) : (
                  <div className="dropzone-placeholder">
                    <p className="dropzone-prompt">
                      Drop policy PDF here, or <span className="browse-link">browse</span>
                    </p>
                    <span className="dropzone-constraints">
                      Institutional guidelines in PDF format up to 50 MB
                    </span>
                  </div>
                )}
              </div>

              {/* Validation Error Feedback */}
              {localValidationError && (
                <div className="ingestion-validation-alert" role="alert" data-testid="validation-alert">
                  <span className="alert-icon" aria-hidden="true">⚠</span>
                  <span className="alert-text">{localValidationError}</span>
                </div>
              )}

              {/* Active Evaluation Context Reminder */}
              <div className="ingestion-context-notice">
                <span className="notice-label">Evaluation Gate:</span>
                <span className="notice-value">{activeGate}</span>
                <span className="notice-sep">•</span>
                <span className="notice-label">Engine:</span>
                <span className="notice-value">gemini-3.8-flash</span>
              </div>
            </div>
          )}

          {/* ========================================================
              STATE B: UPLOADING / PROCESSING_POLICY (Live Long-Running UX)
             ======================================================== */}
          {isProcessing && (
            <div className="ingestion-processing-view" data-testid="processing-view">
              {/* File & Status Header */}
              <div className="processing-header">
                <div className="processing-file-badge">
                  <span className="file-icon" aria-hidden="true">📄</span>
                  <span className="file-name truncate">
                    {selectedPolicyFile?.name || 'Policy Document.pdf'}
                  </span>
                  <span className="file-size">
                    ({formatFileSize(selectedPolicyFile?.size)})
                  </span>
                </div>
                <div className="processing-model-pill" title="Target Extraction Engine">
                  Gemini 3.8 Flash
                </div>
              </div>

              {/* Live Elapsed Stopwatch */}
              <div className="stopwatch-display" role="timer" aria-live="polite">
                <div className="stopwatch-kicker">ANALYSIS IN PROGRESS</div>
                <div className="stopwatch-time" data-testid="elapsed-time">
                  {formatElapsedTime(ingestionElapsedSeconds)}
                </div>
                <div className="stopwatch-caption">Elapsed Analysis Time</div>
              </div>

              {/* Indeterminate Activity Indicator (Truthful: No Fake Percentages) */}
              <div
                className="indeterminate-progress-bar"
                role="progressbar"
                aria-label="Analyzing policy structure"
              >
                <div className="indeterminate-progress-slider" />
              </div>

              {/* Reassuring Explanatory Narrative */}
              <div className="processing-narrative">
                <p className="narrative-main">
                  Gemini 3.8 Flash is analyzing the institutional policy.
                </p>
                <p className="narrative-sub">
                  Complex policy documents can take a few minutes to process.
                </p>
              </div>

              {/* Extended Duration Notices (at 120s and 180s) */}
              {timingMessage?.message && (
                <div
                  className={`duration-notice notice-${timingMessage.severity}`}
                  role="status"
                  data-testid="duration-notice"
                >
                  <span className="notice-icon" aria-hidden="true">
                    {timingMessage.severity === 'warning' ? '⏳' : 'ℹ'}
                  </span>
                  <span className="notice-text">{timingMessage.message}</span>
                </div>
              )}

              {/* Static Explanatory Descriptions (NO fake checkmarks or percentages) */}
              <div className="pipeline-explanatory-card">
                <span className="card-kicker">PIPELINE EXECUTION ORDER</span>
                <ul className="pipeline-steps-list">
                  {PIPELINE_EXPLANATIONS.map((desc, idx) => (
                    <li key={idx} className="pipeline-step-item">
                      <span className="step-num" aria-hidden="true">
                        0{idx + 1}
                      </span>
                      <span className="step-text">{desc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* ========================================================
              STATE C: COMPLETE (Success Confirmation & Model Governance)
             ======================================================== */}
          {isComplete && (
            <div className="ingestion-success-view" data-testid="success-view">
              <div className="success-banner">
                <div className="success-check-badge" aria-hidden="true">
                  ✓
                </div>
                <h3 className="success-title">Policy Evaluated Successfully</h3>
                <p className="success-sub">
                  Requirements and stage-gate readiness read model updated from backend.
                </p>
              </div>

              {/* Extracted Metadata Card */}
              <div className="extracted-meta-card">
                <div className="meta-row">
                  <span className="meta-label">Policy Title:</span>
                  <span className="meta-val font-semibold">
                    {ingestionResult?.extracted_policy?.target_name ||
                      ingestionResult?.policy_document?.title ||
                      'Institutional Policy'}
                  </span>
                </div>

                {ingestionResult?.extracted_policy?.organization && (
                  <div className="meta-row">
                    <span className="meta-label">Organization:</span>
                    <span className="meta-val">
                      {ingestionResult.extracted_policy.organization}
                    </span>
                  </div>
                )}

                {ingestionResult?.extracted_policy?.deadline && (
                  <div className="meta-row">
                    <span className="meta-label">Application Deadline:</span>
                    <span className="meta-val">
                      {ingestionResult.extracted_policy.deadline}
                    </span>
                  </div>
                )}

                <div className="meta-row">
                  <span className="meta-label">Requirements Extracted:</span>
                  <span className="meta-val">
                    <strong>
                      {ingestionResult?.extracted_policy?.requirements_count ??
                        context?.aggregate?.requirements?.length ??
                        0}
                    </strong>{' '}
                    criteria
                  </span>
                </div>

                {/* Model Governance Truthfulness */}
                {(() => {
                  const governance = formatModelGovernance(
                    ingestionResult?.model_used,
                    ingestionResult?.extraction_source
                  );
                  return (
                    <div className="meta-row governance-row">
                      <span className="meta-label">Reasoning Engine:</span>
                      <span className={`meta-val ${governance.badgeClass}`}>
                        {governance.displayName}
                        {governance.isFallback && (
                          <span className="governance-fallback-tag"> (Fallback)</span>
                        )}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ========================================================
              STATE D: ERROR (Actionable Error & Retry Path)
             ======================================================== */}
          {isError && (
            <div className="ingestion-error-view" data-testid="error-view">
              <div className="error-alert-banner" role="alert">
                <div className="error-icon" aria-hidden="true">
                  ⚠
                </div>
                <div className="error-content">
                  <h3 className="error-title">
                    {formattedError?.title || 'Policy Ingestion Failed'}
                  </h3>
                  <p className="error-detail">
                    {formattedError?.detail || 'An unexpected error occurred during document analysis.'}
                  </p>
                </div>
              </div>

              {selectedPolicyFile && (
                <div className="failed-file-summary">
                  <span className="file-label">File:</span>
                  <span className="file-name truncate">{selectedPolicyFile.name}</span>
                  <span className="file-size">({formatFileSize(selectedPolicyFile.size)})</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="modal-footer">
          {/* STATE A: Cancel or Analyze */}
          {!isProcessing && !isComplete && !isError && (
            <div className="footer-button-row">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAnalyze}
                disabled={!selectedPolicyFile || Boolean(localValidationError)}
                data-testid="analyze-button"
              >
                Analyze Policy
              </button>
            </div>
          )}

          {/* STATE B: Processing is Lock-Protected */}
          {isProcessing && (
            <div className="footer-processing-row">
              <span className="processing-lock-text">
                Server request in flight • Processing pipeline active
              </span>
            </div>
          )}

          {/* STATE C: Complete -> View Compliance Workspace */}
          {isComplete && (
            <div className="footer-button-row">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCloseAndReview}
                data-testid="open-workspace-button"
              >
                Open Compliance Workspace
              </button>
            </div>
          )}

          {/* STATE D: Error -> Actionable Recovery */}
          {isError && (
            <div className="footer-button-row error-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  if (clearPolicyFile) clearPolicyFile();
                  if (resetIngestionState) resetIngestionState();
                }}
              >
                Choose Different File
              </button>

              {formattedError?.offerDemoReset && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleLoadDemo}
                >
                  Load Canonical FSSAI Demo
                </button>
              )}

              {formattedError?.canRetry && selectedPolicyFile && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleRetry}
                  data-testid="retry-button"
                >
                  Retry Analysis
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default IngestionModal;
