import React from 'react';
import { useApplication } from '../context';
import { deriveReadinessViewModel } from './readinessModel';

/**
 * State badge styling helper based on semantic tokens.
 */
function getStateBadgeClass(state) {
  switch (state) {
    case 'VERIFIED':
      return 'badge-verified';
    case 'NEEDS_VERIFICATION':
      return 'badge-needs-verification';
    case 'MISSING':
      return 'badge-missing';
    case 'IN_PROGRESS':
      return 'badge-in-progress';
    case 'EVIDENCE_RECEIVED':
      return 'badge-evidence-received';
    case 'REJECTED':
      return 'badge-rejected';
    default:
      return 'badge-neutral';
  }
}

export function ReadinessBanner() {
  const {
    aggregate,
    activeGate,
    selectedRequirementId,
    setSelectedRequirementId,
    loading,
  } = useApplication();

  const model = deriveReadinessViewModel(aggregate, activeGate, selectedRequirementId);
  const {
    state,
    targetGate,
    badgeLabel,
    message,
    activeBlockers,
    blockingTotal,
    blockingSatisfied,
  } = model;

  // -------------------------------------------------------------------------
  // State A: NO DATA / INITIALIZING
  // -------------------------------------------------------------------------
  if (state === 'PENDING') {
    return (
      <div className="readiness-banner banner-pending" role="status" aria-live="polite">
        <div className="banner-top-row">
          <div className="banner-identity">
            <div className="gate-pill">
              <span className="gate-pill-label">STAGE GATE</span>
              <span className="gate-pill-value">{targetGate}</span>
            </div>
            <div className="readiness-pill pill-pending">
              <span className="status-indicator-dot dot-pending" aria-hidden="true" />
              <span>{badgeLabel}</span>
            </div>
          </div>
        </div>
        <p className="banner-message">
          {loading
            ? 'Awaiting gate readiness evaluation from the backend...'
            : message}
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // State B: READY
  // -------------------------------------------------------------------------
  if (state === 'READY') {
    return (
      <div className="readiness-banner banner-ready" role="status">
        <div className="banner-top-row">
          <div className="banner-identity">
            <div className="gate-pill">
              <span className="gate-pill-label">STAGE GATE</span>
              <span className="gate-pill-value">{targetGate}</span>
            </div>
            <div className="readiness-pill pill-ready">
              <span className="status-indicator-dot dot-ready" aria-hidden="true" />
              <span>{badgeLabel}</span>
            </div>
          </div>
          {blockingTotal !== undefined && (
            <div className="gating-ratio">
              <span>
                {blockingSatisfied}/{blockingTotal} Criteria Satisfied
              </span>
            </div>
          )}
        </div>

        <p className="banner-message">{message}</p>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // State C: NOT READY (with backend-provided active blockers)
  // -------------------------------------------------------------------------
  return (
    <div className="readiness-banner banner-not-ready" role="region" aria-label="Gate Readiness Status">
      <div className="banner-top-row">
        <div className="banner-identity">
          <div className="gate-pill">
            <span className="gate-pill-label">STAGE GATE</span>
            <span className="gate-pill-value">{targetGate}</span>
          </div>
          <div className="readiness-pill pill-not-ready">
            <span className="status-indicator-dot dot-not-ready" aria-hidden="true" />
            <span>{badgeLabel}</span>
          </div>
          <span className="blocker-count-badge">
            {activeBlockers.length} Active Blocker{activeBlockers.length === 1 ? '' : 's'}
          </span>
        </div>

        {blockingTotal !== undefined && (
          <div className="gating-ratio">
            <span>
              {blockingSatisfied}/{blockingTotal} Criteria Satisfied
            </span>
          </div>
        )}
      </div>

      <p className="banner-message">{message}</p>

      {/* Active Blockers List */}
      {activeBlockers.length > 0 && (
        <div className="blockers-section">
          <span className="blockers-section-title">ACTIVE STAGE BLOCKERS:</span>
          <div className="blockers-chip-list" role="list">
            {activeBlockers.map((blocker) => {
              const isSelected = blocker.isSelected;
              return (
                <button
                  key={blocker.requirement_id || blocker.code}
                  type="button"
                  className={`blocker-chip ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedRequirementId(blocker.requirement_id)}
                  aria-label={`Select blocker ${blocker.code}: ${blocker.title} (${blocker.state})`}
                  title={blocker.reason || `${blocker.title} is blocking ${targetGate}`}
                  role="listitem"
                >
                  <span className="blocker-code">{blocker.code}</span>
                  <span className="blocker-title">{blocker.title}</span>
                  <span className={`blocker-state-badge ${getStateBadgeClass(blocker.state)}`}>
                    {blocker.state.replace('_', ' ')}
                  </span>
                  {isSelected && (
                    <span className="selected-indicator" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default ReadinessBanner;
