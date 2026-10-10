import React, { useMemo } from 'react';
import { useApplication } from '../context';
import {
  deriveOverviewHeroModel,
  deriveReadinessSummaryModel,
  deriveAttentionItems,
  deriveRecentActivityEvents,
} from './overviewModel';
import OverviewHero from './OverviewHero';
import ReadinessSummary from './ReadinessSummary';
import AttentionSection from './AttentionSection';
import RecentActivitySection from './RecentActivitySection';

/**
 * FORMLESS Stage 3 Overview Experience
 *
 * Editorial product experience replacing previous placeholder.
 * Driven strictly by authoritative ApplicationContext aggregate.
 * Visual hierarchy is immediate: Hero -> Horizontal Summary -> Attention & Activity.
 */
export function OverviewView() {
  const { aggregate, activeGate, setSelectedRequirementId } = useApplication();

  const heroModel = useMemo(
    () => deriveOverviewHeroModel(aggregate, activeGate),
    [aggregate, activeGate]
  );

  const summaryModel = useMemo(
    () => deriveReadinessSummaryModel(aggregate, activeGate),
    [aggregate, activeGate]
  );

  const attentionItems = useMemo(
    () => deriveAttentionItems(aggregate, activeGate),
    [aggregate, activeGate]
  );

  const recentEvents = useMemo(
    () => deriveRecentActivityEvents(aggregate, 5),
    [aggregate]
  );

  return (
    <div className="overview-view" role="region" aria-label="Institutional Overview">
      <div className="overview-container">
        {/* 1. Large Confident Editorial Hero */}
        <OverviewHero heroModel={heroModel} />

        {/* 2. Dominant Horizontal Readiness Summary Strip */}
        <ReadinessSummary summaryModel={summaryModel} />

        {/* 3. Asymmetric Content Grid: Focused Attention + Quiet Recent Activity */}
        <div className="overview-grid">
          <div className="overview-grid-primary">
            <AttentionSection
              attentionItems={attentionItems}
              summaryModel={summaryModel}
              onSelectRequirement={setSelectedRequirementId}
            />
          </div>

          <div className="overview-grid-secondary">
            <RecentActivitySection events={recentEvents} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default OverviewView;
