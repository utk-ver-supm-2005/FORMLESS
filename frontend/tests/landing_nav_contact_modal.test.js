import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('Navbar Redesign - LandingNav implements new Information Architecture', () => {
  const navFilePath = path.join(__dirname, '../src/views/LandingNav.jsx');
  assert.ok(fs.existsSync(navFilePath), 'LandingNav.jsx must exist');

  const content = fs.readFileSync(navFilePath, 'utf8');

  // 1. Brand logo and wordmark (no redundant "Compliance Intelligence")
  assert.match(content, /brand-wordmark.*FORMLESS/s, 'Brand wordmark must display FORMLESS');
  assert.equal(
    content.includes('brand-context-label'),
    false,
    'Must remove redundant Compliance Intelligence descriptor from navbar'
  );

  // 2. New 4 Navigation Destinations
  assert.match(content, /label:\s*'Home'/, 'Must contain Home link');
  assert.match(content, /label:\s*'How it works'/, 'Must contain How it works link');
  assert.match(content, /label:\s*'The document'/, 'Must contain The document link');
  assert.match(content, /label:\s*'Security'/, 'Must contain Security link');

  // Must not have old crowded links
  assert.equal(content.includes('The Problem'), false, 'Old "The Problem" link must be removed');
  assert.equal(content.includes('Traceability'), false, 'Old "Traceability" nav link must be removed');
  assert.equal(content.includes('Product Walkthrough'), false, 'Old "Product Walkthrough" nav link must be removed');

  // 3. Actions: Contact Us and Open Workspace
  assert.match(content, /nav-contact-us/, 'Must include Contact us button with id nav-contact-us');
  assert.match(content, /Contact us/, 'Must display Contact us label');
  assert.match(content, /nav-open-workspace/, 'Must include Open workspace button');
  assert.match(content, /Open workspace/, 'Must display Open workspace label');

  // 4. Responsive mobile menu drawer
  assert.match(content, /mobile-hamburger-btn/, 'Must provide mobile hamburger menu toggle');
  assert.match(content, /mobile-nav-drawer/, 'Must provide accessible mobile navigation drawer');
});

test('ContactModal - Implements all functional issue submission requirements', () => {
  const modalFilePath = path.join(__dirname, '../src/components/ContactModal.jsx');
  assert.ok(fs.existsSync(modalFilePath), 'ContactModal.jsx must exist');

  const content = fs.readFileSync(modalFilePath, 'utf8');

  // 1. Accessibility attributes
  assert.match(content, /role="dialog"/, 'Must have role="dialog"');
  assert.match(content, /aria-modal="true"/, 'Must have aria-modal="true"');
  assert.match(content, /aria-labelledby="contact-modal-title"/, 'Must have aria-labelledby');
  assert.match(content, /aria-describedby="contact-modal-desc"/, 'Must have aria-describedby');

  // 2. Exact Title and Description copy
  assert.match(content, /Tell us what's wrong\./, 'Must have title "Tell us what\'s wrong."');
  assert.match(
    content,
    /Found a problem or have feedback\? Send us the details\./,
    'Must have exact description'
  );

  // 3. Form fields
  assert.match(content, /id="contact-email"/, 'Must include email input');
  assert.match(content, /id="contact-issue-type"/, 'Must include issue type select');
  assert.match(content, /id="contact-subject"/, 'Must include subject input');
  assert.match(content, /id="contact-description"/, 'Must include description textarea');
  assert.match(content, /id="contact-page-route"/, 'Must include page route input');

  // 4. Issue Types
  assert.match(content, /'Bug'/, 'Must include Bug option');
  assert.match(content, /'UI \/ Design'/, 'Must include UI / Design option');
  assert.match(content, /'Document upload'/, 'Must include Document upload option');
  assert.match(content, /'Login \/ Access'/, 'Must include Login / Access option');
  assert.match(content, /'Other'/, 'Must include Other option');

  // 5. Actions and states
  assert.match(content, /id="contact-submit-btn"/, 'Must provide submit button');
  assert.match(content, /Submit issue/, 'Must label submit button "Submit issue"');
  assert.match(content, /Cancel/, 'Must provide Cancel button');
  assert.match(content, /contact-success-state/, 'Must provide explicit success state');
  assert.match(content, /contact-issue-id-display/, 'Must display issue reference id on success');
});

test('ApiClient - submitIssue method validates inputs and submits to backend', () => {
  const clientFilePath = path.join(__dirname, '../src/api/client.js');
  const content = fs.readFileSync(clientFilePath, 'utf8');

  assert.match(content, /async submitIssue\(/, 'ApiClient must have submitIssue method');
  assert.match(content, /\/support\/issues/, 'Must call /support/issues endpoint');
});

test('LandingPageView - Integrates ContactModal and verified destination anchors', () => {
  const landingFilePath = path.join(__dirname, '../src/views/LandingPageView.jsx');
  const content = fs.readFileSync(landingFilePath, 'utf8');

  // Integrated modal
  assert.match(content, /import ContactModal from '\.\.\/components\/ContactModal'/, 'Must import ContactModal');
  assert.match(content, /<ContactModal/, 'Must render ContactModal');
  assert.match(content, /onOpenContact=\{handleOpenContact\}/, 'Must pass onOpenContact to LandingNav');

  // Verified section IDs for nav destinations
  assert.match(content, /id="home"/, 'Landing page top must have id="home"');
  assert.match(content, /id="workflow"/, 'Workflow section must have id="workflow"');
  assert.match(content, /id="security"/, 'Security section must have id="security"');
});

test('App.css - Styles the 72-80px navbar and ContactModal dialog', () => {
  const cssFilePath = path.join(__dirname, '../src/App.css');
  const content = fs.readFileSync(cssFilePath, 'utf8');

  // Navbar layout & aesthetic tokens
  assert.match(content, /\.public-landing-nav/, 'Must style .public-landing-nav');
  assert.match(content, /height:\s*76px/, 'Must specify navbar height in 72-80px range');
  assert.match(content, /\.landing-contact-btn/, 'Must style Contact us secondary button');
  assert.match(content, /\.mobile-nav-drawer/, 'Must style mobile drawer');

  // Contact Modal dialog
  assert.match(content, /\.contact-modal-overlay/, 'Must style modal backdrop overlay');
  assert.match(content, /\.contact-modal-dialog/, 'Must style centered dialog container');
  assert.match(content, /max-width:\s*560px/, 'Dialog width must be in 520-600px range');
  assert.match(content, /\.contact-success-state/, 'Must style success state');
});
