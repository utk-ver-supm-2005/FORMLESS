import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  ShieldCheck,
  FileText,
  GitBranch,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import LandingNav from './LandingNav';
import HeroPolicyDocument from '../components/HeroPolicyDocument';
import InteractiveScrollDocument from '../components/InteractiveScrollDocument';
import ProductWorkflowIllustration from '../components/ProductWorkflowIllustration';
import LoginModal from '../components/LoginModal';
import ContactModal from '../components/ContactModal';

/**
 * Public Marketing Landing Page (Route: /)
 * Lavender Editorial Art Direction · Interactive Scrolling Policy Document
 *
 * Characteristics:
 * - Soft blue-grey & lavender atmosphere
 * - Warm ivory (#F8F7F4) and pure white surfaces
 * - Restrained deep-plum (#302943) & accent violet (#7965C7) typography
 * - Signature 5-chapter interactive scroll policy document (#process)
 * - Honest demo representations with zero fabricated claims
 * - Direct workspace-entry login flow into /overview
 */
export function LandingPageView() {
  // Interactive Walkthrough Demo State
  const [demoState, setDemoState] = useState('baseline'); // 'baseline' | 'uploaded' | 'verified'

  // Workspace Access / Login Dialog State
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Issue Reporting / Contact Us Dialog State
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const contactTriggerRef = React.useRef(null);

  const handleOpenLogin = () => {
    setIsModalOpen(true);
  };

  const handleCloseLogin = () => {
    setIsModalOpen(false);
  };

  const handleOpenContact = () => {
    setIsContactModalOpen(true);
  };

  const handleCloseContact = () => {
    setIsContactModalOpen(false);
  };

  return (
    <div className="landing-page-root" role="region" aria-label="FORMLESS Public Landing Page">
      {/* 1. Dedicated Public Navigation Header */}
      <LandingNav
        onOpenLogin={handleOpenLogin}
        onOpenContact={handleOpenContact}
        contactButtonRef={contactTriggerRef}
      />

      {/* 2. Hero Section: Asymmetric 2-Column Editorial Composition */}
      <section id="home" className="landing-hero-section" aria-label="Hero Section">
        <div className="hero-atmosphere-blob-1" aria-hidden="true" />
        <div className="hero-atmosphere-blob-2" aria-hidden="true" />

        <div className="landing-container-inner hero-grid-layout">
          {/* Left Column: Authoritative Editorial Typography & CTAs */}
          <motion.div
            className="hero-text-col"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="hero-eyebrow" aria-label="Editorial signature">
              <span className="eyebrow-text">FORMLESS / INSTITUTIONAL WORKFLOWS</span>
            </div>

            <h1 className="hero-headline">
              Turn complex requirements{' '}
              <br className="hero-headline-break" />
              <span className="headline-accent">into clear next steps.</span>
            </h1>

            <p className="hero-subline">
              FORMLESS transforms complex policies into structured requirements,
              connects evidence to those requirements, and shows exactly what is
              blocking readiness.
            </p>

            <div className="hero-cta-row">
              <button
                type="button"
                onClick={handleOpenLogin}
                className="hero-primary-btn"
                id="hero-open-workspace"
                aria-label="Open the workspace"
              >
                <span>Open the workspace</span>
                <ArrowRight size={16} className="btn-arrow-icon" aria-hidden="true" />
              </button>

              <a
                href="#process"
                className="hero-secondary-btn"
                id="hero-explore-process"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('process')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <span>Explore the process</span>
                <span className="scroll-indicator" aria-hidden="true">↓</span>
              </a>
            </div>

            {/* Truthful Trust Strip */}
            <div className="hero-trust-strip" aria-label="Core Principles">
              <div className="trust-item">
                <ShieldCheck size={14} className="trust-icon" aria-hidden="true" />
                <span>Deterministic Rules Engine</span>
              </div>
              <div className="trust-separator" aria-hidden="true">•</div>
              <div className="trust-item">
                <FileText size={14} className="trust-icon" aria-hidden="true" />
                <span>Statutory Section Citations</span>
              </div>
              <div className="trust-separator" aria-hidden="true">•</div>
              <div className="trust-item">
                <GitBranch size={14} className="trust-icon" aria-hidden="true" />
                <span>Stage-Gate Blocker Isolation</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Hero Document Visual Centerpiece */}
          <motion.div
            className="hero-visual-col"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <HeroPolicyDocument />
          </motion.div>
        </div>
      </section>

      {/* 3. SIGNATURE EXPERIENCE: 5-CHAPTER INTERACTIVE SCROLLING POLICY DOCUMENT */}
      <InteractiveScrollDocument />

      {/* 4. Narrative Section 1: The Problem (Visual Contrast) */}
      <section id="problem" className="landing-narrative-section problem-section" aria-label="The Problem">
        <div className="landing-container-inner">
          <div className="problem-split-grid">
            <div className="problem-statement-col">
              <span className="section-kicker">THE COMPLIANCE PARADOX</span>
              <h2 className="section-title">
                Understanding a policy is not the same as knowing whether you are ready.
              </h2>
              <p className="section-paragraph">
                Institutions publish 40-page PDFs filled with statutory clauses, hidden prerequisite
                rules, and cross-referenced annexures. Applicants submit folders of documents hoping
                everything qualifies — only to be disqualified at the final gate.
              </p>
            </div>

            <div className="problem-contrast-col">
              <div className="contrast-card card-traditional">
                <div className="contrast-card-header">
                  <span className="card-tag tag-negative">Traditional Compliance</span>
                </div>
                <h3 className="contrast-title">Vague Checklists & Late Surprises</h3>
                <ul className="contrast-list">
                  <li>Dense, non-machine-readable PDF circulars</li>
                  <li>Blockers discovered after stage deadlines pass</li>
                  <li>Back-and-forth emails over missing file formats</li>
                  <li>Subjective reviewer interpretations without rule audit</li>
                </ul>
              </div>

              <div className="contrast-card card-formless">
                <div className="contrast-card-header">
                  <span className="card-tag tag-positive">The FORMLESS Engine</span>
                </div>
                <h3 className="contrast-title">Instant, Explainable Readiness</h3>
                <ul className="contrast-list">
                  <li>Atomic criteria extracted with statutory section citations</li>
                  <li>Stage gates explicitly blocked until evidence is certified</li>
                  <li>Cryptographically verifiable evidence attachments</li>
                  <li>Deterministic evaluation with zero AI hallucinations</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Narrative Section 2: What FORMLESS Does (The 5 Core Stages) */}
      <section id="workflow" className="landing-narrative-section workflow-section" aria-label="How It Works">
        <div className="landing-container-inner">
          <div className="section-header-centered">
            <span className="section-kicker">THE 5-STEP TRANSFORMATION PIPELINE</span>
            <h2 className="section-title">From raw statutory document to stage clearance</h2>
            <p className="section-subtitle">
              Every policy directive is systematically ingested, structured, linked, evaluated, and certified.
            </p>
          </div>

          <div className="workflow-steps-grid">
            {/* Step 1 */}
            <div className="workflow-step-card">
              <div className="step-number-tag">01</div>
              <h3 className="step-title">Ingest Policy</h3>
              <p className="step-description">
                Upload institutional circulars. Gemini 3.8 Flash decomposes raw legal text into
                atomic requirements while preserving verbatim statutory citations.
              </p>
              <div className="step-mini-badge badge-lavender">
                <FileText size={12} aria-hidden="true" />
                <span>Statutory Ingestion</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="workflow-step-card">
              <div className="step-number-tag">02</div>
              <h3 className="step-title">Extract Requirements</h3>
              <p className="step-description">
                Isolate individual criteria codes (e.g. FSSAI-REQ-07), assign categories,
                and define explicit evaluation rules with stage-gate associations.
              </p>
              <div className="step-mini-badge badge-violet">
                <Sparkles size={12} aria-hidden="true" />
                <span>Atomic Criteria Binding</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="workflow-step-card">
              <div className="step-number-tag">03</div>
              <h3 className="step-title">Link Evidence</h3>
              <p className="step-description">
                Attach applicant documents directly to designated criteria. File integrity is
                stored with secure SHA-256 cryptographic hashing.
              </p>
              <div className="step-mini-badge badge-periwinkle">
                <GitBranch size={12} aria-hidden="true" />
                <span>SHA-256 Verified Links</span>
              </div>
            </div>

            {/* Step 4 */}
            <div className="workflow-step-card">
              <div className="step-number-tag">04</div>
              <h3 className="step-title">Evaluate Rules</h3>
              <p className="step-description">
                Execute automated condition checks and reviewer signoffs. Every transition is
                permanently recorded in an immutable chronological audit trail.
              </p>
              <div className="step-mini-badge badge-amber">
                <CheckCircle2 size={12} aria-hidden="true" />
                <span>Deterministic Checkpoints</span>
              </div>
            </div>

            {/* Step 5 */}
            <div className="workflow-step-card">
              <div className="step-number-tag">05</div>
              <h3 className="step-title">Calculate Stage Readiness</h3>
              <p className="step-description">
                Calculate readiness across institutional gates: Application Submission,
                Verification, and Joining. Isolate exact blockers preventing certification.
              </p>
              <div className="step-mini-badge badge-emerald">
                <ShieldCheck size={12} aria-hidden="true" />
                <span>Stage Gate Certification</span>
              </div>
            </div>
          </div>

          {/* Signature Lifecycle Pipeline Schematic */}
          <div className="workflow-illustration-embed">
            <div className="embed-header">
              <span className="embed-kicker">INTERACTIVE LIFECYCLE SCHEMATIC</span>
              <h3 className="embed-title">Interactive Stage-Gate Transformation Pipeline</h3>
              <p className="embed-sub">
                Explore how policy directives decompose into machine-verifiable criteria, link applicant evidence, and evaluate gate readiness.
              </p>
            </div>
            <ProductWorkflowIllustration />
          </div>
        </div>
      </section>

      {/* 6. Narrative Section 3: Traceability & Engineering Advantages / Security */}
      <section
        id="security"
        className="landing-narrative-section advantages-section security-section"
        aria-label="Security and Engineering Advantages"
      >
        <span id="advantages" aria-hidden="true" style={{ display: 'none' }} />
        <div className="landing-container-inner">
          <div className="section-header-left">
            <span className="section-kicker">ENGINEERING TRACEABILITY & SECURITY</span>
            <h2 className="section-title">Built for institutional certainty</h2>
            <p className="section-subtitle">
              Designed from first principles to eliminate compliance ambiguity.
            </p>
          </div>

          <div className="advantages-layout-grid">
            {/* Advantage 1 */}
            <div className="advantage-feature-card">
              <div className="advantage-icon-box">
                <FileText size={20} className="icon-violet" aria-hidden="true" />
              </div>
              <h3 className="advantage-title">Statutory Traceability</h3>
              <p className="advantage-desc">
                Every requirement carries the verbatim citation, section number, and exact text from
                the originating policy. Reviewers and applicants never wonder where a rule came from.
              </p>
              <div className="advantage-quote-box">
                <code>"College NOC is mandatory under Section 4.2 before student joining date."</code>
              </div>
            </div>

            {/* Advantage 2 */}
            <div className="advantage-feature-card">
              <div className="advantage-icon-box">
                <AlertCircle size={20} className="icon-rose" aria-hidden="true" />
              </div>
              <h3 className="advantage-title">Actionable Blocker Isolation</h3>
              <p className="advantage-desc">
                Instead of a vague percentage score, FORMLESS tells you precisely which criteria
                block the active stage gate, why they block it, and the single action needed to resolve them.
              </p>
              <div className="advantage-pill-row">
                <span className="blocker-mini-pill">✕ FSSAI-REQ-07: Blocks Joining</span>
                <span className="action-mini-pill">Upload NOC to unlock</span>
              </div>
            </div>

            {/* Advantage 3 */}
            <div className="advantage-feature-card">
              <div className="advantage-icon-box">
                <Clock size={20} className="icon-blue" aria-hidden="true" />
              </div>
              <h3 className="advantage-title">Immutable Audit Trail</h3>
              <p className="advantage-desc">
                Track full state lifecycles from <code>MISSING</code> to <code>IN_PROGRESS</code>,
                <code>EVIDENCE_RECEIVED</code>, and <code>VERIFIED</code>. Timestamps, actors, and
                rejection reasons are fully traceable.
              </p>
              <div className="advantage-event-box">
                <span className="event-line">2026-10-08 10:15 UTC · Verified by Reviewer Confirmation</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Narrative Section 4: Interactive Architecture Walkthrough */}
      <section id="preview" className="landing-narrative-section preview-section" aria-label="Interactive Walkthrough">
        <div className="landing-container-inner">
          <div className="section-header-centered">
            <span className="section-kicker">PRODUCT WALKTHROUGH</span>
            <h2 className="section-title">Experience the compliance transformation</h2>
            <p className="section-subtitle">
              Simulate how resolving a single blocker unlocks stage-gate readiness in real time.
            </p>
          </div>

          <div className="interactive-demo-widget">
            {/* Demo Toolbar */}
            <div className="demo-widget-nav">
              <button
                type="button"
                className={`demo-tab-btn ${demoState === 'baseline' ? 'active' : ''}`}
                onClick={() => setDemoState('baseline')}
              >
                1. Initial State (2 Blockers)
              </button>
              <button
                type="button"
                className={`demo-tab-btn ${demoState === 'uploaded' ? 'active' : ''}`}
                onClick={() => setDemoState('uploaded')}
              >
                2. NOC Uploaded (In Review)
              </button>
              <button
                type="button"
                className={`demo-tab-btn ${demoState === 'verified' ? 'active' : ''}`}
                onClick={() => setDemoState('verified')}
              >
                3. Verified (1 Blocker Remaining)
              </button>
            </div>

            {/* Demo Display Screen */}
            <div className="demo-screen-panel">
              <div className="demo-screen-header">
                <div className="demo-gate-label">
                  <span className="gate-kicker">TARGET STAGE GATE</span>
                  <span className="gate-title">Joining Gate Certification</span>
                </div>
                <div className="demo-status-pill">
                  {demoState === 'verified' ? (
                    <span className="status-badge-progressing">1 Blocker Remaining</span>
                  ) : demoState === 'uploaded' ? (
                    <span className="status-badge-review">Verification Pending</span>
                  ) : (
                    <span className="status-badge-blocked">Blocked by 2 Requirements</span>
                  )}
                </div>
              </div>

              {/* Requirement Card Simulation */}
              <motion.div
                key={demoState}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
                className="demo-req-row"
              >
                <div className="demo-req-item">
                  <div className="demo-req-left">
                    <span className="demo-req-code">FSSAI-REQ-07</span>
                    <span className="demo-req-name">College No Objection Certificate (NOC)</span>
                  </div>
                  <div className="demo-req-right">
                    {demoState === 'verified' ? (
                      <span className="pill-state state-verified">✓ Verified</span>
                    ) : demoState === 'uploaded' ? (
                      <span className="pill-state state-review">⌛ Evidence Received</span>
                    ) : (
                      <span className="pill-state state-missing">✕ Missing (Blocks Gate)</span>
                    )}
                  </div>
                </div>

                <div className="demo-req-item">
                  <div className="demo-req-left">
                    <span className="demo-req-code">FSSAI-REQ-08</span>
                    <span className="demo-req-name">Character & Conduct Certificate</span>
                  </div>
                  <div className="demo-req-right">
                    <span className="pill-state state-missing">✕ Missing (Blocks Gate)</span>
                  </div>
                </div>

                <div className="demo-req-item">
                  <div className="demo-req-left">
                    <span className="demo-req-code">FSSAI-REQ-01</span>
                    <span className="demo-req-name">Graduate Degree Marksheet</span>
                  </div>
                  <div className="demo-req-right">
                    <span className="pill-state state-verified">✓ Verified</span>
                  </div>
                </div>
              </motion.div>

              {/* Explanatory banner */}
              <div className="demo-screen-footer">
                <p className="demo-explanation">
                  {demoState === 'baseline' &&
                    'Both College NOC and Character Certificate are missing. The Joining Gate is completely blocked.'}
                  {demoState === 'uploaded' &&
                    'Applicant uploaded college_noc.pdf. The requirement transitions to Evidence Received and enters review.'}
                  {demoState === 'verified' &&
                    'College NOC is verified by human reviewer. Active blockers reduce from 2 to 1 (Character Certificate remaining).'}
                </p>
                <button
                  type="button"
                  onClick={handleOpenLogin}
                  className="demo-test-link"
                  id="preview-open-workspace"
                  aria-label="Explore full 8-criteria scenario in workspace"
                >
                  <span>Explore full 8-criteria scenario in workspace</span>
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Bottom High-Impact CTA */}
      <section className="landing-bottom-cta" aria-label="Get Started">
        <div className="landing-container-inner">
          <div className="cta-banner-card">
            <span className="cta-eyebrow">INSTITUTIONAL GATE ENGINE</span>
            <h2 className="cta-headline">
              Ready to verify compliance
              <br />
              with complete certainty?
            </h2>
            <p className="cta-subline">
              Access the interactive compliance matrix, explore the dependency graph,
              and resolve active gate blockers.
            </p>

            <div className="cta-btn-wrap">
              <button
                type="button"
                onClick={handleOpenLogin}
                className="cta-large-btn"
                id="cta-open-workspace"
                aria-label="Enter FORMLESS Workspace"
              >
                <span>Enter FORMLESS Workspace</span>
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Public Footer */}
      <footer className="public-landing-footer" role="contentinfo">
        <div className="landing-container-inner footer-grid">
          <div className="footer-col-brand">
            <div className="footer-brand-title">FORMLESS</div>
            <p className="footer-brand-desc">
              Institutional Compliance Intelligence & Stage-Gate Verification Engine.
            </p>
            <span className="footer-version-tag">Version 1.0.0 · Canonical Demo Engine</span>
          </div>

          <div className="footer-col-nav">
            <span className="footer-col-heading">WORKSPACE ROUTES</span>
            <Link to="/overview" className="footer-link">Overview</Link>
            <Link to="/requirements" className="footer-link">Requirements Matrix</Link>
            <Link to="/readiness" className="footer-link">Readiness Map</Link>
            <Link to="/action-plan" className="footer-link">Action Plan</Link>
            <button
              type="button"
              onClick={handleOpenContact}
              className="footer-link footer-contact-btn"
              id="footer-contact-trigger"
            >
              Report an Issue / Contact Us
            </button>
          </div>

          <div className="footer-col-nav">
            <span className="footer-col-heading">METHODOLOGY</span>
            <span className="footer-static-item">Deterministic Rule Engine</span>
            <span className="footer-static-item">Statutory Section Citations</span>
            <span className="footer-static-item">Gemini 3.8 Flash Ingestion</span>
            <span className="footer-static-item">SHA-256 Evidence Tracking</span>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <div className="landing-container-inner footer-bar-inner">
            <span>© 2026 FORMLESS Institutional Gate Engine. All rights reserved.</span>
            <span>Single Source of Truth: Active Backend Contract</span>
          </div>
        </div>
      </footer>

      {/* 10. Lavender Editorial Workspace Access / Login Dialog */}
      <LoginModal
        isOpen={isModalOpen}
        onClose={handleCloseLogin}
        destination="/overview"
      />

      {/* 11. Institutional Issue Reporting / Contact Us Dialog */}
      <ContactModal
        isOpen={isContactModalOpen}
        onClose={handleCloseContact}
        triggerRef={contactTriggerRef}
      />
    </div>
  );
}

export default LandingPageView;

