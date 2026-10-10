import React from 'react';

/**
 * Recent Activity Section
 * Displays a quiet, restrained timeline of authentic requirement transition events.
 * Strictly consumes real audit trail data — never fabricates activity.
 * Removes heavy bordered empty container when no events exist.
 */
export function RecentActivitySection({ events = [] }) {
  const hasEvents = events && events.length > 0;

  // Generates avatar styling based on actor string
  const getActorBadge = (actorName) => {
    if (!actorName) {
      return { initials: 'SY', bg: '#F4F4F5', text: '#52525B' };
    }
    const name = actorName.replace(/_/g, ' ');
    const parts = name.split(' ');
    const initials = parts.length > 1
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase();

    if (actorName.includes('reviewer') || actorName.includes('institutional')) {
      return { name, initials, bg: '#F5F3FF', text: '#7C3AED' };
    }
    if (actorName.includes('applicant') || actorName.includes('student')) {
      return { name, initials, bg: '#EFF6FF', text: '#2563EB' };
    }
    return { name, initials, bg: '#ECFDF5', text: '#059669' };
  };

  return (
    <section className="recent-activity-section" aria-label="Recent Compliance Activity">
      <div className="section-header-row">
        <h2 className="section-title-subordinate">Recent Activity</h2>
      </div>

      {hasEvents ? (
        <ol className="activity-timeline-list">
          {events.map((ev) => {
            const actorBadge = getActorBadge(ev.actor);

            return (
              <li key={ev.id} className="activity-timeline-item">
                <div className="activity-dot-col">
                  <span className={`activity-status-dot ${ev.actionBadgeClass || 'action-default'}`} />
                  <span className="activity-line" aria-hidden="true" />
                </div>

                <div className="activity-details-col">
                  <div className="activity-primary-line">
                    <span className="activity-action-label">{ev.actionLabel}</span>
                    <span className="activity-separator">·</span>
                    <span className="activity-req-code">{ev.requirementCode}</span>
                  </div>

                  <div className="activity-title-line">
                    {ev.requirementTitle}
                  </div>

                  <div className="activity-meta-line">
                    <span className="activity-actor-pill">
                      <span
                        className="avatar-circle-sm"
                        style={{ backgroundColor: actorBadge.bg, color: actorBadge.text }}
                        aria-hidden="true"
                      >
                        {actorBadge.initials}
                      </span>
                      <span className="activity-actor-name">{actorBadge.name}</span>
                    </span>

                    <span className="activity-separator">·</span>

                    <time className="activity-timestamp" dateTime={ev.createdAt}>
                      {ev.formattedTimestamp}
                    </time>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        /* Quiet unbordered notice instead of large bordered empty container */
        <div className="activity-quiet-empty">
          <p className="activity-quiet-text">
            No lifecycle events recorded yet. Transitions will appear here as criteria are reviewed.
          </p>
        </div>
      )}
    </section>
  );
}

export default RecentActivitySection;
