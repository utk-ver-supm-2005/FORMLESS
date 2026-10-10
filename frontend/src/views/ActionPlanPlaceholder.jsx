import React from 'react';

export function ActionPlanPlaceholder() {
  return (
    <div className="route-placeholder" role="region" aria-label="Action Plan Workspace">
      <div className="placeholder-content">
        <h1 className="placeholder-title">Action Plan</h1>
        <p className="placeholder-desc">
          Prioritized operational workflow resolving stage blockers and verification items.
        </p>
      </div>
    </div>
  );
}

export default ActionPlanPlaceholder;
