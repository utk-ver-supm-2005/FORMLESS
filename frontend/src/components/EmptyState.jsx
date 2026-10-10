import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Minimalist Isometric Empty State Component
 * Inspired by Reference Image 2: architectural line-art drawing,
 * calm typography, generous whitespace, and sleek pill action button.
 */
export function EmptyState({
  title = 'No data yet',
  description = 'Your data will appear here once you create or import your first records.',
  actionLabel,
  onAction,
  actionLink,
  className = '',
}) {
  return (
    <div className={`empty-state-isometric ${className}`.trim()} role="status">
      <div className="empty-state-illustration" aria-hidden="true">
        <svg
          width="130"
          height="140"
          viewBox="0 0 130 140"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="isometric-cabinet-svg"
        >
          {/* Cabinet Top Face (diamond) */}
          <polygon
            points="65,16 102,35 65,54 28,35"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Cabinet Right Side Panel */}
          <polygon
            points="102,35 102,95 65,114 65,54"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Cabinet Left Face (upper section) */}
          <polyline
            points="28,35 28,68 65,87 65,54"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Keyhole on top center */}
          <circle cx="65" cy="59" r="1.5" fill="currentColor" />

          {/* Upper Drawer label slot */}
          <polygon
            points="48,58 56,62 56,66 48,62"
            stroke="currentColor"
            strokeWidth="1.2"
          />

          {/* Upper Drawer handle */}
          <path
            d="M 45,70 L 53,74"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Lower Open Drawer (pulled forward down-left) */}
          {/* Drawer open box top rim / opening */}
          <polygon
            points="12,78 48,60 80,76 44,94"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Drawer interior bottom face */}
          <polygon
            points="24,96 52,82 68,90 40,104"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="2 2"
          />

          {/* Drawer Front Face */}
          <polygon
            points="12,78 44,94 44,116 12,100"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Drawer front handle */}
          <path
            d="M 25,94 L 32,97.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Drawer front label slot */}
          <polygon
            points="25,86 32,89.5 32,92.5 25,89"
            stroke="currentColor"
            strokeWidth="1.2"
          />

          {/* Drawer Right Side (extended) */}
          <polygon
            points="44,94 80,76 80,98 44,116"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Drawer interior slide track */}
          <line
            x1="52"
            y1="90"
            x2="72"
            y2="80"
            stroke="currentColor"
            strokeWidth="1.2"
          />

          {/* Cabinet Main Frame Rear lines */}
          <line x1="28" y1="68" x2="28" y2="105" stroke="currentColor" strokeWidth="1.5" />
          <line x1="28" y1="105" x2="65" y2="124" stroke="currentColor" strokeWidth="1.5" />
          <line x1="65" y1="124" x2="102" y2="105" stroke="currentColor" strokeWidth="1.5" />

          {/* Cabinet Feet */}
          <polyline
            points="28,105 28,111 32,113 32,107"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <polyline
            points="61,122 61,128 69,128 69,122"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <polyline
            points="98,107 98,113 102,111 102,105"
            stroke="currentColor"
            strokeWidth="1.2"
          />
        </svg>
      </div>

      <div className="empty-state-text-group">
        <h3 className="empty-state-headline">{title}</h3>
        {description && <p className="empty-state-subline">{description}</p>}
      </div>

      {actionLabel && (
        <div className="empty-state-actions">
          {actionLink ? (
            actionLink.startsWith('/') ? (
              <Link to={actionLink} className="empty-state-btn">
                {actionLabel}
              </Link>
            ) : (
              <a href={actionLink} className="empty-state-btn">
                {actionLabel}
              </a>
            )
          ) : (
            <button
              type="button"
              className="empty-state-btn"
              onClick={onAction}
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
