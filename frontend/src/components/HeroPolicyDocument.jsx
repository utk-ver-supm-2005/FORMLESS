import React, { useState, useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import {
  ShieldAlert,
  Paperclip,
  AlertTriangle,
} from 'lucide-react';

/**
 * HeroPolicyDocument Component
 *
 * Cinematic Interactive Policy Document for the FORMLESS Landing Hero.
 *
 * Creative & Technical Direction:
 * - 3 authentic physical paper sheets with visible edges, realistic contact shadows,
 *   subtle offset rotations, and soft ambient depth (no blank protruding rectangles).
 * - Warm ivory document stock (#FAF9F6) with crisp, dark editorial typography.
 * - Convincing statutory circular anatomy: Official Ministry masthead, national emblem line art,
 *   circular reference, Gazette subject, § 4.1 context, § 4.2 highlighted clause, § 4.3 consequence,
 *   and official signatory footnote.
 * - Scroll-reactive visual sequence:
 *     A. Initial resting state: slightly angled (-1.6deg), layered composition.
 *     B. As visitor scrolls (0 -> 350px): foreground page subtly straightens to 0deg,
 *        scales gently to 1.02, while rear sheets shift with realistic parallax depth.
 *     C. Statutory clause § 4.2 receives a rich, soft lavender highlight and illuminated anchor node.
 *     D. Fine SVG connector path smoothly draws from the clause anchor to a compact requirement annotation.
 *     E. Evidence attachment appears (College_NOC_Signed.pdf · 1.4 MB), followed by a restrained
 *        readiness blocker indicator (GATE HOLD · 1 BLOCKER).
 *     F. Continues seamlessly into the existing #process section.
 * - Interactive hover/keyboard focus fallback for desktop visitors prior to scrolling.
 * - Respects prefers-reduced-motion and touch device constraints with zero horizontal overflow.
 */
export function HeroPolicyDocument() {
  const containerRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  // Scroll progress from 0 (at top of hero) to 1 (scrolled through hero towards #process)
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [activeInteractive, setActiveInteractive] = useState(null); // null | 'clause' | 'req' | 'evidence' | 'gate'

  // Scroll listener using requestAnimationFrame for 60fps performance
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY || window.pageYOffset || 0;
          // Normalise scroll over first 260px of page scroll
          const progress = Math.min(1, Math.max(0, currentY / 260));
          setScrollProgress(progress);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial measure
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Effective animation progress: driven by scroll or desktop hover / interactive click
  const isInteractiveActive = activeInteractive !== null;
  const effectiveProgress = shouldReduceMotion
    ? 1
    : isInteractiveActive
    ? Math.max(0.85, scrollProgress)
    : isHovered
    ? Math.max(0.65, scrollProgress)
    : scrollProgress;

  // Visual sequence states driven by scroll progress
  const isStraightened = effectiveProgress > 0.12;
  const isClauseHighlighted = effectiveProgress > 0.22 || isInteractiveActive;
  const isConnectorDrawn = effectiveProgress > 0.32 || isHovered || isInteractiveActive;
  const isReqVisible = effectiveProgress > 0.42 || isHovered || isInteractiveActive;
  const isEvidenceVisible = effectiveProgress > 0.62 || isHovered || isInteractiveActive;
  const isGateVisible = effectiveProgress > 0.78 || isHovered || isInteractiveActive;

  // Parallax transform calculations for realistic tactile sheets
  const frontRotation = shouldReduceMotion ? 0 : -1.6 + effectiveProgress * 1.6; // -1.6deg -> 0deg
  const frontScale = shouldReduceMotion ? 1 : 1 + effectiveProgress * 0.02; // 1.0 -> 1.02
  const midRotation = shouldReduceMotion ? 1.5 : 1.8 + effectiveProgress * 0.8; // 1.8deg -> 2.6deg
  const midOffsetY = shouldReduceMotion ? 0 : effectiveProgress * 10;
  const backRotation = shouldReduceMotion ? -2.5 : -2.8 - effectiveProgress * 0.8; // -2.8deg -> -3.6deg
  const backOffsetY = shouldReduceMotion ? 0 : effectiveProgress * -8;

  return (
    <div
      ref={containerRef}
      className="hero-policy-document-wrapper"
      role="region"
      aria-label="Cinematic Interactive Policy Document Preview"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setActiveInteractive(null);
      }}
    >
      {/* Ambient background illumination glow */}
      <div className="hero-paper-ambient-glow" aria-hidden="true" />

      {/* Dimensional 3D Paper Composition Stage */}
      <div className="hero-paper-stage">
        {/* ===================================================================
            LAYER 3: REAR PAPER SHEET (Official Gazette Notification Backing)
            Realistic physical paper sheet with authentic watermark and text,
            completely eliminating the awkward blank protruding rectangle!
            =================================================================== */}
        <div
          className="hero-paper-sheet sheet-back"
          style={{
            transform: `translate3d(0, ${backOffsetY}px, 0) rotate(${backRotation}deg)`,
            transition: shouldReduceMotion ? 'none' : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          aria-hidden="true"
        >
          {/* Paper Edge Detail & Top Header */}
          <div className="sheet-back-header">
            <span className="sheet-back-country">THE GAZETTE OF INDIA : EXTRAORDINARY</span>
            <span className="sheet-back-folio">PART II — SEC. 3(i)</span>
          </div>

          {/* Authentic Faint Circular Content */}
          <div className="sheet-back-body">
            <div className="sheet-back-title">
              MINISTRY OF HEALTH AND FAMILY WELFARE • STATUTORY NOTIFICATION
            </div>
            <div className="sheet-back-clauses">
              <div className="sheet-faint-line w-95" />
              <div className="sheet-faint-line w-85" />
              <div className="sheet-faint-line w-90" />
              <div className="sheet-faint-line w-70" />
            </div>

            {/* Faint Official Seal Watermark */}
            <div className="sheet-watermark-seal">
              <svg width="68" height="68" viewBox="0 0 100 100" fill="none">
                <circle cx="50" cy="50" r="46" stroke="rgba(121, 101, 199, 0.16)" strokeWidth="1.5" strokeDasharray="3 3" />
                <circle cx="50" cy="50" r="38" stroke="rgba(121, 101, 199, 0.12)" strokeWidth="1" />
                <path d="M50 20 L50 80 M20 50 L80 50 M30 30 L70 70 M30 70 L70 30" stroke="rgba(121, 101, 199, 0.1)" strokeWidth="1" />
                <text x="50" y="53" textAnchor="middle" fontSize="8" fill="rgba(121, 101, 199, 0.25)" fontFamily="var(--font-mono)">
                  FSSAI GAZETTE
                </text>
              </svg>
            </div>

            <div className="sheet-back-clauses pt-2">
              <div className="sheet-faint-line w-80" />
              <div className="sheet-faint-line w-75" />
              <div className="sheet-faint-line w-60" />
            </div>

            <div className="sheet-back-footer">
              <span>[PAGE 13 OF 42]</span>
              <span>AUTHENTICATED STATUTORY COPY</span>
            </div>
          </div>
        </div>

        {/* ===================================================================
            LAYER 2: MIDDLE PAPER SHEET (Annexure Schedule of Criteria)
            Intermediate physical paper depth with authentic table structure
            =================================================================== */}
        <div
          className="hero-paper-sheet sheet-mid"
          style={{
            transform: `translate3d(0, ${midOffsetY}px, 0) rotate(${midRotation}deg)`,
            transition: shouldReduceMotion ? 'none' : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          aria-hidden="true"
        >
          <div className="sheet-mid-header">
            <span className="sheet-mid-badge">ANNEXURE B</span>
            <span className="sheet-mid-title">SCHEDULE OF INDUCTION PREREQUISITES & VERIFICATION PROTOCOL</span>
          </div>

          <div className="sheet-mid-grid">
            <div className="sheet-faint-row">
              <span className="col-code">§ 3.1</span>
              <div className="sheet-faint-line w-75" />
            </div>
            <div className="sheet-faint-row">
              <span className="col-code">§ 3.2</span>
              <div className="sheet-faint-line w-90" />
            </div>
            <div className="sheet-faint-row">
              <span className="col-code">§ 3.3</span>
              <div className="sheet-faint-line w-65" />
            </div>
            <div className="sheet-faint-row">
              <span className="col-code">§ 3.4</span>
              <div className="sheet-faint-line w-85" />
            </div>
          </div>

          <div className="sheet-mid-footer">
            <span>[PAGE 15 OF 42]</span>
            <span>SECTION 5 · ATTESTATION CLAUSES</span>
          </div>
        </div>

        {/* ===================================================================
            LAYER 1: FOREGROUND MAIN POLICY DOCUMENT (CRISP EDITORIAL CENTERPIECE)
            Warm ivory stock, authentic government masthead, crisp dark typography,
            and illuminated statutory clause § 4.2.
            =================================================================== */}
        <div
          className={`hero-paper-sheet sheet-front ${isStraightened ? 'is-straightened' : ''}`}
          style={{
            transform: `rotate(${frontRotation}deg) scale(${frontScale})`,
            transition: shouldReduceMotion ? 'none' : 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease',
          }}
        >
          {/* Official Government of India / FSSAI Masthead */}
          <header className="policy-doc-masthead">
            <div className="masthead-left">
              {/* National Authority Stylized Line Emblem */}
              <div className="masthead-emblem" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                  <path
                    d="M16 2L6 7V15C6 21.6 10.3 27.8 16 30C21.7 27.8 26 21.6 26 15V7L16 2Z"
                    stroke="#7965C7"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M16 8V24M11 14L16 8L21 14M12 20H20"
                    stroke="#7965C7"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <div className="masthead-titles">
                <h3 className="org-title-main">FOOD SAFETY AND STANDARDS AUTHORITY OF INDIA</h3>
                <p className="org-title-sub">Ministry of Health & Family Welfare · Government of India</p>
                <p className="org-address">FDA Bhawan, Kotla Road, New Delhi — 110002</p>
              </div>
            </div>

            <div className="masthead-meta">
              <div className="meta-pill">
                <span className="meta-label">REF:</span>
                <span className="meta-val">FSSAI-HQ-2026/REG-04</span>
              </div>
              <span className="meta-date">Dated: 12 January 2026</span>
              <span className="meta-page">PAGE 14 OF 42</span>
            </div>
          </header>

          <div className="doc-editorial-rule" aria-hidden="true">
            <div className="rule-line" />
            <div className="rule-diamond" />
            <div className="rule-line" />
          </div>

          {/* Official Circular Subject */}
          <div className="policy-doc-subject">
            <span className="subject-kicker">STATUTORY REGULATORY DIRECTIVE</span>
            <h4 className="subject-heading">
              Guidelines for Internship Scheme & Stage-Gate Candidate Verification (Session 2026–27)
            </h4>
          </div>

          {/* Background Clause § 4.1 (Verifiable Institutional Context) */}
          <div className="policy-doc-clause clause-neutral">
            <div className="clause-lead-line">
              <span className="clause-num">§ 4.1</span>
              <span className="clause-title">Provisional Selection & Induction Terms</span>
            </div>
            <p className="clause-body-text">
              Provisionally selected applicants must establish verified compliance with eligibility
              parameters specified under Section 16(5) of the Food Safety and Standards Act, 2006,
              prior to formal issuance of joining clearances.
            </p>
          </div>

          {/* ===============================================================
              KEYSTONE HIGHLIGHTED CLAUSE: § 4.2 COLLEGE NOC MANDATE
              The visual centerpiece with restrained lavender highlight and anchor node!
              =============================================================== */}
          <div
            className={`policy-doc-clause clause-highlighted ${
              isClauseHighlighted ? 'is-highlighted' : ''
            }`}
            id="hero-clause-4-2"
            tabIndex={0}
            role="button"
            aria-label="Statutory Clause § 4.2 College NOC Mandate. Click or focus to trace requirement."
            onClick={() => setActiveInteractive(activeInteractive === 'clause' ? null : 'clause')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setActiveInteractive(activeInteractive === 'clause' ? null : 'clause');
              }
            }}
          >
            <div className="clause-highlight-backdrop" aria-hidden="true" />

            <div className="clause-header-row">
              <div className="clause-tag">
                <span className="tag-symbol">§ 4.2</span>
                <span className="tag-label">INSTITUTIONAL ENDORSEMENT (COLLEGE NOC)</span>
              </div>
              <span className="clause-statutory-cite">Statutory Mandate</span>
            </div>

            <blockquote className="clause-statutory-quote">
              “A bonafide student endorsement or official No Objection Certificate (NOC) on institution
              letterhead, bearing the signature and seal of the Dean or Registrar, must be furnished
              prior to Stage Gate clearance.”
            </blockquote>

            <div className="clause-sub-meta">
              <span className="sub-meta-code">RULE: FSSAI-R-2026-NOC</span>
              <span className="sub-meta-impact">Impact: Stage 03 Joining Gate</span>
            </div>

            {/* Statutory Anchor Node for SVG Connector */}
            <div
              className={`clause-anchor-node ${isConnectorDrawn ? 'is-active' : ''}`}
              id="clause-anchor-point"
              aria-hidden="true"
            >
              <div className="node-pulse" />
              <div className="node-core" />
            </div>
          </div>

          {/* Subsequent Clause § 4.3 (Enforcement Consequence) */}
          <div className="policy-doc-clause clause-neutral">
            <div className="clause-lead-line">
              <span className="clause-num">§ 4.3</span>
              <span className="clause-title">Non-Compliance Remand Protocol</span>
            </div>
            <p className="clause-body-text">
              Failure to present verified institutional endorsement within forty-eight (48) hours of
              scheduled reporting triggers automatic stage disqualification at Gate Stage 03.
            </p>
          </div>

          {/* Official Signatory Footnote */}
          <footer className="policy-doc-footer">
            <div className="footer-signatory">
              <span className="signatory-auth">BY ORDER OF COMPETENT AUTHORITY</span>
              <span className="signatory-title">Director (HR & Institutional Governance)</span>
            </div>
            <div className="footer-authenticity">
              <span className="auth-hash">SHA-256: 4F9B...082C</span>
              <span className="auth-status">OFFICIAL POLICY DIGEST</span>
            </div>
          </footer>
        </div>

        {/* ===================================================================
            DYNAMIC SVG CONNECTOR LAYER
            Razor-sharp SVG bezier curve tracing from § 4.2 anchor node outward
            to requirement annotation and evidence attachment.
            =================================================================== */}
        <svg
          className="hero-svg-connectors"
          viewBox="0 0 540 540"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            {/* Elegant restrained lavender gradient for connector stroke */}
            <linearGradient id="heroLavenderCurve" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7965C7" stopOpacity="0.85" />
              <stop offset="60%" stopColor="#8B5CF6" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#A78BFA" stopOpacity="0.9" />
            </linearGradient>

            {/* Fine path glow filter */}
            <filter id="heroConnectorGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#7965C7" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Hairline Guide Path: Clause Anchor -> Requirement Chip */}
          <path
            d="M 470 270 C 495 270, 505 230, 515 200"
            stroke="rgba(121, 101, 199, 0.18)"
            strokeWidth="1.25"
            strokeDasharray="3 3"
          />

          {/* Dynamic Active Traced Bezier Curve: Clause -> Requirement */}
          <path
            d="M 470 270 C 495 270, 505 230, 515 200"
            stroke="url(#heroLavenderCurve)"
            strokeWidth="1.75"
            strokeLinecap="round"
            filter="url(#heroConnectorGlow)"
            style={{
              strokeDasharray: 200,
              strokeDashoffset: isConnectorDrawn ? 0 : 200,
              transition: shouldReduceMotion ? 'none' : 'stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />

          {/* Second Branch: Requirement -> Evidence Attachment */}
          <path
            d="M 515 240 C 525 265, 525 285, 515 315"
            stroke="rgba(121, 101, 199, 0.15)"
            strokeWidth="1.25"
            strokeDasharray="2 2"
          />
          <path
            d="M 515 240 C 525 265, 525 285, 515 315"
            stroke="url(#heroLavenderCurve)"
            strokeWidth="1.5"
            strokeLinecap="round"
            style={{
              strokeDasharray: 140,
              strokeDashoffset: isEvidenceVisible ? 0 : 140,
              transition: shouldReduceMotion ? 'none' : 'stroke-dashoffset 0.6s 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />

          {/* Third Branch: Evidence -> Readiness Gate */}
          <path
            d="M 515 365 C 515 390, 505 410, 485 430"
            stroke="rgba(121, 101, 199, 0.15)"
            strokeWidth="1.25"
            strokeDasharray="2 2"
          />
          <path
            d="M 515 365 C 515 390, 505 410, 485 430"
            stroke="url(#heroLavenderCurve)"
            strokeWidth="1.5"
            strokeLinecap="round"
            style={{
              strokeDasharray: 120,
              strokeDashoffset: isGateVisible ? 0 : 120,
              transition: shouldReduceMotion ? 'none' : 'stroke-dashoffset 0.6s 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />

          {/* Micro Restrained Particle Beacon at Anchor */}
          {isConnectorDrawn && !shouldReduceMotion && (
            <circle
              cx="470"
              cy="270"
              r="2.5"
              fill="#7965C7"
              className="connector-beacon-pulse"
            />
          )}
        </svg>

        {/* ===================================================================
            SATELLITE ANNOTATION 1: COMPACT REQUIREMENT CHIP
            Decomposed atomic criteria directly isolated from § 4.2
            =================================================================== */}
        <aside
          className={`hero-annotation-chip chip-requirement ${
            isReqVisible ? 'is-visible' : ''
          } ${activeInteractive === 'req' ? 'is-focused' : ''}`}
          tabIndex={0}
          role="button"
          aria-label="Requirement Annotation: REQ-04 Institutional NOC Clearance. Status: Missing Evidence."
          onClick={() => setActiveInteractive(activeInteractive === 'req' ? null : 'req')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setActiveInteractive(activeInteractive === 'req' ? null : 'req');
            }
          }}
        >
          <div className="chip-header">
            <span className="chip-category">DECOMPOSED REQUIREMENT</span>
            <span className="chip-code">REQ-04</span>
          </div>

          <div className="chip-body">
            <h5 className="chip-title">Institutional NOC Clearance</h5>
            <p className="chip-desc">Endorsement on official college letterhead signed by Dean.</p>
          </div>

          <div className="chip-status-row">
            <span className="chip-badge badge-missing">
              <ShieldAlert size={11} aria-hidden="true" />
              <span>Missing Evidence</span>
            </span>
            <span className="chip-source-bound">Bound to § 4.2</span>
          </div>
        </aside>

        {/* ===================================================================
            SATELLITE ANNOTATION 2: EVIDENCE ATTACHMENT CARD
            Realistic applicant evidence object tied to the requirement
            =================================================================== */}
        <aside
          className={`hero-annotation-chip chip-evidence ${
            isEvidenceVisible ? 'is-visible' : ''
          } ${activeInteractive === 'evidence' ? 'is-focused' : ''}`}
          tabIndex={0}
          role="button"
          aria-label="Evidence Attachment: College_NOC_Signed.pdf, 1.4 MB. Awaiting applicant upload."
          onClick={() => setActiveInteractive(activeInteractive === 'evidence' ? null : 'evidence')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setActiveInteractive(activeInteractive === 'evidence' ? null : 'evidence');
            }
          }}
        >
          <div className="evidence-chip-inner">
            <div className="evidence-icon-box" aria-hidden="true">
              <Paperclip size={13} />
            </div>
            <div className="evidence-details">
              <span className="evidence-filename">College_NOC_Signed.pdf</span>
              <span className="evidence-filesize">1.4 MB · Pending Upload</span>
            </div>
          </div>
          <div className="evidence-prompt-row">
            <span className="evidence-indicator-dot" aria-hidden="true" />
            <span className="evidence-prompt-text">Awaiting applicant attachment</span>
          </div>
        </aside>

        {/* ===================================================================
            SATELLITE ANNOTATION 3: GATE READINESS INDICATOR
            Restrained semantic pill showing the blocker state
            =================================================================== */}
        <div
          className={`hero-gate-indicator ${
            isGateVisible ? 'is-visible' : ''
          } ${activeInteractive === 'gate' ? 'is-focused' : ''}`}
          tabIndex={0}
          role="button"
          aria-label="Readiness Gate Status: Gate Hold, 1 Blocker. Stage 03 Joining Certification."
          onClick={() => setActiveInteractive(activeInteractive === 'gate' ? null : 'gate')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setActiveInteractive(activeInteractive === 'gate' ? null : 'gate');
            }
          }}
        >
          <div className="gate-icon-pulse" aria-hidden="true">
            <AlertTriangle size={11} />
          </div>
          <div className="gate-text-col">
            <span className="gate-stage-name">STAGE 03 · JOINING GATE</span>
            <span className="gate-hold-status">GATE HOLD · 1 BLOCKER</span>
          </div>
        </div>
      </div>

      {/* Seamless Scroll Invitation to Walkthrough */}
      <a
        href="#process"
        className="hero-doc-scroll-guide"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('process')?.scrollIntoView({ behavior: 'smooth' });
        }}
        aria-label="Scroll to explore the 5-chapter interactive policy decomposition"
      >
        <span className="guide-text">Scroll to inspect interactive policy transformation</span>
        <span className="guide-arrow" aria-hidden="true">↓</span>
      </a>
    </div>
  );
}

export default HeroPolicyDocument;
