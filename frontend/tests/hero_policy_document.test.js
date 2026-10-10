import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('HeroPolicyDocument - Component source code meets editorial paper requirements', () => {
  const componentPath = path.resolve(__dirname, '../src/components/HeroPolicyDocument.jsx');
  assert.ok(fs.existsSync(componentPath), 'HeroPolicyDocument.jsx must exist');

  const content = fs.readFileSync(componentPath, 'utf8');

  // 1. Rebuild the physical document composition (3 layered paper sheets)
  assert.ok(content.includes('sheet-back'), 'Must render sheet-back layer');
  assert.ok(content.includes('sheet-mid'), 'Must render sheet-mid layer');
  assert.ok(content.includes('sheet-front'), 'Must render sheet-front layer');

  // 2. Removal of the blank rear rectangle: Back sheet must have authentic Gazette content
  assert.ok(content.includes('THE GAZETTE OF INDIA'), 'Back sheet must feature authentic Gazette header');
  assert.ok(content.includes('MINISTRY OF HEALTH AND FAMILY WELFARE'), 'Back sheet must feature Ministry of Health notification');
  assert.ok(content.includes('sheet-watermark-seal'), 'Back sheet must feature official seal watermark');
  assert.ok(content.includes('[PAGE 13 OF 42]'), 'Back sheet must include authentic page 13 folio');

  // 3. Middle sheet: Annexure schedule
  assert.ok(content.includes('ANNEXURE B'), 'Middle sheet must feature Annexure B');
  assert.ok(content.includes('[PAGE 15 OF 42]'), 'Middle sheet must include authentic page 15 folio');

  // 4. Foreground centerpiece: Official FSSAI Policy Circular
  assert.ok(content.includes('FOOD SAFETY AND STANDARDS AUTHORITY OF INDIA'), 'Foreground sheet must feature official authority name');
  assert.ok(content.includes('Ministry of Health & Family Welfare'), 'Foreground sheet must cite Ministry of Health & Family Welfare');
  assert.ok(content.includes('FSSAI-HQ-2026/REG-04'), 'Foreground sheet must cite official circular reference');
  assert.ok(content.includes('PAGE 14 OF 42'), 'Foreground sheet must state Page 14 of 42');

  // 5. Verbatim statutory clause § 4.2
  assert.ok(content.includes('§ 4.2'), 'Must cite Clause § 4.2');
  assert.ok(content.includes('INSTITUTIONAL ENDORSEMENT'), 'Must label § 4.2 Institutional Endorsement');
  assert.ok(content.includes('No Objection Certificate (NOC)'), 'Must include statutory NOC clause wording');
  assert.ok(content.includes('Dean or Registrar'), 'Must include Dean or Registrar statutory clause wording');
  assert.ok(content.includes('clause-anchor-node'), 'Must include anchor node for SVG connector');

  // 6. SVG Connector path & animations
  assert.ok(content.includes('hero-svg-connectors'), 'Must render SVG connector element');
  assert.ok(content.includes('heroLavenderCurve'), 'Must use restrained lavender connector gradient');
  assert.ok(content.includes('strokeDasharray'), 'Must implement stroke dash animated path drawing');

  // 7. Satellite annotations: Requirement, Evidence, Gate Blocker
  assert.ok(content.includes('REQ-04'), 'Must render decomposed requirement REQ-04');
  assert.ok(content.includes('Institutional NOC Clearance'), 'Must name REQ-04 Institutional NOC Clearance');
  assert.ok(content.includes('College_NOC_Signed.pdf'), 'Must render evidence attachment College_NOC_Signed.pdf');
  assert.ok(content.includes('1.4 MB'), 'Must specify file size 1.4 MB');
  assert.ok(content.includes('GATE HOLD · 1 BLOCKER'), 'Must render restrained gate hold blocker pill');

  // 8. Integration with #process walkthrough section
  assert.ok(content.includes('href="#process"'), 'Must link to #process section');
});

test('LandingPageView - Mounts HeroPolicyDocument in the hero visual column', () => {
  const landingPath = path.resolve(__dirname, '../src/views/LandingPageView.jsx');
  const content = fs.readFileSync(landingPath, 'utf8');

  assert.ok(content.includes("import HeroPolicyDocument from '../components/HeroPolicyDocument';"), 'Must import HeroPolicyDocument');
  assert.ok(content.includes('<HeroPolicyDocument />'), 'Must mount <HeroPolicyDocument />');

  // Verify preservation of exact required headline and eyebrow label
  assert.ok(content.includes('Turn complex requirements'), 'Must preserve headline');
  assert.ok(content.includes('into clear next steps.'), 'Must preserve headline accent text');
  assert.ok(content.includes('FORMLESS / INSTITUTIONAL WORKFLOWS'), 'Must preserve exact eyebrow signature');
});

test('App.css - Styles HeroPolicyDocument with tactile paper surfaces and responsive rules', () => {
  const cssPath = path.resolve(__dirname, '../src/App.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  assert.ok(css.includes('.hero-policy-document-wrapper'), 'Must style .hero-policy-document-wrapper');
  assert.ok(css.includes('.sheet-back'), 'Must style .sheet-back layer');
  assert.ok(css.includes('.sheet-mid'), 'Must style .sheet-mid layer');
  assert.ok(css.includes('.sheet-front'), 'Must style .sheet-front centerpiece');
  assert.ok(css.includes('.policy-doc-clause.clause-highlighted'), 'Must style highlighted clause');
  assert.ok(css.includes('.hero-svg-connectors'), 'Must style SVG connector layer');
  assert.ok(css.includes('.chip-requirement'), 'Must style requirement chip');
  assert.ok(css.includes('.chip-evidence'), 'Must style evidence chip');
  assert.ok(css.includes('.hero-gate-indicator'), 'Must style gate readiness indicator');
  assert.ok(css.includes('@media (max-width: 768px)'), 'Must include mobile responsive styles');
  assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'), 'Must support prefers-reduced-motion');
});
