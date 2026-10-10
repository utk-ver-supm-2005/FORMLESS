import React from 'react';
import { getStatusConfig } from './matrixModel';

/**
 * StatusBadge Component
 * Displays institutional requirement lifecycle state using high-contrast semantic tokens.
 * Complies with accessibility guidelines by never relying exclusively on color.
 *
 * Supported States:
 * - VERIFIED
 * - NEEDS_VERIFICATION
 * - MISSING
 * - IN_PROGRESS
 * - EVIDENCE_RECEIVED
 * - REJECTED
 */
export function StatusBadge({ state, className = '' }) {
  const config = getStatusConfig(state);

  return (
    <span
      className={`status-badge ${config.className} ${className}`.trim()}
      title={config.description}
      data-state={state || 'UNKNOWN'}
    >
      <span className="status-badge-dot" aria-hidden="true" />
      <span className="status-badge-label">{config.label}</span>
    </span>
  );
}

export default StatusBadge;
