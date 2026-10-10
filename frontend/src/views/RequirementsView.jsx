import React from 'react';
import { useApplication } from '../context';
import RequirementList from '../components/RequirementList';

/**
 * RequirementsView Component (/requirements)
 * Complete requirements matrix workspace.
 * Features:
 * - Editorial page heading and contextual description
 * - Authoritative total and status breakdown derived from ApplicationContext.aggregate.progress
 * - Interactive search and filter chips
 * - Direct selection triggering the shared Requirement Detail Drawer
 */
export function RequirementsView() {
  const { aggregate, activeGate } = useApplication();

  const progress = aggregate?.progress || null;
  const total = progress?.total_count ?? aggregate?.requirements?.length ?? 0;
  const verified = progress?.verified_count ?? 0;
  const needsVerification = progress?.needs_verification_count ?? 0;
  const missing = progress?.missing_count ?? 0;
  const inProgress = progress?.in_progress_count ?? 0;

  return (
    <div
      className="requirements-view-page"
      role="region"
      aria-label="Requirements Workspace"
    >
      <div className="requirements-page-container">
        {/* 1. Editorial Page Header */}
        <header className="requirements-page-header">
          <div className="page-header-text">
            <span className="page-kicker">
              COMPLIANCE MATRIX · STAGE GATE: {activeGate}
            </span>
            <h1 className="page-headline">Requirements Workspace</h1>
            <p className="page-description">
              Authoritative criteria extracted from institutional guidelines. Inspect policy citations,
              validate applicant evidence, and resolve stage gate blockers.
            </p>
          </div>

          {/* 2. Status Breakdown Strip */}
          {total > 0 && (
            <div className="requirements-summary-strip" aria-label="Requirements Status Breakdown">
              <div className="summary-pill-item pill-total">
                <span className="summary-pill-digit">{total}</span>
                <span className="summary-pill-label">Total</span>
              </div>
              <div className="summary-pill-item pill-verified">
                <span className="summary-pill-digit">{verified}</span>
                <span className="summary-pill-label">Verified</span>
              </div>
              <div className="summary-pill-item pill-review">
                <span className="summary-pill-digit">{needsVerification}</span>
                <span className="summary-pill-label">Review</span>
              </div>
              <div className="summary-pill-item pill-missing">
                <span className="summary-pill-digit">{missing}</span>
                <span className="summary-pill-label">Missing</span>
              </div>
              {inProgress > 0 && (
                <div className="summary-pill-item pill-progress">
                  <span className="summary-pill-digit">{inProgress}</span>
                  <span className="summary-pill-label">In Progress</span>
                </div>
              )}
            </div>
          )}
        </header>

        {/* 3. Filterable Requirement Matrix Workspace */}
        <RequirementList />
      </div>
    </div>
  );
}

export default RequirementsView;
