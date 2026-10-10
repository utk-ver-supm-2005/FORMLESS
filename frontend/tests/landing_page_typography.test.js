import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('LandingPage Typography - Hero headline text matches exact specification', () => {
  const landingFilePath = path.join(__dirname, '../src/views/LandingPageView.jsx');
  assert.ok(fs.existsSync(landingFilePath), 'LandingPageView.jsx must exist');

  const content = fs.readFileSync(landingFilePath, 'utf8');

  // Must match exact text "Turn complex requirements into clear next steps."
  assert.match(
    content,
    /Turn complex requirements[\s\S]*?<span className="headline-accent">into clear next steps\.<\/span>/,
    'Must have exact headline with accent on "into clear next steps."'
  );

  // Must NOT contain old text
  assert.equal(
    content.includes('Turn complex policies'),
    false,
    'Must not contain old headline "Turn complex policies"'
  );
});

test('LandingPage Typography - Eyebrow label replaced with considered editorial signature', () => {
  const landingFilePath = path.join(__dirname, '../src/views/LandingPageView.jsx');
  const content = fs.readFileSync(landingFilePath, 'utf8');

  // Must contain FORMLESS / INSTITUTIONAL WORKFLOWS
  assert.match(
    content,
    /FORMLESS \/ INSTITUTIONAL WORKFLOWS/,
    'Must contain FORMLESS / INSTITUTIONAL WORKFLOWS'
  );

  // Must NOT contain old eyebrow text
  assert.equal(
    content.includes('DETERMINISTIC COMPLIANCE INTELLIGENCE'),
    false,
    'Must completely remove DETERMINISTIC COMPLIANCE INTELLIGENCE'
  );

  // Must NOT contain leading dot inside eyebrow
  assert.match(
    content,
    /<div className="hero-eyebrow"[^>]*>\s*<span className="eyebrow-text">FORMLESS \/ INSTITUTIONAL WORKFLOWS<\/span>\s*<\/div>/,
    'Eyebrow must have no leading dot or glowing indicator'
  );
});

test('LandingPage Typography - CSS applies restrained editorial styling without pill/badges', () => {
  const cssFilePath = path.join(__dirname, '../src/App.css');
  assert.ok(fs.existsSync(cssFilePath), 'App.css must exist');

  const css = fs.readFileSync(cssFilePath, 'utf8');

  // .hero-eyebrow should have transparent/no background and no pill border
  assert.match(
    css,
    /\.hero-eyebrow\s*\{[^}]*background:\s*transparent;[^}]*border:\s*none;/,
    'hero-eyebrow must have no pill background or border'
  );

  // .eyebrow-dot must be hidden
  assert.match(
    css,
    /\.eyebrow-dot\s*\{[^}]*display:\s*none;/,
    'eyebrow-dot must be hidden'
  );

  // .eyebrow-text should have uppercase and letter-spacing
  assert.match(
    css,
    /\.eyebrow-text\s*\{[^}]*letter-spacing:[^}]*text-transform:\s*uppercase;/,
    'eyebrow-text must have uppercase and letter-spacing'
  );

  // .hero-headline should have word-break and clamp
  assert.match(
    css,
    /\.hero-headline\s*\{[^}]*font-size:\s*clamp\(/,
    'hero-headline must use fluid clamp typography'
  );
});
