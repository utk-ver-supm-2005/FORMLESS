import React from 'react';

export function OverviewPlaceholder() {
  return (
    <div className="route-placeholder" role="region" aria-label="Overview Workspace">
      <div className="placeholder-content">
        <h1 className="placeholder-title">Overview</h1>
        <p className="placeholder-desc">
          Executive readiness summary and stage-gate compliance status.
        </p>
      </div>
    </div>
  );
}

export default OverviewPlaceholder;
