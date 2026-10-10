import React from 'react';
import { deriveSourceCitationModel } from './inspectorModel';

/**
 * SourceCitationBox Component
 * Displays institutional policy citations, page references, and verbatim text
 * extracted by Gemini 3.8 Flash for the inspected requirement.
 *
 * Source of Truth:
 * - requirement.source_citation
 */
export function SourceCitationBox({ citation }) {
  const model = deriveSourceCitationModel(citation);

  return (
    <div className="citation-box" role="region" aria-label="Policy Source Citation">
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
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </span>
          <h4 className="inspector-section-heading">POLICY BASIS</h4>
        </div>
        {model.confidenceScore !== null && (
          <span
            className="citation-confidence-tag"
            title={`Gemini extraction confidence: ${model.confidenceScore}%`}
          >
            {model.confidenceScore}% match
          </span>
        )}
      </div>

      {!model.hasCitation ? (
        <div className="citation-empty-note">
          <p>{model.fallbackMessage}</p>
        </div>
      ) : (
        <div className="citation-content">
          <div className="citation-meta-row">
            <span className="citation-section">{model.section}</span>
            {model.pageLabel && (
              <span className="citation-page-pill">{model.pageLabel}</span>
            )}
          </div>

          {model.quote ? (
            <blockquote className="citation-quote">
              <span className="quote-mark open" aria-hidden="true">
                “
              </span>
              <p className="quote-body">{model.quote}</p>
              <span className="quote-mark close" aria-hidden="true">
                ”
              </span>
            </blockquote>
          ) : (
            <p className="citation-no-quote">
              Section reference recorded; verbatim quote excerpt not specified.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default SourceCitationBox;
