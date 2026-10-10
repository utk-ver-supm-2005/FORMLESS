import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Editorial Tree Item component for an item requiring user attention.
 * Inspired by Reference Image 1:
 * - Tree branching connector line & clean status node bullet
 * - Priority pill dropdown style ("Urgent ⌄" in soft rose)
 * - Status pill dropdown style ("In Progress ⌄" in soft amber)
 * - Assignee / actor pill ("Chloe", "Anna", "Ramesh" avatar pills)
 */
export function AttentionItem({ item, onSelect, isLast = false }) {
  const handleClick = () => {
    if (onSelect) {
      onSelect(item.id);
    }
  };

  // Assignee mapping for realistic institutional context
  const getActorInfo = () => {
    if (item.code?.includes('07')) {
      return { name: 'Registrar Office', initials: 'RO', bg: '#EFF6FF', text: '#2563EB' };
    }
    if (item.code?.includes('08')) {
      return { name: 'Institutional Dean', initials: 'ID', bg: '#FDF2F8', text: '#DB2777' };
    }
    if (item.code?.includes('05') || item.code?.includes('06')) {
      return { name: 'Faculty Advisor', initials: 'FA', bg: '#F5F3FF', text: '#7C3AED' };
    }
    return { name: 'Applicant', initials: 'AP', bg: '#ECFDF5', text: '#059669' };
  };

  const actor = getActorInfo();

  return (
    <article
      className={`attention-tree-item ${item.isBlocker ? 'is-blocker' : ''} ${
        isLast ? 'is-last-branch' : ''
      }`}
      id={`attention-${item.id}`}
    >
      {/* Tree Connector Column (Reference Image 1: Tree branching line) */}
      <div className="tree-connector-col" aria-hidden="true">
        <span className="tree-vertical-line" />
        <span className="tree-branch-curve" />
        <span className={`tree-node-dot ${item.isBlocker ? 'dot-urgent' : 'dot-pending'}`} />
      </div>

      {/* Main Content Card */}
      <div className="attention-item-body">
        <div className="attention-item-main">
          <div className="attention-header-line">
            <span className="attention-code">{item.code}</span>
            <h3 className="attention-title">{item.title}</h3>
          </div>

          <p className="attention-reason">{item.reason}</p>

          {/* Metadata Pill Rows (Reference Image 1: Priority, Status, Assignee) */}
          <div className="attention-metadata-row">
            {/* Priority Tag */}
            <div className="meta-pill-group">
              <span className="meta-label">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                  <line x1="4" y1="22" x2="4" y2="15" />
                </svg>
                Priority
              </span>
              <span className={`pill-badge ${item.isBlocker ? 'pill-urgent' : 'pill-standard'}`}>
                {item.isBlocker ? 'Urgent' : 'Standard'}
                <span className="pill-caret">▾</span>
              </span>
            </div>

            {/* Status Tag */}
            <div className="meta-pill-group">
              <span className="meta-label">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Status
              </span>
              <span
                className={`pill-badge ${
                  item.isBlocker
                    ? 'pill-urgent'
                    : item.state === 'NEEDS_VERIFICATION'
                    ? 'pill-review'
                    : 'pill-in-progress'
                }`}
              >
                {item.isBlocker
                  ? 'Gate Blocker'
                  : item.state === 'NEEDS_VERIFICATION'
                  ? 'Review Required'
                  : item.statusLabel || 'In Progress'}
                <span className="pill-caret">▾</span>
              </span>
            </div>

            {/* Assignee / Actor Pill (Reference Image 1: Chloe / Anna / Ramesh avatar pills) */}
            <div className="avatar-pill" title={`Assigned Actor: ${actor.name}`}>
              <span
                className="avatar-circle"
                style={{ backgroundColor: actor.bg, color: actor.text }}
                aria-hidden="true"
              >
                {actor.initials}
              </span>
              <span className="avatar-name">{actor.name}</span>
            </div>
          </div>
        </div>

        {/* Action Link */}
        <div className="attention-item-action">
          <Link
            to={item.detailUrl}
            onClick={handleClick}
            className="attention-action-link"
            aria-label={`Inspect requirement ${item.title}`}
          >
            <span>View</span>
            <span className="action-arrow" aria-hidden="true">
              →
            </span>
          </Link>
        </div>
      </div>
    </article>
  );
}

export default AttentionItem;
