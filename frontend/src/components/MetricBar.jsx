import React from 'react';
import { useApplication } from '../context';
import { deriveMetricBarModel } from './matrixModel';

/**
 * MetricBar Component
 * Renders backend-derived high-level compliance metrics.
 *
 * Source of Truth:
 * - ApplicationContext.aggregate.progress
 * - ApplicationContext.aggregate.gate_readiness
 *
 * All metric numbers originate strictly from backend evaluation.
 * Displays neutral "—" state when aggregate is unavailable.
 */
export function MetricBar() {
  const { aggregate, activeGate } = useApplication();
  const model = deriveMetricBarModel(aggregate, activeGate);

  return (
    <div className="metric-bar" role="region" aria-label="Compliance Summary Metrics">
      {/* 1. Total Requirements */}
      <div className="metric-card" data-metric="total">
        <div className="metric-card-header">
          <span className="metric-title">TOTAL REQUIREMENTS</span>
          <span className="metric-scope-tag">POL-01</span>
        </div>
        <div className="metric-value-row">
          <span className="metric-value" data-testid="metric-total">
            {model.total}
          </span>
        </div>
        <span className="metric-sub">Extracted policy rules</span>
      </div>

      {/* 2. Resolved Requirements */}
      <div className="metric-card" data-metric="resolved">
        <div className="metric-card-header">
          <span className="metric-title">RESOLVED</span>
          <span className="metric-status-dot dot-verified" aria-hidden="true" />
        </div>
        <div className="metric-value-row">
          <span
            className="metric-value metric-resolved"
            data-testid="metric-resolved"
            style={{ color: 'var(--status-verified)' }}
          >
            {model.resolved}
          </span>
          {model.total !== '—' && (
            <span className="metric-ratio-denom">/ {model.total}</span>
          )}
        </div>
        <span className="metric-sub">Certified satisfied</span>
      </div>

      {/* 3. Verified Criteria */}
      <div className="metric-card" data-metric="verified">
        <div className="metric-card-header">
          <span className="metric-title">VERIFIED</span>
          <span className="metric-indicator verified" aria-hidden="true" />
        </div>
        <div className="metric-value-row">
          <span
            className="metric-value metric-verified"
            data-testid="metric-verified"
            style={{ color: 'var(--status-verified)' }}
          >
            {model.verified}
          </span>
        </div>
        <span className="metric-sub">Engine & reviewer certified</span>
      </div>

      {/* 4. Needs Verification */}
      <div className="metric-card" data-metric="needs-verification">
        <div className="metric-card-header">
          <span className="metric-title">NEEDS VERIFICATION</span>
          <span className="metric-indicator needs-verification" aria-hidden="true" />
        </div>
        <div className="metric-value-row">
          <span
            className="metric-value metric-needs-verification"
            data-testid="metric-needs-verification"
            style={{ color: 'var(--status-needs-verification)' }}
          >
            {model.needsVerification}
          </span>
        </div>
        <span className="metric-sub">Requires verification check</span>
      </div>

      {/* 5. Missing */}
      <div className="metric-card" data-metric="missing">
        <div className="metric-card-header">
          <span className="metric-title">MISSING</span>
          <span className="metric-indicator missing" aria-hidden="true" />
        </div>
        <div className="metric-value-row">
          <span
            className="metric-value metric-missing"
            data-testid="metric-missing"
            style={{ color: 'var(--status-missing)' }}
          >
            {model.missing}
          </span>
        </div>
        <span className="metric-sub">Pending submission</span>
      </div>

      {/* 6. Active Blockers */}
      <div
        className={`metric-card metric-card-blocker ${
          typeof model.activeBlockers === 'number' && model.activeBlockers > 0
            ? 'has-blockers'
            : ''
        }`}
        data-metric="active-blockers"
      >
        <div className="metric-card-header">
          <span className="metric-title">ACTIVE BLOCKERS</span>
          <span
            className={`metric-status-dot ${
              typeof model.activeBlockers === 'number' && model.activeBlockers > 0
                ? 'dot-not-ready'
                : 'dot-verified'
            }`}
            aria-hidden="true"
          />
        </div>
        <div className="metric-value-row">
          <span
            className="metric-value metric-blockers"
            data-testid="metric-blockers"
            style={{
              color:
                typeof model.activeBlockers === 'number' && model.activeBlockers > 0
                  ? 'var(--status-missing)'
                  : 'var(--status-verified)',
            }}
          >
            {model.activeBlockers}
          </span>
        </div>
        <span className="metric-sub">
          Blocking <strong>{model.activeGate}</strong> gate
        </span>
      </div>
    </div>
  );
}

export default MetricBar;
