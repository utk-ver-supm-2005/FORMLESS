import React from 'react';

export function RequirementsPlaceholder() {
  return (
    <div className="route-placeholder" role="region" aria-label="Requirements Workspace">
      <div className="placeholder-content">
        <h1 className="placeholder-title">Requirements</h1>
        <p className="placeholder-desc">
          Filterable compliance requirement matrix and criteria verification.
        </p>
      </div>
    </div>
  );
}

export default RequirementsPlaceholder;
