import React from 'react';
import { useApplication } from '../context';
import {
  ACTION_PLAN_GROUPS,
  GROUP_CONFIG,
  deriveActionPlanModel,
} from './actionPlanModel';
import ActionPlanGroup from './ActionPlanGroup';

/**
 * ActionPlanView Component
 * Renders the prioritized action-oriented compliance workspace answering:
 * 1. What is blocking me? (BLOCKING / ACTION REQUIRED)
 * 2. What needs my attention? (NEEDS VERIFICATION & IN PROGRESS)
 * 3. What is already complete? (COMPLETED)
 *
 * Source of Truth:
 * - ApplicationContext.aggregate (exclusively backend-derived read model)
 */
export function ActionPlanView() {
  const {
    aggregate,
    activeGate,
    selectedRequirementId,
    setSelectedRequirementId,
  } = useApplication();

  const model = deriveActionPlanModel(aggregate, activeGate);

  if (!model.hasData) {
    return (
      <div className="action-plan-container empty" role="region" aria-label="Action Plan Workspace">
        <div className="action-plan-empty">
          <p className="empty-title">Awaiting application compliance data</p>
          <span className="empty-sub">
            Upload a policy document or reset the demo baseline to view prioritized blockers and action items.
          </span>
        </div>
      </div>
    );
  }

  const { counts, groups } = model;
  const hasBlockers = counts.blocking > 0;

  return (
    <div
      className="action-plan-container"
      role="region"
      aria-label="Action Plan and Blockers Workspace"
      data-testid="action-plan-view"
    >
      {/* 1. Header Overview & Gate Focus */}
      <div className="action-plan-overview-bar">
        <div className="overview-text-group">
          <span className="overview-kicker">EXECUTION ROADMAP</span>
          <h2 className="overview-title">
            Target Gate: <span className="overview-gate">{model.activeGate}</span>
          </h2>
          <p className="overview-desc">
            {hasBlockers
              ? `${counts.blocking} critical ${
                  counts.blocking === 1 ? 'blocker' : 'blockers'
                } preventing gate certification. Resolve required documentation to unlock readiness.`
              : `All prerequisites for the ${model.activeGate} gate are satisfied.`}
          </p>
        </div>

        <div className="overview-stat-chips">
          <span className={`stat-chip ${hasBlockers ? 'chip-alert' : 'chip-neutral'}`}>
            <strong>{counts.blocking}</strong> Blocking
          </span>
          <span className="stat-chip chip-neutral">
            <strong>{counts.needsVerification}</strong> Verification Attention
          </span>
          <span className="stat-chip chip-neutral">
            <strong>{counts.inProgress}</strong> In Progress
          </span>
          <span className="stat-chip chip-success">
            <strong>{counts.completed}</strong> Completed
          </span>
        </div>
      </div>

      {/* 2. Prioritized Action Groups */}
      <div className="action-plan-groups-stack">
        {/* Priority 1: BLOCKING / ACTION REQUIRED */}
        <ActionPlanGroup
          groupKey={ACTION_PLAN_GROUPS.BLOCKING}
          title={GROUP_CONFIG.BLOCKING.title}
          description={GROUP_CONFIG.BLOCKING.description}
          emptyMessage={GROUP_CONFIG.BLOCKING.emptyMessage}
          items={groups.BLOCKING}
          selectedId={selectedRequirementId}
          onSelect={setSelectedRequirementId}
          cardVariant={GROUP_CONFIG.BLOCKING.cardVariant}
        />

        {/* Priority 2: NEEDS VERIFICATION */}
        <ActionPlanGroup
          groupKey={ACTION_PLAN_GROUPS.NEEDS_VERIFICATION}
          title={GROUP_CONFIG.NEEDS_VERIFICATION.title}
          description={GROUP_CONFIG.NEEDS_VERIFICATION.description}
          emptyMessage={GROUP_CONFIG.NEEDS_VERIFICATION.emptyMessage}
          items={groups.NEEDS_VERIFICATION}
          selectedId={selectedRequirementId}
          onSelect={setSelectedRequirementId}
          cardVariant={GROUP_CONFIG.NEEDS_VERIFICATION.cardVariant}
        />

        {/* Priority 3: IN PROGRESS */}
        <ActionPlanGroup
          groupKey={ACTION_PLAN_GROUPS.IN_PROGRESS}
          title={GROUP_CONFIG.IN_PROGRESS.title}
          description={GROUP_CONFIG.IN_PROGRESS.description}
          emptyMessage={GROUP_CONFIG.IN_PROGRESS.emptyMessage}
          items={groups.IN_PROGRESS}
          selectedId={selectedRequirementId}
          onSelect={setSelectedRequirementId}
          cardVariant={GROUP_CONFIG.IN_PROGRESS.cardVariant}
        />

        {/* Priority 4: COMPLETED */}
        <ActionPlanGroup
          groupKey={ACTION_PLAN_GROUPS.COMPLETED}
          title={GROUP_CONFIG.COMPLETED.title}
          description={GROUP_CONFIG.COMPLETED.description}
          emptyMessage={GROUP_CONFIG.COMPLETED.emptyMessage}
          items={groups.COMPLETED}
          selectedId={selectedRequirementId}
          onSelect={setSelectedRequirementId}
          cardVariant={GROUP_CONFIG.COMPLETED.cardVariant}
        />
      </div>
    </div>
  );
}

export default ActionPlanView;
