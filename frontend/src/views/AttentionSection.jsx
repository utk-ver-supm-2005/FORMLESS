import React from 'react';
import { Link } from 'react-router-dom';
import AttentionItem from './AttentionItem';
import EmptyState from '../components/EmptyState';

/**
 * "Needs Your Attention" Section
 * Renders ONLY the 3 highest-priority items requiring action, strictly prioritizing:
 *   1. Active gate blockers
 *   2. Needs-verification requirements
 *   3. In-progress / rejected requirements
 *
 * Provides a subtle link to the full Requirements matrix.
 */
export function AttentionSection({
  attentionItems = [],
  summaryModel,
  onSelectRequirement,
}) {
  const hasItems = attentionItems && attentionItems.length > 0;
  const blockerCount = attentionItems.filter((i) => i.isBlocker).length;
  // Surface only the top 3 highest-priority attention items
  const displayItems = attentionItems.slice(0, 3);

  const total = summaryModel?.total ?? 0;

  return (
    <section className="attention-section-card" aria-label="Items Requiring Attention">
      {/* 1. Header Row */}
      <div className="attention-card-header">
        <div className="attention-header-title-wrap">
          <div className="attention-icon-badge" aria-hidden="true">
            <svg
              width="16"
              height="16"
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
          </div>
          <div>
            <h2 className="attention-card-title">Needs Your Attention</h2>
            {hasItems && (
              <span className="attention-card-subtitle">
                {displayItems.length} of {attentionItems.length} prioritized
                {blockerCount > 0 ? ` · ${blockerCount} blocking gate` : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Compact Hierarchical Tree Rows */}
      {hasItems ? (
        <>
          <div className="attention-tree-list">
            {displayItems.map((item, idx) => (
              <AttentionItem
                key={item.id}
                item={item}
                isLast={idx === displayItems.length - 1}
                onSelect={onSelectRequirement}
              />
            ))}
          </div>

          <div className="attention-footer-row">
            <Link to="/requirements" className="attention-view-all-link">
              <span>View all {total > 0 ? `${total} ` : ''}requirements</span>
              <span className="action-arrow" aria-hidden="true">→</span>
            </Link>
          </div>
        </>
      ) : (
        <EmptyState
          title="No actions currently required"
          description="All mandatory criteria and stage blockers for this gate have been certified."
          actionLabel="View All Requirements"
          actionLink="/requirements"
          className="attention-empty-state-wrap"
        />
      )}
    </section>
  );
}

export default AttentionSection;
