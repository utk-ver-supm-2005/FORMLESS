import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useReducedMotion } from 'motion/react';
import {
  FileText,
  ShieldAlert,
  FileCheck,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';

/**
 * InteractiveScrollDocument
 *
 * SIGNATURE SCROLL-DRIVEN POLICY DOCUMENT EXPERIENCE
 *
 * The defining visual and interactive anchor of FORMLESS:
 * - Commands desktop attention, occupying the primary visual field.
 * - Multi-layered ivory paper sheets with subtle depth and marginal annotations.
 * - 5 Seamless Scroll Chapters:
 *   1. The Policy (Masthead, Section 4.0, authentic document layout, ambient lavender atmosphere)
 *   2. Find the Clause (§ 4.2 focal point, subtle document zoom, illuminated highlight trace, margin citation)
 *   3. Extract the Requirement (Clause separates, dimensional requirement object emerges, connecting bezier line)
 *   4. Connect the Evidence (Evidence attachment emerges, connected via SVG path, SHA-256 integrity tag)
 *   5. Reveal Readiness (Deterministic verification stage, stage-gate object appears, blocker isolation)
 *
 * Features:
 * - Natural bidirectional scroll tracking via motion/react useScroll
 * - Accessible Chapter Scrubber controls allowing direct one-click navigation
 * - Responsive layout adapted for mobile/tablet without side-scrolling or trapped views
 * - Respects prefers-reduced-motion
 * - Truthfully identified as an illustrative demo model
 */

const CHAPTERS = [
  { id: 1, title: 'The Policy', subtitle: 'Statutory Document Ingestion' },
  { id: 2, title: 'Find the Clause', subtitle: 'Target Section § 4.2' },
  { id: 3, title: 'Extract Requirement', subtitle: 'Atomic Criteria Isolation' },
  { id: 4, title: 'Connect Evidence', subtitle: 'Applicant Attachment & Hash' },
  { id: 5, title: 'Reveal Readiness', subtitle: 'Stage Gate Clearance Model' },
];

export function InteractiveScrollDocument() {
  const containerRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();
  const [activeChapter, setActiveChapter] = useState(1);
  const [manualOverride, setManualOverride] = useState(false);

  // Motion scroll progress across the 400vh long container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Map scroll progress to active chapter unless user manually clicked scrubber
  useEffect(() => {
    if (manualOverride) return;

    const unsubscribe = scrollYProgress.on('change', (latest) => {
      let chap = 1;
      if (latest < 0.2) chap = 1;
      else if (latest < 0.42) chap = 2;
      else if (latest < 0.64) chap = 3;
      else if (latest < 0.84) chap = 4;
      else chap = 5;

      setActiveChapter(chap);
    });

    return () => unsubscribe();
  }, [scrollYProgress, manualOverride]);

  // Jump to a specific chapter smoothly
  const handleSelectChapter = (chapId) => {
    setActiveChapter(chapId);
    setManualOverride(true);

    if (containerRef.current) {
      const containerTop = containerRef.current.offsetTop;
      const totalScrollable = containerRef.current.offsetHeight - window.innerHeight;
      const targetRatio = (chapId - 1) / (CHAPTERS.length - 1);
      const targetScroll = containerTop + totalScrollable * targetRatio;

      window.scrollTo({
        top: targetScroll,
        behavior: 'smooth',
      });

      // Clear override after scroll settles
      setTimeout(() => setManualOverride(false), 900);
    }
  };

  // State-derived visual configurations
  const isZoomed = activeChapter >= 2;
  const showRequirement = activeChapter >= 3;
  const showEvidence = activeChapter >= 4;
  const showGate = activeChapter >= 5;

  return (
    <section
      ref={containerRef}
      id="process"
      className="interactive-scroll-container"
      aria-label="Interactive Policy Document Scroll Experience"
    >
      {/* Sticky Full-Viewport Stage */}
      <div className="scroll-sticky-stage">
        {/* Ambient Atmospheric Lighting */}
        <div className="scroll-ambient-glow" aria-hidden="true" />

        {/* Top Control Bar: Chapter Scrubber & Stage Indicator */}
        <div className="scroll-stage-header">
          <div className="stage-meta-strip">
            <span className="stage-eyebrow">SIGNATURE INTERACTIVE EXPERIENCE</span>
            <span className="stage-truth-tag">Illustrative Policy Transformation Demo</span>
          </div>

          {/* Interactive Chapter Scrubber Nav */}
          <nav className="chapter-scrubber" aria-label="Experience Chapter Navigation">
            {CHAPTERS.map((chap) => {
              const isActive = activeChapter === chap.id;
              const isPassed = activeChapter > chap.id;

              return (
                <button
                  key={chap.id}
                  type="button"
                  className={`scrubber-step-btn ${isActive ? 'active' : ''} ${isPassed ? 'passed' : ''}`}
                  onClick={() => handleSelectChapter(chap.id)}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <span className="step-num">0{chap.id}</span>
                  <span className="step-label">{chap.title}</span>
                  <span className="step-indicator" />
                </button>
              );
            })}
          </nav>
        </div>

        {/* Central Visual Field: The Large Policy Document & Connected Satellites */}
        <div className="scroll-stage-body">
          <div className="stage-composition-grid">
            {/* The Signature Policy Document Surface (Primary Visual Centerpiece) */}
            <motion.div
              className={`editorial-policy-sheet ${isZoomed ? 'sheet-focused' : ''}`}
              animate={
                shouldReduceMotion
                  ? {}
                  : {
                      scale: activeChapter === 1 ? 1 : activeChapter === 2 ? 1.05 : 0.94,
                      x: activeChapter <= 2 ? 0 : -80,
                      rotateY: activeChapter <= 2 ? 0 : -2,
                    }
              }
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Layered Paper Sheets Underneath for Physical Dimension */}
              <div className="paper-layer-underlay underlay-2" aria-hidden="true" />
              <div className="paper-layer-underlay underlay-1" aria-hidden="true" />

              {/* Main Ivory Paper Surface */}
              <div className="paper-content-wrapper">
                {/* Document Header & Institutional Masthead */}
                <header className="doc-masthead">
                  <div className="doc-masthead-top">
                    <div className="doc-seal">
                      <FileText size={18} className="seal-icon" aria-hidden="true" />
                      <span className="seal-text">INSTITUTIONAL DIRECTIVE</span>
                    </div>
                    <span className="doc-ref-id">FSSAI / DIR / 2026 / 042-A</span>
                  </div>

                  <h3 className="doc-official-title">
                    STATUTORY CRITERIA FOR APPLICANT VERIFICATION & STAGE CLEARANCE
                  </h3>

                  <div className="doc-meta-row">
                    <span>Effective: Academic Session 2026–27</span>
                    <span>•</span>
                    <span>Directorate of Human Resources</span>
                    <span>•</span>
                    <span>Page 14 of 42</span>
                  </div>
                </header>

                <div className="doc-divider-line" />

                {/* Section 4.0 Introductory Context */}
                <div className={`doc-clause-block ${isZoomed ? 'clause-receded' : ''}`}>
                  <div className="clause-header">
                    <span className="clause-num">§ 4.1</span>
                    <h4 className="clause-heading">Attestation of Degree Marksheet</h4>
                  </div>
                  <p className="clause-body">
                    All candidates must furnish original semester-wise transcripts certified by the
                    Registrar or authorized Controller of Examinations. Digital credentials bearing
                    authorized digital signatures satisfy verification directly.
                  </p>
                </div>

                {/* Section 4.2 — THE HERO CLAUSE */}
                <div
                  className={`doc-clause-block hero-clause ${
                    activeChapter >= 2 ? 'clause-highlighted' : ''
                  }`}
                >
                  <div className="clause-header">
                    <div className="clause-tag-wrap">
                      <span className="clause-num-hero">§ 4.2</span>
                      <span className="clause-statutory-pill">MANDATORY PRE-JOINING CLAUSE</span>
                    </div>
                    <h4 className="clause-heading-hero">
                      College No Objection Certificate (NOC)
                    </h4>
                  </div>

                  <p className="clause-body-hero">
                    <mark className="clause-text-highlight">
                      "Candidates currently enrolled or awaiting final graduation must submit an official
                      No Objection Certificate (NOC) signed by the Head of Institution, explicitly granting
                      clearance for immediate full-time onboarding. Failure to furnish this document prior
                      to the designated Joining Gate shall automatically result in provisional disqualification."
                    </mark>
                  </p>

                  {/* Marginal Citation Tag */}
                  <motion.div
                    className="clause-margin-annotation"
                    animate={{ opacity: activeChapter >= 2 ? 1 : 0, y: activeChapter >= 2 ? 0 : 6 }}
                    transition={{ duration: 0.35 }}
                  >
                    <span className="annotation-line" />
                    <span className="annotation-label">
                      [Citation: FSSAI Circular 2026/A · Section 4.2 · Subsection C]
                    </span>
                  </motion.div>
                </div>

                {/* Section 4.3 Subsequent Policy Section */}
                <div className={`doc-clause-block ${isZoomed ? 'clause-receded' : ''}`}>
                  <div className="clause-header">
                    <span className="clause-num">§ 4.3</span>
                    <h4 className="clause-heading">Conduct & Character Verification</h4>
                  </div>
                  <p className="clause-body">
                    A formal testimonial of good character executed by a Gazetted Officer or Institute
                    Principal within the preceding six months remains required prior to final enrollment.
                  </p>
                </div>

                {/* Document Footer Edge */}
                <footer className="doc-footer-edge">
                  <span>CONFIDENTIAL & STATUTORY · FORMLESS COMPLIANCE PARSER EXTRACT</span>
                  <span>SECTION ID: 042-JOINING-PRE</span>
                </footer>
              </div>
            </motion.div>

            {/* Emerging Satellites Container: Requirement, Evidence, & Stage Gate */}
            <div className="stage-satellites-column">
              {/* SVG Connecting Paths */}
              <svg className="stage-connector-canvas" aria-hidden="true">
                {showRequirement && (
                  <motion.path
                    d="M 10 140 C 90 140, 110 90, 190 90"
                    fill="none"
                    stroke="#7965C7"
                    strokeWidth="2.5"
                    strokeDasharray="5,5"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.6 }}
                  />
                )}
                {showEvidence && (
                  <motion.path
                    d="M 280 170 C 280 230, 280 240, 280 270"
                    fill="none"
                    stroke="#92B6E1"
                    strokeWidth="2"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5 }}
                  />
                )}
                {showGate && (
                  <motion.path
                    d="M 280 370 C 280 410, 280 430, 280 460"
                    fill="none"
                    stroke="#D97706"
                    strokeWidth="2"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5 }}
                  />
                )}
              </svg>

              {/* Early Guide Card when Satellites have not yet emerged (Chapters 1 & 2) */}
              {!showRequirement && (
                <motion.div
                  className="satellite-guide-card"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="guide-card-icon">
                    <Sparkles size={16} aria-hidden="true" />
                  </div>
                  <h5 className="guide-card-title">Interactive Transformation Stage</h5>
                  <p className="guide-card-text">
                    Scroll downward or click chapters above to observe Section 4.2 extract into an atomic criteria object, link verified applicant evidence, and evaluate stage gate readiness.
                  </p>
                  <div className="guide-steps-mini">
                    <span className="guide-step-tag">Chapter 0{activeChapter} of 05</span>
                    <span className="guide-scroll-hint">Scroll ↓ to extract</span>
                  </div>
                </motion.div>
              )}

              {/* Satellite 1: Requirement Object (Chapter 3+) */}
              {showRequirement && (
                <motion.div
                  className="satellite-card requirement-satellite"
                  initial={{ opacity: 0, x: 40, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ duration: 0.45 }}
                >
                  <div className="card-top-bar">
                    <span className="card-kicker-tag kicker-violet">
                      <Sparkles size={11} aria-hidden="true" />
                      <span>ATOMIC REQUIREMENT</span>
                    </span>
                    <span className="badge-missing">✕ MISSING</span>
                  </div>

                  <div className="card-title-group">
                    <span className="req-code-label">FSSAI-REQ-07</span>
                    <h5 className="req-name-text">College No Objection Certificate (NOC)</h5>
                  </div>

                  <p className="card-sub-desc">
                    Extracted from Section 4.2. Classified as prerequisite blocking the Joining Stage Gate.
                  </p>

                  <div className="card-metadata-row">
                    <span className="meta-item">Category: Educational</span>
                    <span className="meta-bullet">•</span>
                    <span className="meta-item">Prerequisite: Mandatory</span>
                  </div>
                </motion.div>
              )}

              {/* Satellite 2: Evidence Attachment Object (Chapter 4+) */}
              {showEvidence && (
                <motion.div
                  className="satellite-card evidence-satellite"
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.45 }}
                >
                  <div className="card-top-bar">
                    <span className="card-kicker-tag kicker-periwinkle">
                      <FileCheck size={11} aria-hidden="true" />
                      <span>EVIDENCE ATTACHMENT</span>
                    </span>
                    <span className="badge-received">⌛ RECEIVED</span>
                  </div>

                  <div className="evidence-file-row">
                    <div className="file-avatar">
                      <FileText size={18} aria-hidden="true" />
                    </div>
                    <div className="file-info-group">
                      <span className="file-name">college_noc_provisional.pdf</span>
                      <span className="file-size-hash">1.2 MB · SHA-256: 4a9f...e102</span>
                    </div>
                  </div>

                  <div className="evidence-audit-note">
                    <Clock size={12} aria-hidden="true" />
                    <span>Uploaded by applicant · Awaiting reviewer confirmation</span>
                  </div>
                </motion.div>
              )}

              {/* Satellite 3: Deterministic Stage Gate Object (Chapter 5) */}
              {showGate && (
                <motion.div
                  className="satellite-card gate-satellite"
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.45 }}
                >
                  <div className="card-top-bar">
                    <span className="card-kicker-tag kicker-amber">
                      <ShieldAlert size={11} aria-hidden="true" />
                      <span>STAGE GATE EVALUATION</span>
                    </span>
                    <span className="badge-blocked">NOT READY</span>
                  </div>

                  <div className="gate-title-group">
                    <span className="gate-target-label">Stage 3 Gate</span>
                    <h5 className="gate-name-text">Joining Gate Certification</h5>
                  </div>

                  <p className="card-sub-desc">
                    Stage clearance is deterministically held. Blocked until FSSAI-REQ-07 evidence is verified.
                  </p>

                  <div className="gate-resolution-row">
                    <CheckCircle2 size={13} className="text-emerald" aria-hidden="true" />
                    <span>Resolution: Confirm applicant NOC to unlock clearance</span>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Explanatory Narrative Strip */}
        <div className="scroll-stage-footer">
          <div className="narrative-progress-summary">
            <span className="summary-step-tag">CHAPTER 0{activeChapter} OF 05</span>
            <div className="summary-content">
              {activeChapter === 1 && (
                <p>
                  <strong>The Policy:</strong> FORMLESS reads dense, unstructured PDFs and maps their
                  statutory architecture without manual transcription.
                </p>
              )}
              {activeChapter === 2 && (
                <p>
                  <strong>Find the Clause:</strong> Section 4.2 isolates the mandatory College NOC
                  prerequisite, binding the verbatim citation directly to the clause.
                </p>
              )}
              {activeChapter === 3 && (
                <p>
                  <strong>Extract Requirement:</strong> The clause becomes an atomic requirement
                  (FSSAI-REQ-07) with strict verification rules and gate blocking logic.
                </p>
              )}
              {activeChapter === 4 && (
                <p>
                  <strong>Connect Evidence:</strong> The applicant's uploaded PDF is linked with
                  cryptographic SHA-256 integrity, moving status to Evidence Received.
                </p>
              )}
              {activeChapter === 5 && (
                <p>
                  <strong>Deterministic Readiness:</strong> Stage Gate calculation isolates the exact
                  blocker. Readiness is a mathematical evaluation, not an AI hallucination.
                </p>
              )}
            </div>
            <div className="summary-sequence-chain">
              <span className={activeChapter >= 1 ? 'chain-active' : ''}>POLICY</span>
              <span className="chain-arrow">→</span>
              <span className={activeChapter >= 3 ? 'chain-active' : ''}>REQUIREMENT</span>
              <span className="chain-arrow">→</span>
              <span className={activeChapter >= 4 ? 'chain-active' : ''}>EVIDENCE</span>
              <span className="chain-arrow">→</span>
              <span className={activeChapter >= 5 ? 'chain-active' : ''}>STAGE GATE</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default InteractiveScrollDocument;
