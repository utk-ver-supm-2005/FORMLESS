import React from 'react';

/**
 * Editorial Hero for the FORMLESS Overview experience.
 * Dominant visual object driven entirely by authoritative readiness data.
 * Does not live inside a generic rounded card; uses confident typography
 * and generous whitespace.
 */
export function OverviewHero({ heroModel }) {
  const { state, targetGate, headline, subline } = heroModel;

  return (
    <section className="overview-hero" aria-label="Readiness Hero">
      <div className="overview-hero-eyebrow">
        <span className={`hero-status-indicator indicator-${state.toLowerCase()}`} aria-hidden="true" />
        <span className="hero-eyebrow-text">Stage Gate Clearance · {targetGate}</span>
      </div>

      <h1 className="overview-hero-headline" data-state={state}>
        {headline}
      </h1>

      <p className="overview-hero-subline">
        {subline}
      </p>
    </section>
  );
}

export default OverviewHero;
