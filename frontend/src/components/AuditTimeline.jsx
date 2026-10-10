import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import {
  formatAuditAction,
  formatEventTimestamp,
  formatStateLabel,
  getEventMetadataSummary,
  sortEventsChronological,
} from './auditModel';

/**
 * AuditTimeline Component
 *
 * Displays the append-only chronological audit trail of requirement transition events
 * directly from backend `GET /api/v1/requirements/{id}/events`.
 *
 * Source of Truth:
 * - Backend database via `apiClient.getRequirementEvents(requirementId)`
 * - Zero locally fabricated transitions or events.
 */
export function AuditTimeline({
  requirementId,
  events: propEvents,
  refreshTrigger,
}) {
  const [internalEvents, setInternalEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (propEvents !== undefined || !requirementId) {
      return;
    }

    let isCancelled = false;

    Promise.resolve().then(() => {
      if (isCancelled) return;
      setInternalEvents([]);
      setLoading(true);
      setError(null);

      apiClient
        .getRequirementEvents(requirementId)
        .then((res) => {
          if (!isCancelled) {
            setInternalEvents(res?.events || []);
            setLoading(false);
          }
        })
        .catch(() => {
          if (!isCancelled) {
            setError('Requirement history could not be loaded.');
            setLoading(false);
          }
        });
    });

    return () => {
      isCancelled = true;
    };
  }, [requirementId, propEvents, refreshTrigger]);

  const sortedEvents = sortEventsChronological(
    propEvents !== undefined ? propEvents : internalEvents
  );
  const count = sortedEvents.length;

  return (
    <div className="audit-timeline-container" role="region" aria-label="Requirement Audit History">
      <div className="section-header-row">
        <div className="section-title-group">
          <span className="section-icon" aria-hidden="true">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </span>
          <h4 className="inspector-section-heading">AUDIT HISTORY</h4>
        </div>
        {!loading && count > 0 && (
          <span className="audit-count-pill" title={`${count} audit events recorded`}>
            {count} {count === 1 ? 'Event' : 'Events'}
          </span>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="audit-timeline-loading" role="status">
          <span className="audit-spinner" aria-hidden="true" />
          <p className="loading-text">Loading requirement history...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="audit-timeline-error" role="alert">
          <span className="error-icon" aria-hidden="true">⚠</span>
          <p className="error-text">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && count === 0 && (
        <div className="audit-timeline-empty" role="status">
          <p className="empty-text">No recorded actions for this requirement yet.</p>
          <span className="empty-sub">
            Transitions, evidence submissions, and certifications will appear here chronologically.
          </span>
        </div>
      )}

      {/* Populated Chronological Timeline */}
      {!loading && !error && count > 0 && (
        <ol className="audit-timeline-list" role="list">
          {sortedEvents.map((event, idx) => {
            const actionInfo = formatAuditAction(event.action);
            const fromLabel = formatStateLabel(event.from_state);
            const toLabel = formatStateLabel(event.to_state);
            const timeStr = formatEventTimestamp(event.created_at);
            const metaSummary = getEventMetadataSummary(event);
            const actor = event.actor || 'System Engine';

            return (
              <li
                key={event.id || `${event.action}-${idx}`}
                className="audit-timeline-item"
                role="listitem"
              >
                {/* Timeline node track */}
                <div className="timeline-node">
                  <span className={`node-marker ${actionInfo.badgeClass}`} aria-hidden="true" />
                  {idx < count - 1 && <span className="node-line" aria-hidden="true" />}
                </div>

                {/* Event Card */}
                <div className="timeline-card">
                  <div className="timeline-card-header">
                    <span className={`timeline-action-badge ${actionInfo.badgeClass}`}>
                      {actionInfo.label}
                    </span>
                    {event.created_at && (
                      <time
                        dateTime={event.created_at}
                        className="timeline-timestamp"
                        title={event.created_at}
                      >
                        {timeStr}
                      </time>
                    )}
                  </div>

                  {/* State Transition Flow */}
                  <div className="timeline-transition-row">
                    <span className="state-badge from-state">{fromLabel}</span>
                    <span className="transition-arrow" aria-hidden="true">→</span>
                    <span className="state-badge to-state">{toLabel}</span>
                  </div>

                  {/* Actor details */}
                  <div className="timeline-actor-row">
                    <span className="actor-label">By:</span>
                    <span className="actor-value">{actor}</span>
                  </div>

                  {/* Contextual notes / metadata */}
                  {metaSummary && (
                    <div className="timeline-meta-note">
                      <p className="meta-note-text">{metaSummary}</p>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export default AuditTimeline;
