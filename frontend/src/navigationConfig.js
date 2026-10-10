/**
 * Approved top-level routes and navigation configuration for FORMLESS.
 * Single source of truth for route definitions and active link determination.
 */

export const APPROVED_ROUTES = [
  {
    path: '/overview',
    label: 'Overview',
    description: 'Executive readiness summary and stage-gate compliance status.',
  },
  {
    path: '/requirements',
    label: 'Requirements',
    description: 'Filterable compliance requirement matrix and criteria verification.',
  },
  {
    path: '/readiness',
    label: 'Readiness Map',
    description: 'Interactive compliance graph tracing policy citations to stage certification.',
  },
  {
    path: '/action-plan',
    label: 'Action Plan',
    description: 'Prioritized operational workflow resolving stage blockers and verification items.',
  },
];

export const DEFAULT_ROUTE = '/overview';

/**
 * Pure helper to verify if a route path is currently active.
 */
export function isRouteActive(currentPathname, targetRoutePath) {
  if (!currentPathname || !targetRoutePath) return false;
  const normalizedCurrent = currentPathname.toLowerCase();
  const normalizedTarget = targetRoutePath.toLowerCase();
  return normalizedCurrent === normalizedTarget || normalizedCurrent.startsWith(`${normalizedTarget}/`);
}

/**
 * Resolves redirect target for any incoming path.
 */
export function resolveRoute(pathname) {
  if (!pathname || pathname === '/' || pathname === '') {
    return '/';
  }
  const match = APPROVED_ROUTES.find((r) => r.path === pathname);
  return match ? match.path : '/';
}
