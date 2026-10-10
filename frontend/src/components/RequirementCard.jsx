import React from 'react';
import StatusBadge from './StatusBadge';
import {
  formatBlockingStages,
  formatCategory,
  formatVerificationMode,
  isRequirementActiveBlocker,
} from './matrixModel';

/**
 * RequirementCard Component
 * Renders an individual requirement item in the matrix workspace.
 *
 * Answers:
 * - What is this requirement? (Code, title, description, category)
 * - What state is it in? (StatusBadge)
 * - Does it matter for readiness? (Active blocker indicator for active gate)
 *
 * Selection:
 * - Communicates with ApplicationContext via onSelect(requirement.id).
 * - Applies visual selection indicator (.selected).
 */
export function RequirementCard({
  requirement,
  isSelected = false,
  gateReadiness = null,
  activeGate = 'JOINING',
  onSelect,
}) {
  if (!requirement) return null;

  const isBlocker = isRequirementActiveBlocker(requirement, gateReadiness);
  const blockingStagesFormatted = formatBlockingStages(requirement.blocking_stages);
  const categoryFormatted = formatCategory(requirement.category);
  const verificationModeFormatted = formatVerificationMode(requirement.verification_mode);

  const handleClick = () => {
    if (typeof onSelect === 'function') {
      onSelect(requirement.id);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <article
      className={`requirement-card ${isSelected ? 'selected' : ''} ${
        isBlocker ? 'is-active-blocker' : ''
      }`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`${requirement.code}: ${requirement.title}. State: ${requirement.state}`}
      data-requirement-id={requirement.id}
      data-requirement-code={requirement.code}
    >
      {/* 1. Header: Code, Category, Status Badge */}
      <div className="requirement-card-top">
        <div className="requirement-identifiers">
          <span className="requirement-code">{requirement.code}</span>
          <span className="requirement-category-pill">{categoryFormatted}</span>
        </div>
        <div className="requirement-status-slot">
          <StatusBadge state={requirement.state} />
        </div>
      </div>

      {/* 2. Title & Blocker Alert Strip */}
      <div className="requirement-card-title-row">
        <h3 className="requirement-title">{requirement.title}</h3>
      </div>

      {/* Prominent Active Blocker Callout if identified by backend */}
      {isBlocker && (
        <div className="requirement-blocker-callout" role="alert">
          <span className="blocker-warning-icon" aria-hidden="true">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </span>
          <span className="blocker-text">
            BLOCKING {String(gateReadiness?.gate || activeGate).toUpperCase()}
          </span>
        </div>
      )}

      {/* 3. Description (Glanceable) */}
      {requirement.description && (
        <p className="requirement-description">{requirement.description}</p>
      )}

      {/* 4. Metadata Footer: Verification Mode, Stage Gating, and Inspect Affordance */}
      <div className="requirement-card-footer">
        <div className="requirement-meta-group">
          <div className="requirement-meta-item" title="Verification Mode">
            <span className="meta-icon" aria-hidden="true">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </span>
            <span className="meta-label">{verificationModeFormatted}</span>
          </div>

          {blockingStagesFormatted && (
            <div className="requirement-meta-item" title="Enforced Stages">
              <span className="meta-icon" aria-hidden="true">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
              </span>
              <span className="meta-label">Gate: {blockingStagesFormatted}</span>
            </div>
          )}
        </div>

        {/* Subtle affordance indicating requirement can be inspected */}
        <div className="requirement-inspect-affordance" aria-hidden="true">
          <span>Inspect criteria</span>
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>

      {/* Selected Indicator Accent */}
      {isSelected && (
        <div className="card-selected-banner" aria-hidden="true">
          <span>Active Selection</span>
        </div>
      )}
    </article>
  );
}

export default RequirementCard;
