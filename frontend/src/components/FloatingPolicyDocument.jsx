import React, { useState, useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  FileText,
  AlertTriangle,
  FileCheck,
  ShieldAlert,
  Sparkles,
  Link2,
} from 'lucide-react';

/**
 * FloatingPolicyDocument Component
 *
 * The signature visual centerpiece of FORMLESS.
 * Features:
 * - Multi-layered paper sheets with physical depth, subtle rotation, and elegant drop shadows.
 * - Restrained pointer-based 3D perspective parallax on desktop.
 * - Illuminated statutory policy clause (§ 4.2 College NOC).
 * - SVG dynamic bezier connector paths linking the clause to floating Requirement
 *   and Evidence satellite objects.
 * - Interactive hover & focus synchronization across clause, paths, and satellites.
 * - Respects prefers-reduced-motion and touch device constraints.
 */
export function FloatingPolicyDocument() {
  const containerRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  // Active focus element: 'none' | 'clause' | 'requirement' | 'evidence' | 'gate'
  const [activeFocus, setActiveFocus] = useState('none');

  // Parallax tilt angles (mouse-driven on desktop)
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, mouseX: 0, mouseY: 0 });
  const [isTouchDevice, setIsTouchDevice] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(pointer: coarse)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(pointer: coarse)');
    const handler = (e) => setIsTouchDevice(e.matches);
    mediaQuery.addEventListener?.('change', handler);
    return () => mediaQuery.removeEventListener?.('change', handler);
  }, []);

  const handleMouseMove = (e) => {
    if (shouldReduceMotion || isTouchDevice || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Normalized coordinates from -1 to 1
    const normX = Math.max(-1, Math.min(1, (e.clientX - centerX) / (rect.width / 2)));
    const normY = Math.max(-1, Math.min(1, (e.clientY - centerY) / (rect.height / 2)));

    // Subtle restrained tilt: max 6 degrees
    setTilt({
      rotateX: -normY * 5.5,
      rotateY: normX * 6.5,
      mouseX: normX,
      mouseY: normY,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0, mouseX: 0, mouseY: 0 });
    setActiveFocus('none');
  };

  const isClauseActive = activeFocus === 'clause' || activeFocus === 'requirement';
  const isReqActive = activeFocus === 'requirement' || activeFocus === 'clause' || activeFocus === 'evidence';
  const isEvidenceActive = activeFocus === 'evidence' || activeFocus === 'requirement';
  const isGateActive = activeFocus === 'gate' || activeFocus === 'requirement';

  return (
    <div
      ref={containerRef}
      className="floating-policy-viewport"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      aria-label="Interactive Floating Policy Document Composition"
    >
      <motion.div
        className="floating-policy-3d-stage"
        animate={
          shouldReduceMotion || isTouchDevice
            ? { rotateX: 0, rotateY: 0 }
            : {
                rotateX: tilt.rotateX,
                rotateY: tilt.rotateY,
                transformPerspective: 1200,
              }
        }
        transition={{ type: 'spring', damping: 24, stiffness: 180, mass: 0.8 }}
      >
        {/* ===================================================================
            LAYER 3: BACKGROUND REAR PAPER SHEET (DEEPEST LAYER)
            =================================================================== */}
        <motion.div
          className="paper-sheet paper-sheet-back"
          animate={
            shouldReduceMotion
              ? {}
              : {
                  x: tilt.mouseX * -8,
                  y: tilt.mouseY * -8,
                  rotate: -4.5,
                }
          }
          transition={{ duration: 0.3 }}
          aria-hidden="true"
        >
          <div className="sheet-watermark-strip">
            <span>OFFICIAL GAZETTE OF INDIA • STATUTORY NOTIFICATION</span>
            <span className="mono-code">ACT § 2026/FSSAI</span>
          </div>
          <div className="sheet-skeleton-grid">
            <div className="skel-row w-90" />
            <div className="skel-row w-75" />
            <div className="skel-row w-85" />
            <div className="skel-row w-60" />
          </div>
        </motion.div>

        {/* ===================================================================
            LAYER 2: MIDDLE PAPER SHEET (INTERMEDIATE DEPTH)
            =================================================================== */}
        <motion.div
          className="paper-sheet paper-sheet-mid"
          animate={
            shouldReduceMotion
              ? {}
              : {
                  x: tilt.mouseX * 4,
                  y: tilt.mouseY * 4,
                  rotate: 2.8,
                }
          }
          transition={{ duration: 0.3 }}
          aria-hidden="true"
        >
          <div className="sheet-mid-header">
            <div className="sheet-mid-stamp">ANNEXURE II</div>
            <span className="sheet-mid-meta">SCHEDULE OF PREREQUISITES</span>
          </div>
          <div className="sheet-skeleton-grid">
            <div className="skel-row w-80" />
            <div className="skel-row w-95" />
            <div className="skel-row w-70" />
            <div className="skel-row w-85" />
            <div className="skel-row w-50" />
          </div>
        </motion.div>

        {/* ===================================================================
            LAYER 1: FOREGROUND MAIN DOCUMENT (CRISP EDITORIAL SURFACE)
            =================================================================== */}
        <motion.div
          className="paper-sheet paper-sheet-front"
          initial={{ opacity: 0, y: 24 }}
          animate={{
            opacity: 1,
            y: shouldReduceMotion ? 0 : [0, -4, 0],
          }}
          transition={
            shouldReduceMotion
              ? { duration: 0.4 }
              : {
                  opacity: { duration: 0.6 },
                  y: { repeat: Infinity, duration: 7, ease: 'easeInOut' },
                }
          }
        >
          {/* Document Header & Authority Insignia */}
          <div className="doc-masthead">
            <div className="doc-authority-badge">
              <div className="doc-seal-symbol" aria-hidden="true">
                <FileText size={14} />
              </div>
              <div className="doc-authority-titles">
                <span className="doc-org-name">FOOD SAFETY AND STANDARDS AUTHORITY OF INDIA</span>
                <span className="doc-org-sub">HR & Institutional Training Division • Circular 2026</span>
              </div>
            </div>

            <div className="doc-ref-badge">
              <span className="doc-ref-label">REF:</span>
              <span className="doc-ref-code">F.No. 12015/02/2026-TRG</span>
            </div>
          </div>

          <div className="doc-divider" />

          {/* Document Title & Subject */}
          <div className="doc-title-block">
            <span className="doc-category-tag">STATUTORY REGULATORY DIRECTIVE</span>
            <h3 className="doc-headline">
              Guidelines for National Food Safety Internship Scheme (Session 2026–2027)
            </h3>
            <div className="doc-mandate-bar">
              <span>Section 16(5) FSS Act 2006</span>
              <span>•</span>
              <span>Gate Stage: Joining Clearance</span>
              <span>•</span>
              <span className="text-cyan">8 Decomposed Criteria</span>
            </div>
          </div>

          {/* Document Body: Section 1 (Neutral Skeleton) */}
          <div className="doc-clause-block neutral-clause">
            <div className="clause-header">
              <span className="clause-num">§ 1.1</span>
              <span className="clause-title">Educational Qualifications & Degree Standing</span>
            </div>
            <div className="clause-skeleton-lines">
              <div className="skel-line w-95" />
              <div className="skel-line w-80" />
            </div>
          </div>

          {/* ===============================================================
              KEYSTONE HIGHLIGHTED CLAUSE: § 4.2 MANDATORY COLLEGE NOC
              Interactive source anchor for SVG connectors
              =============================================================== */}
          <motion.div
            className={`doc-clause-block highlight-clause ${isClauseActive ? 'focused' : ''}`}
            onMouseEnter={() => setActiveFocus('clause')}
            onMouseLeave={() => setActiveFocus('none')}
            onFocus={() => setActiveFocus('clause')}
            onBlur={() => setActiveFocus('none')}
            tabIndex={0}
            role="button"
            aria-label="Highlighted Policy Clause: § 4.2 Mandatory Institutional Clearance. Press or hover to trace requirement."
            whileHover={shouldReduceMotion ? {} : { scale: 1.01 }}
            transition={{ duration: 0.2 }}
          >
            <div className="highlight-clause-glow" aria-hidden="true" />
            <div className="clause-header">
              <div className="clause-badge-wrap">
                <span className="clause-badge">§ 4.2</span>
                <span className="clause-badge-title">MANDATORY INSTITUTIONAL CLEARANCE</span>
              </div>
              <span className="citation-pill">Source Citation § 4.2(b)</span>
            </div>

            <p className="clause-quote-text">
              “Every candidate shortlisted for joining must submit an official{' '}
              <strong className="text-highlight">No Objection Certificate (NOC)</strong> issued on
              institutional letterhead and endorsed by the College Principal or Dean. Absence of this
              endorsement will cause immediate stage disqualification.”
            </p>

            {/* Statutory Anchor Point for SVG Connector */}
            <div className="clause-connector-anchor" id="clause-anchor-4-2" aria-hidden="true">
              <div className="anchor-pulse" />
              <div className="anchor-dot" />
            </div>
          </motion.div>

          {/* Section 4.3 Neutral Clause */}
          <div className="doc-clause-block neutral-clause">
            <div className="clause-header">
              <span className="clause-num">§ 4.3</span>
              <span className="clause-title">Character Verification & Police Clearance</span>
            </div>
            <div className="clause-skeleton-lines">
              <div className="skel-line w-90" />
              <div className="skel-line w-65" />
            </div>
          </div>

          {/* Document Footer: Authentication Stamp & Hash */}
          <div className="doc-footer-stamp-row">
            <div className="doc-verification-stamp">
              <FileCheck size={13} className="stamp-icon" aria-hidden="true" />
              <span>FORMLESS MACHINE EXTRACTED • GEMINI 3.8 FLASH</span>
            </div>
            <div className="doc-hash-pill">
              <span>SHA-256: 4f8a9e...2b01</span>
            </div>
          </div>
        </motion.div>

        {/* ===================================================================
            DYNAMIC SVG CONNECTOR PATHS
            Renders animated bezier curves from Clause 4.2 -> Requirement Node -> Evidence
            =================================================================== */}
        <svg
          className="floating-connectors-svg"
          viewBox="0 0 680 520"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="curveGlowCyan" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.7" />
            </linearGradient>
            <linearGradient id="curveGlowRose" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#E11D48" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="curveGlowAmber" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#D97706" stopOpacity="0.7" />
            </linearGradient>
            <filter id="svgPathShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#38BDF8" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Background Connector Guide: Clause 4.2 -> Requirement Satellite */}
          <path
            d="M 330 268 C 390 268, 430 160, 480 135"
            stroke="rgba(56, 189, 248, 0.25)"
            strokeWidth="2"
            strokeDasharray="4 4"
          />

          {/* Active Illuminated Path: Clause 4.2 -> Requirement Satellite */}
          <motion.path
            d="M 330 268 C 390 268, 430 160, 480 135"
            stroke="url(#curveGlowRose)"
            strokeWidth={isReqActive ? '3.5' : '2'}
            strokeLinecap="round"
            className={`connector-line ${isReqActive ? 'active' : ''}`}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />

          {/* Connector: Requirement Satellite -> Evidence Satellite */}
          <path
            d="M 540 180 C 560 220, 560 280, 510 320"
            stroke="rgba(56, 189, 248, 0.2)"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
          <motion.path
            d="M 540 180 C 560 220, 560 280, 510 320"
            stroke="url(#curveGlowCyan)"
            strokeWidth={isEvidenceActive ? '3' : '1.5'}
            strokeLinecap="round"
            className={`connector-line ${isEvidenceActive ? 'active' : ''}`}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }}
          />

          {/* Connector: Requirement Satellite -> Target Gate */}
          <motion.path
            d="M 550 145 C 610 145, 630 380, 540 435"
            stroke="url(#curveGlowAmber)"
            strokeWidth={isGateActive ? '3' : '1.5'}
            strokeDasharray="5 3"
            strokeLinecap="round"
            className={`connector-line ${isGateActive ? 'active' : ''}`}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, delay: 0.5, ease: 'easeOut' }}
          />

          {/* Flowing Energy Particle (Traverses Path) */}
          {!shouldReduceMotion && (
            <motion.circle
              r="4.5"
              fill="#F43F5E"
              filter="url(#svgPathShadow)"
              initial={{ offsetDistance: '0%' }}
              animate={{
                cx: [330, 390, 440, 480],
                cy: [268, 240, 180, 135],
              }}
              transition={{
                repeat: Infinity,
                duration: 3.5,
                ease: 'easeInOut',
              }}
            />
          )}
        </svg>

        {/* ===================================================================
            SATELLITE 1: ATOMIC REQUIREMENT NODE (FSSAI-REQ-07 COLLEGE NOC)
            =================================================================== */}
        <motion.div
          className={`satellite-card satellite-requirement ${isReqActive ? 'focused' : ''}`}
          initial={{ opacity: 0, x: 24, scale: 0.95 }}
          animate={{
            opacity: 1,
            x: 0,
            scale: 1,
            y: shouldReduceMotion ? 0 : [-3, 3, -3],
          }}
          transition={
            shouldReduceMotion
              ? { duration: 0.4 }
              : {
                  opacity: { duration: 0.6, delay: 0.3 },
                  x: { duration: 0.6, delay: 0.3 },
                  scale: { duration: 0.6, delay: 0.3 },
                  y: { repeat: Infinity, duration: 5.5, ease: 'easeInOut' },
                }
          }
          onMouseEnter={() => setActiveFocus('requirement')}
          onMouseLeave={() => setActiveFocus('none')}
          onFocus={() => setActiveFocus('requirement')}
          onBlur={() => setActiveFocus('none')}
          tabIndex={0}
          role="button"
          aria-label="Requirement Node: FSSAI-REQ-07 College NOC. Status: Missing, Active Blocker."
        >
          <div className="satellite-header">
            <span className="satellite-kicker kicker-blocker">
              <ShieldAlert size={11} aria-hidden="true" />
              <span>ACTIVE BLOCKER</span>
            </span>
            <span className="satellite-code">FSSAI-REQ-07</span>
          </div>

          <div className="satellite-body">
            <h4 className="satellite-title">College No Objection Certificate</h4>
            <p className="satellite-desc">Endorsement from College Principal on official letterhead.</p>
          </div>

          <div className="satellite-footer">
            <span className="status-badge-inline status-missing">Missing Evidence</span>
            <div className="satellite-link-pill">
              <Link2 size={11} aria-hidden="true" />
              <span>Bound to § 4.2</span>
            </div>
          </div>
        </motion.div>

        {/* ===================================================================
            SATELLITE 2: LINKED EVIDENCE ATTACHMENT OBJECT
            =================================================================== */}
        <motion.div
          className={`satellite-card satellite-evidence ${isEvidenceActive ? 'focused' : ''}`}
          initial={{ opacity: 0, x: 24, scale: 0.95 }}
          animate={{
            opacity: 1,
            x: 0,
            scale: 1,
            y: shouldReduceMotion ? 0 : [3, -3, 3],
          }}
          transition={
            shouldReduceMotion
              ? { duration: 0.4 }
              : {
                  opacity: { duration: 0.6, delay: 0.5 },
                  x: { duration: 0.6, delay: 0.5 },
                  scale: { duration: 0.6, delay: 0.5 },
                  y: { repeat: Infinity, duration: 6.2, ease: 'easeInOut' },
                }
          }
          onMouseEnter={() => setActiveFocus('evidence')}
          onMouseLeave={() => setActiveFocus('none')}
          onFocus={() => setActiveFocus('evidence')}
          onBlur={() => setActiveFocus('none')}
          tabIndex={0}
          role="button"
          aria-label="Evidence Specification: college_noc.pdf. Required format PDF up to 10MB."
        >
          <div className="evidence-header-row">
            <div className="evidence-file-icon" aria-hidden="true">
              <FileText size={14} />
            </div>
            <div className="evidence-file-info">
              <span className="evidence-name">college_noc.pdf</span>
              <span className="evidence-meta">Signed PDF • Max 10 MB</span>
            </div>
          </div>

          <div className="evidence-upload-prompt">
            <div className="dashed-indicator">
              <Sparkles size={11} className="text-cyan" aria-hidden="true" />
              <span>Awaiting Applicant Evidence</span>
            </div>
          </div>
        </motion.div>

        {/* ===================================================================
            SATELLITE 3: TARGET STAGE GATE READINESS INDICATOR
            =================================================================== */}
        <motion.div
          className={`satellite-gate-pill ${isGateActive ? 'focused' : ''}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{
            opacity: 1,
            y: shouldReduceMotion ? 0 : [0, 2, 0],
          }}
          transition={
            shouldReduceMotion
              ? { duration: 0.4 }
              : {
                  opacity: { duration: 0.6, delay: 0.7 },
                  y: { repeat: Infinity, duration: 4.8, ease: 'easeInOut' },
                }
          }
          onMouseEnter={() => setActiveFocus('gate')}
          onMouseLeave={() => setActiveFocus('none')}
          onFocus={() => setActiveFocus('gate')}
          onBlur={() => setActiveFocus('none')}
          tabIndex={0}
          role="button"
          aria-label="Target Stage Gate: Joining Certification. Status: Not Ready, 2 Blockers."
        >
          <div className="gate-icon-dot" aria-hidden="true">
            <AlertTriangle size={12} />
          </div>
          <div className="gate-pill-text">
            <span className="gate-pill-label">STAGE GATE 03</span>
            <span className="gate-pill-status">JOINING: NOT READY</span>
          </div>
          <span className="gate-blocker-count">2 Blockers</span>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default FloatingPolicyDocument;
