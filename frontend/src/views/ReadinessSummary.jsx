import React from 'react';

/**
 * Cohesive Readiness Summary Visualization
 * Synthesizes the institutional stage gate milestone track with proportional rule verification.
 * Avoids redundant cards and repetitive progress widgets.
 *
 * Source of Truth: authoritative ApplicationContext aggregate
 */
export function ReadinessSummary({ summaryModel }) {
  const {
    verified,
    needsVerification,
    missing,
    inProgress,
    total,
    verifiedPct,
    needsVerificationPct,
    missingPct,
    inProgressPct,
    displayProgress,
    stageTimeline = [],
  } = summaryModel;

  return (
    <section className="readiness-summary-panel" aria-label="Readiness Summary">
      {/* 1. Institutional Stage Gate Milestone Rail */}
      <div className="stage-milestone-track" aria-label="Institutional Stage Gate Milestones">
        <div className="milestone-track-line-bg" />
        <div
          className="milestone-track-line-progress"
          style={{
            width: stageTimeline.some((s) => s.isCurrent && s.isPassed)
              ? '75%'
              : stageTimeline.some((s) => s.isCurrent)
              ? '50%'
              : '25%',
          }}
        />

        <div className="milestone-nodes-row">
          {stageTimeline.map((stage) => (
            <div
              key={stage.key}
              className={`milestone-node-col milestone-${stage.state}`}
            >
              <div className="milestone-node-indicator">
                {stage.state === 'completed' ? (
                  <span className="milestone-icon-check">✓</span>
                ) : stage.state === 'active' ? (
                  <span className="milestone-icon-pulse" />
                ) : (
                  <span className="milestone-icon-pending" />
                )}
              </div>

              <div className="milestone-text-group">
                <span className="milestone-title">{stage.title}</span>
                <span className="milestone-sub">{stage.sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Cohesive Criteria Verification Rail with Integrated Inline Metrics */}
      <div className="criteria-track-wrapper">
        <div className="criteria-track-header">
          <div className="criteria-track-header-left">
            <span className="criteria-track-label">Rule Verification Progress</span>
            <span className="criteria-fraction-pill">
              <span className="criteria-check-icon">✓</span>
              {verified} of {total} certified ({verifiedPct.toFixed(0)}%)
            </span>
          </div>

          {/* Integrated inline status pills replacing redundant card grid */}
          <div className="criteria-inline-metrics">
            <span className="inline-metric-item metric-verified">
              <span className="inline-dot dot-verified" aria-hidden="true" />
              <strong>{verified}</strong> Verified
            </span>
            <span className="inline-metric-item metric-review">
              <span className="inline-dot dot-needs-verification" aria-hidden="true" />
              <strong>{needsVerification}</strong> Review
            </span>
            <span className="inline-metric-item metric-missing">
              <span className="inline-dot dot-missing" aria-hidden="true" />
              <strong>{missing}</strong> Blocking
            </span>
            <span className="inline-metric-item metric-total">
              <span className="inline-dot dot-total" aria-hidden="true" />
              <strong>{total}</strong> Total
            </span>
          </div>
        </div>

        {/* Proportional Verification Rail */}
        <div className="summary-track" title={displayProgress}>
          {verifiedPct > 0 && (
            <div
              className="track-segment track-verified"
              style={{ width: `${verifiedPct}%` }}
              title={`Verified: ${verified} (${verifiedPct.toFixed(0)}%)`}
            />
          )}
          {needsVerificationPct > 0 && (
            <div
              className="track-segment track-needs-verification"
              style={{ width: `${needsVerificationPct}%` }}
              title={`Needs Verification: ${needsVerification} (${needsVerificationPct.toFixed(0)}%)`}
            />
          )}
          {inProgressPct > 0 && (
            <div
              className="track-segment track-in-progress"
              style={{ width: `${inProgressPct}%` }}
              title={`In Progress: ${inProgress}`}
            />
          )}
          {missingPct > 0 && (
            <div
              className="track-segment track-missing"
              style={{ width: `${missingPct}%` }}
              title={`Missing: ${missing} (${missingPct.toFixed(0)}%)`}
            />
          )}
        </div>
      </div>
    </section>
  );
}

export default ReadinessSummary;
