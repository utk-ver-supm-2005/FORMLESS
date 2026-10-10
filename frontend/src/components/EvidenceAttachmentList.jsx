import React from 'react';
import { formatFileSize } from './lifecycleModel';

/**
 * EvidenceAttachmentList Component
 * Displays institutional documentation attached to the selected requirement.
 *
 * Source of Truth:
 * - requirement.evidence_links
 *
 * Downloads files using backend `/api/v1/evidence/{id}/download` endpoint.
 */
export function EvidenceAttachmentList({ evidenceLinks = [] }) {
  const hasLinks = Array.isArray(evidenceLinks) && evidenceLinks.length > 0;

  return (
    <div className="evidence-attachment-list" role="region" aria-label="Attached Evidence">
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
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </span>
          <h4 className="inspector-section-heading">EVIDENCE ATTACHMENTS</h4>
        </div>
        {hasLinks && (
          <span className="evidence-count-tag">
            {evidenceLinks.length} {evidenceLinks.length === 1 ? 'Document' : 'Documents'}
          </span>
        )}
      </div>

      {!hasLinks ? (
        <div className="evidence-empty-note">
          <p className="empty-note-title">No evidence attached yet.</p>
          <span className="empty-note-sub">
            Substantiating institutional documentation or certificate files will appear here.
          </span>
        </div>
      ) : (
        <div className="evidence-items-grid">
          {evidenceLinks.map((link) => {
            const downloadUrl = `/api/v1/evidence/${link.evidence_item_id}/download`;
            const extMatch = (link.file_name || '').match(/\.([0-9a-z]+)$/i);
            const fileTypeLabel = extMatch
              ? extMatch[1].toUpperCase()
              : (link.mime_type?.includes('pdf') ? 'PDF' : 'DOC');

            const dateStr = link.linked_at
              ? new Date(link.linked_at).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : null;

            return (
              <div key={link.id || link.evidence_item_id} className="evidence-item-card">
                <div className="evidence-item-main">
                  <div className="evidence-file-icon" aria-hidden="true">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div className="evidence-file-details">
                    <div className="evidence-file-name-row">
                      <span className="evidence-file-name" title={link.file_name}>
                        {link.file_name}
                      </span>
                      <span className="evidence-type-badge">{fileTypeLabel}</span>
                    </div>
                    <div className="evidence-file-meta">
                      <span className="evidence-file-size">
                        {formatFileSize(link.file_size)}
                      </span>
                      {dateStr && (
                        <>
                          <span className="meta-divider">•</span>
                          <span className="evidence-file-date">{dateStr}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {link.link_notes && (
                  <p className="evidence-link-notes">{link.link_notes}</p>
                )}

                <div className="evidence-item-actions">
                  <a
                    href={downloadUrl}
                    className="evidence-download-link"
                    download={link.file_name}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Download ${link.file_name}`}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span>Download</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default EvidenceAttachmentList;
