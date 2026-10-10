import React from 'react';
import StatusBadge from './StatusBadge';
import { formatCategory } from './matrixModel';

/**
 * ActionPlanGroup Component
 * Renders an action-oriented section of requirements (Blockers, Needs Verification,
 * In Progress, Completed) with visual hierarchy and keyboard-accessible cards.
 */
export function ActionPlanGroup({
  groupKey,
  title,
  description,
  emptyMessage,
  items = [],
  selectedId = null,
  onSelect,
  cardVariant = 'card-blocking',
}) {
  const count = items.length;

  return (
    <section
      className={`action-plan-group ${cardVariant}`}
      aria-label={`${title} (${count})`}
    >
      <div className="group-header">
        <div className="group-title-row">
          <h3 className="group-title">{title}</h3>
          <span className={`group-count-pill pill-${groupKey.toLowerCase().replace(/_/g, '-')}`}>
            {count}
          </span>
        </div>
        {description && <p className="group-desc">{description}</p>}
      </div>

      {count === 0 ? (
        <div className="group-empty-state" role="status">
          <p className="group-empty-text">{emptyMessage}</p>
        </div>
      ) : (
        <div className="group-items-list" role="list">
          {items.map((item) => {
            const isSelected = selectedId === item.id;
            const categoryLabel = formatCategory(item.category);

            return (
              <article
                key={item.id}
                role="button"
                tabIndex={0}
                className={`action-plan-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelect && onSelect(item.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (onSelect) onSelect(item.id);
                  }
                }}
                aria-selected={isSelected}
                aria-label={`${item.code} ${item.title}: ${item.actionCue}`}
              >
                {/* 1. Meta Strip: Code, Category, StatusBadge */}
                <div className="action-plan-card-meta">
                  <div className="card-identifiers">
                    <span className="card-code">{item.code}</span>
                    {categoryLabel && (
                      <span className="card-category">{categoryLabel}</span>
                    )}
                  </div>
                  <StatusBadge state={item.state} />
                </div>

                {/* 2. Requirement Title */}
                <h4 className="action-plan-card-title">{item.title}</h4>

                {/* 3. Reason / Blocker Callout */}
                {item.reason && (
                  <div
                    className={`action-plan-card-reason ${
                      item.isBlocker ? 'reason-blocker' : 'reason-info'
                    }`}
                  >
                    {item.isBlocker && (
                      <span className="reason-icon" aria-hidden="true">
                        ⚠
                      </span>
                    )}
                    <span className="reason-text">{item.reason}</span>
                  </div>
                )}

                {/* 4. Action Cue & Selection Hint */}
                <div className="action-plan-card-footer">
                  <span className="action-plan-cue">
                    <span className="cue-dot" aria-hidden="true" />
                    {item.actionCue}
                  </span>
                  <span className="action-plan-inspect-hint" aria-hidden="true">
                    Inspect →
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default ActionPlanGroup;
