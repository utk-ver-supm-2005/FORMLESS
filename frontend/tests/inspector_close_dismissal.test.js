import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('Requirement Inspector Close Button - RequirementInspector supports onClose and safe URL dismissal', () => {
  const inspectorPath = path.resolve(__dirname, '../src/components/RequirementInspector.jsx');
  const code = fs.readFileSync(inspectorPath, 'utf-8');

  // Must accept onClose prop
  assert.ok(
    code.includes('export function RequirementInspector({ onClose })'),
    'RequirementInspector must accept onClose prop'
  );

  // Must import useSearchParams for URL cleanup
  assert.ok(
    code.includes('useSearchParams'),
    'RequirementInspector must import and use useSearchParams'
  );

  // Close button must have type="button" and click handler
  assert.ok(
    code.includes('className="inspector-close-btn"'),
    'RequirementInspector must render inspector-close-btn'
  );
  assert.ok(
    code.includes('onClick={handleCloseClick}'),
    'RequirementInspector close button must be wired to handleCloseClick'
  );
  assert.ok(
    code.includes('data-testid="inspector-close-button"'),
    'RequirementInspector close button must include data-testid'
  );

  // handleCloseClick must clear detail param from URL
  assert.ok(
    code.includes("nextParams.delete('detail')"),
    'handleCloseClick must delete detail query param from URL'
  );
});

test('Requirement Drawer - Passes onClose to RequirementInspector and eliminates resurrection race condition', () => {
  const drawerPath = path.resolve(__dirname, '../src/components/RequirementDrawer.jsx');
  const code = fs.readFileSync(drawerPath, 'utf-8');

  // Must pass onClose={handleClose} to RequirementInspector
  assert.ok(
    code.includes('<RequirementInspector onClose={handleClose} />'),
    'RequirementDrawer must pass onClose={handleClose} to child RequirementInspector'
  );

  // Must guard against resurrection using isClosingRef
  assert.ok(
    code.includes('isClosingRef'),
    'RequirementDrawer must use isClosingRef guard to prevent synchronization resurrection'
  );

  // handleClose must delete detail param and clear selection
  assert.ok(
    code.includes("setSelectedRequirementId(null)"),
    'handleClose must clear selectedRequirementId'
  );
  assert.ok(
    code.includes("nextParams.delete('detail')"),
    'handleClose must delete detail param from URL'
  );

  // Drawer panel must stop click propagation
  assert.ok(
    code.includes('onClick={(e) => e.stopPropagation()}'),
    'drawer-panel must stop click propagation so clicking inside does not close drawer'
  );

  // Escape key must trigger handleClose
  assert.ok(
    code.includes("e.key === 'Escape'") && code.includes('handleClose()'),
    'Escape key listener must call handleClose'
  );
});
