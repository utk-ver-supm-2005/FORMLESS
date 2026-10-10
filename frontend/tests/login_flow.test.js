import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('LoginFlow - Email / credential format validation', () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Invalid emails
  assert.equal(emailRegex.test(''), false);
  assert.equal(emailRegex.test('invalid'), false);
  assert.equal(emailRegex.test('invalid@'), false);
  assert.equal(emailRegex.test('invalid@domain'), false);
  assert.equal(emailRegex.test('invalid @domain.com'), false);

  // Valid institutional emails
  assert.equal(emailRegex.test('reviewer@institution.org'), true);
  assert.equal(emailRegex.test('officer@fssai.gov.in'), true);
  assert.equal(emailRegex.test('auditor@regulatory.state.gov'), true);
});

test('LoginFlow - Shared LoginForm component implements final refinement specifications', () => {
  const formFilePath = path.join(__dirname, '../src/components/LoginForm.jsx');
  assert.ok(fs.existsSync(formFilePath), 'LoginForm.jsx must exist');

  const content = fs.readFileSync(formFilePath, 'utf8');

  // 1. Headline and aesthetic branding
  assert.match(content, /Welcome to FORMLESS/, 'Must include Welcome to FORMLESS headline');
  assert.match(
    content,
    /Continue to your workspace to see requirements, evidence, and readiness in one place\./,
    'Must include supporting copy'
  );
  assert.match(content, /DEMO ACCESS MODE/i, 'Must explicitly label Demo Access Mode');

  // 2. Form fields: username/email and password with show/hide toggle
  assert.match(content, /id="login-email-input"/, 'Must provide username / email input');
  assert.match(content, /id="login-password-input"/, 'Must provide password input');
  assert.match(content, /login-password-toggle/, 'Must provide password show/hide toggle');
  assert.match(content, /Forgot password\?/, 'Must provide Forgot password link');

  // 3. Primary Sign In & Google SSO actions
  assert.match(content, /id="login-continue-btn"/, 'Must provide primary sign in button');
  assert.match(content, /Sign In/, 'Must label primary button Sign In');
  assert.match(content, /id="login-google-btn"/, 'Must provide Continue with Google button');
  assert.match(
    content,
    /Production institutional SSO is not configured on this deployment/i,
    'Must honestly disclose unconfigured SSO when Google is clicked'
  );

  // 4. Refined Compact Demo Account Panel
  assert.match(content, /login-demo-panel/, 'Must provide compact demo account panel');
  assert.match(content, /Demo account/, 'Must display Demo account heading');
  assert.match(
    content,
    /Explore the canonical FSSAI compliance scenario\./,
    'Must display exact demo description'
  );
  assert.match(content, /formless_demo/, 'Must clearly display demo username');
  assert.match(content, /FormlessDemo2026!/, 'Must clearly display demo password');
  assert.match(content, /demo-copy-btn/, 'Must provide copy button beside credentials');
  assert.match(content, /Copied!/, 'Must provide visible copied feedback');
  assert.match(
    content,
    /Sign in with Demo Account →/,
    'Must provide prominent Sign in with Demo Account CTA'
  );

  // 5. Backend Authentication and Session establishment
  assert.match(content, /apiClient\.login/, 'Must authenticate through backend API endpoint');
  assert.match(content, /formless_access_mode/, 'Must establish demo access mode in session');
  assert.match(content, /formless_demo_user/, 'Must store authenticated user in session');
});

test('LoginFlow - LoginModal component wraps shared LoginForm for modal overlay', () => {
  const modalFilePath = path.join(__dirname, '../src/components/LoginModal.jsx');
  assert.ok(fs.existsSync(modalFilePath), 'LoginModal.jsx must exist');

  const content = fs.readFileSync(modalFilePath, 'utf8');
  assert.match(content, /import LoginForm from '\.\/LoginForm'/, 'Must import LoginForm');
  assert.match(content, /<LoginForm/, 'Must render LoginForm');
  assert.match(content, /login-modal-overlay/, 'Must render modal overlay');
  assert.match(content, /role="dialog"/, 'Must have accessible dialog role');
});

test('LoginFlow - LoginPageView provides dedicated standalone /login route', () => {
  const pageFilePath = path.join(__dirname, '../src/views/LoginPageView.jsx');
  assert.ok(fs.existsSync(pageFilePath), 'LoginPageView.jsx must exist');

  const content = fs.readFileSync(pageFilePath, 'utf8');
  assert.match(content, /import LoginForm from '\.\.\/components\/LoginForm'/, 'Must import LoginForm');
  assert.match(content, /<LoginForm/, 'Must render LoginForm');
  assert.match(content, /Return to FORMLESS Overview/, 'Must provide link back to landing page');
});

test('LoginFlow - LandingPageView integrates LoginModal with all public entry points', () => {
  const landingFilePath = path.join(__dirname, '../src/views/LandingPageView.jsx');
  const content = fs.readFileSync(landingFilePath, 'utf8');

  assert.match(content, /import LoginModal from '\.\.\/components\/LoginModal'/, 'Must import LoginModal');
  assert.match(content, /<LandingNav[\s\S]*?onOpenLogin=\{handleOpenLogin\}/, 'LandingNav must receive onOpenLogin');
  assert.match(content, /id="hero-open-workspace"/, 'Hero CTA must exist');
  assert.match(content, /id="preview-open-workspace"/, 'Walkthrough link must exist');
  assert.match(content, /id="cta-open-workspace"/, 'Bottom banner CTA must exist');
  assert.match(content, /<LoginModal/, 'Must render LoginModal');
});

test('LoginFlow - App.jsx routes /login to LoginPageView and sets public landing mode', () => {
  const appFilePath = path.join(__dirname, '../src/App.jsx');
  const content = fs.readFileSync(appFilePath, 'utf8');

  assert.match(content, /path="\/login"/, 'Must configure /login route');
  assert.match(content, /element=\{<LoginPageView \/>\}/, 'Must render LoginPageView on /login');
  assert.match(
    content,
    /location\.pathname === '\/' \|\| location\.pathname === '\/login'/,
    'Must treat /login as landing page shell'
  );
});
