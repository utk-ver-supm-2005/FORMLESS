import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('Requirements Workspace - App.css implements max 2-column desktop grid and 1-column mobile grid', () => {
  const cssPath = path.resolve(__dirname, '../src/App.css');
  const css = fs.readFileSync(cssPath, 'utf-8');

  // Must have 2-column desktop grid
  assert.ok(
    css.includes('grid-template-columns: repeat(2, minmax(0, 1fr))'),
    'App.css must define a 2-column grid for wide screens'
  );

  // Must have 1-column mobile grid
  assert.ok(
    css.includes('grid-template-columns: 1fr'),
    'App.css must switch to 1-column layout on narrower screens'
  );

  // Must have sticky toolbar at top: 60px
  assert.ok(
    css.includes('position: sticky') && css.includes('top: 60px'),
    'App.css must make the toolbar sticky below the 60px workspace navigation'
  );

  // Must have inspect affordance
  assert.ok(
    css.includes('.requirement-inspect-affordance'),
    'App.css must style the requirement inspect affordance'
  );

  // Requirement description must not have 2-line clamp truncation
  assert.ok(
    !css.includes('-webkit-line-clamp: 2'),
    'App.css must not clamp requirement descriptions to 2 lines'
  );
});

test('Requirements Workspace - RequirementCard component provides inspect affordance and clean hierarchy', () => {
  const cardPath = path.resolve(__dirname, '../src/components/RequirementCard.jsx');
  const cardCode = fs.readFileSync(cardPath, 'utf-8');

  // Must have inspect affordance
  assert.ok(
    cardCode.includes('requirement-inspect-affordance'),
    'RequirementCard must render the inspect affordance'
  );
  assert.ok(
    cardCode.includes('Inspect criteria'),
    'RequirementCard must display inspect criteria text'
  );

  // Must have metadata grouping
  assert.ok(
    cardCode.includes('requirement-meta-group'),
    'RequirementCard must group metadata items cleanly'
  );

  // Must preserve interactive accessibility attributes
  assert.ok(
    cardCode.includes('role="button"') && cardCode.includes('tabIndex={0}'),
    'RequirementCard must preserve button role and tabIndex for accessibility'
  );
});

test('Requirements Workspace - RequirementsView component maintains editorial hierarchy and status breakdown', () => {
  const viewPath = path.resolve(__dirname, '../src/views/RequirementsView.jsx');
  const viewCode = fs.readFileSync(viewPath, 'utf-8');

  // Must contain page kicker, headline, description
  assert.ok(viewCode.includes('page-kicker'), 'RequirementsView must include page kicker');
  assert.ok(viewCode.includes('page-headline'), 'RequirementsView must include page headline');
  assert.ok(viewCode.includes('page-description'), 'RequirementsView must include page description');

  // Must contain status summary breakdown strip
  assert.ok(
    viewCode.includes('requirements-summary-strip'),
    'RequirementsView must render the requirements summary strip'
  );
  assert.ok(viewCode.includes('pill-total'), 'RequirementsView must render total pill');
  assert.ok(viewCode.includes('pill-verified'), 'RequirementsView must render verified pill');
  assert.ok(viewCode.includes('pill-review'), 'RequirementsView must render review pill');
  assert.ok(viewCode.includes('pill-missing'), 'RequirementsView must render missing pill');
});
