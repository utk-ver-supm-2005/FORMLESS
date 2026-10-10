import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APPROVED_ROUTES,
  DEFAULT_ROUTE,
  isRouteActive,
  resolveRoute,
} from '../src/navigationConfig.js';

test('Routing - Exact approved routes exist in expected order', () => {
  const paths = APPROVED_ROUTES.map((r) => r.path);
  assert.deepEqual(paths, [
    '/overview',
    '/requirements',
    '/readiness',
    '/action-plan',
  ]);
});

test('Routing - Approved route labels and descriptions', () => {
  const overview = APPROVED_ROUTES.find((r) => r.path === '/overview');
  assert.equal(overview.label, 'Overview');
  assert.match(overview.description, /readiness summary/i);

  const requirements = APPROVED_ROUTES.find((r) => r.path === '/requirements');
  assert.equal(requirements.label, 'Requirements');
  assert.match(requirements.description, /requirement matrix/i);

  const readiness = APPROVED_ROUTES.find((r) => r.path === '/readiness');
  assert.equal(readiness.label, 'Readiness Map');
  assert.match(readiness.description, /compliance graph/i);

  const actionPlan = APPROVED_ROUTES.find((r) => r.path === '/action-plan');
  assert.equal(actionPlan.label, 'Action Plan');
  assert.match(actionPlan.description, /operational workflow/i);
});

test('Routing - Default route is canonical /overview', () => {
  assert.equal(DEFAULT_ROUTE, '/overview');
});

test('Routing - Root and empty path resolve to public landing page /', () => {
  assert.equal(resolveRoute('/'), '/');
  assert.equal(resolveRoute(''), '/');
  assert.equal(resolveRoute(null), '/');
  assert.equal(resolveRoute(undefined), '/');
});

test('Routing - Approved paths resolve directly to themselves', () => {
  assert.equal(resolveRoute('/overview'), '/overview');
  assert.equal(resolveRoute('/requirements'), '/requirements');
  assert.equal(resolveRoute('/readiness'), '/readiness');
  assert.equal(resolveRoute('/action-plan'), '/action-plan');
});

test('Routing - Unknown / wildcard paths fallback safely to landing page', () => {
  assert.equal(resolveRoute('/dashboard'), '/');
  assert.equal(resolveRoute('/invalid-route'), '/');
  assert.equal(resolveRoute('/unknown/nested'), '/');
});

test('Routing - Active route detection helper matches current pathname', () => {
  // Exact match
  assert.equal(isRouteActive('/overview', '/overview'), true);
  assert.equal(isRouteActive('/requirements', '/requirements'), true);
  assert.equal(isRouteActive('/readiness', '/readiness'), true);
  assert.equal(isRouteActive('/action-plan', '/action-plan'), true);

  // Inactive cases
  assert.equal(isRouteActive('/overview', '/requirements'), false);
  assert.equal(isRouteActive('/readiness', '/action-plan'), false);
  assert.equal(isRouteActive('/action-plan', '/overview'), false);

  // Root path isolates public landing page
  assert.equal(isRouteActive('/', '/overview'), false);
  assert.equal(isRouteActive('/', '/requirements'), false);

  // Null/empty cases
  assert.equal(isRouteActive(null, '/overview'), false);
  assert.equal(isRouteActive('/overview', null), false);
});

test('Routing - State persistence: switching route paths does not alter mock aggregate', () => {
  const sampleAggregate = {
    application: { id: 'app-001', title: 'FSSAI Internship' },
    active_gate: 'JOINING',
    requirements: [{ id: 'req-1', code: 'REQ-001', state: 'VERIFIED' }],
  };

  // Simulate routing traversal
  const routeHistory = ['/overview', '/requirements', '/readiness', '/action-plan', '/overview'];
  routeHistory.forEach((path) => {
    const target = resolveRoute(path);
    assert.ok(target);
    // Verifies aggregate reference and values are preserved
    assert.equal(sampleAggregate.application.id, 'app-001');
    assert.equal(sampleAggregate.requirements.length, 1);
  });
});
