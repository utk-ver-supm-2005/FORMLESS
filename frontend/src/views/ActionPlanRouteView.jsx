import React from 'react';
import ActionPlanView from '../components/ActionPlanView';

/**
 * ActionPlanRouteView Component (/action-plan)
 * Prioritized operational workflow resolving stage blockers and verification items.
 * Powered by ActionPlanView, actionPlanModel, and ApplicationContext.
 */
export function ActionPlanRouteView() {
  return (
    <div
      className="action-plan-route-page"
      role="region"
      aria-label="Action Plan Workspace"
    >
      <ActionPlanView />
    </div>
  );
}

export default ActionPlanRouteView;
