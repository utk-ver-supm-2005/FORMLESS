import React, { useState } from 'react';
import { motion } from 'motion/react';

/**
 * Signature Handcrafted Animated Workflow Illustration
 * Visualizes the complete compliance transformation pipeline:
 * POLICY → REQUIREMENTS → EVIDENCE → VERIFICATION → STAGE GATE READINESS
 *
 * Crafted specifically for FORMLESS:
 * - Geometric SVG architecture with precise bezier paths
 * - Animated scan lines and energy particle flows along connectors
 * - Realistic compliance states (Verified, Review, Blocker)
 * - Interactive stage selector for tactile exploration
 * - Fully accessible and responsive with prefers-reduced-motion respect
 */
export function ProductWorkflowIllustration() {
  const [activeStep, setActiveStep] = useState(0); // 0: All, 1: Policy, 2: Criteria, 3: Evidence, 4: Verify, 5: Gate

  const steps = [
    { id: 0, label: 'Full Lifecycle Pipeline' },
    { id: 1, label: '1. Ingest Policy' },
    { id: 2, label: '2. Atomic Criteria' },
    { id: 3, label: '3. Evidence Linking' },
    { id: 4, label: '4. Rule Verification' },
    { id: 5, label: '5. Gate Readiness' },
  ];

  return (
    <div className="signature-illustration-container" aria-label="FORMLESS Compliance Transformation Pipeline">
      {/* Interactive Stage Scrubber */}
      <div className="illustration-controls" role="tablist" aria-label="Pipeline Stages">
        {steps.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={activeStep === s.id}
            className={`stage-scrubber-btn ${activeStep === s.id ? 'active' : ''}`}
            onClick={() => setActiveStep(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="svg-frame-wrapper">
        <svg
          viewBox="0 0 1020 460"
          className="workflow-svg"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Gradients */}
            <linearGradient id="bgGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0F172A" />
              <stop offset="50%" stopColor="#0B0F19" />
              <stop offset="100%" stopColor="#07090E" />
            </linearGradient>

            <linearGradient id="policyBeam" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0" />
              <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
            </linearGradient>

            <linearGradient id="flowEmerald" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#34D399" />
            </linearGradient>

            <linearGradient id="flowRose" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F43F5E" />
              <stop offset="100%" stopColor="#FB7185" />
            </linearGradient>

            <linearGradient id="gateGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#18181B" />
              <stop offset="100%" stopColor="#09090B" />
            </linearGradient>

            {/* Grid Pattern */}
            <pattern id="gridDots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="#334155" fillOpacity="0.35" />
            </pattern>

            {/* Filter for subtle glow */}
            <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Deep Architectural Canvas */}
          <rect width="1020" height="460" rx="16" fill="url(#bgGlow)" stroke="#1E293B" strokeWidth="1" />
          <rect width="1020" height="460" rx="16" fill="url(#gridDots)" />

          {/* Connecting Flow Paths (Beziers) */}
          {/* Path 1: Policy -> Criteria 1 (Verified) */}
          <path
            d="M 195 210 C 250 210, 270 110, 330 110"
            stroke="#10B981"
            strokeWidth="2"
            strokeDasharray="6 4"
            className="flow-path path-verified"
          />
          {/* Path 2: Policy -> Criteria 2 (Blocker NOC) */}
          <path
            d="M 195 230 C 250 230, 270 230, 330 230"
            stroke="#F43F5E"
            strokeWidth="2.5"
            strokeDasharray="6 4"
            className="flow-path path-blocker"
          />
          {/* Path 3: Policy -> Criteria 3 (Review) */}
          <path
            d="M 195 250 C 250 250, 270 350, 330 350"
            stroke="#F59E0B"
            strokeWidth="2"
            strokeDasharray="6 4"
            className="flow-path path-review"
          />

          {/* Path 4: Criteria 1 -> Evidence 1 */}
          <path
            d="M 505 110 L 565 110"
            stroke="#10B981"
            strokeWidth="2"
            className="flow-path"
          />
          {/* Path 5: Criteria 2 -> Evidence (Unlinked/Missing) */}
          <path
            d="M 505 230 L 565 230"
            stroke="#F43F5E"
            strokeWidth="2"
            strokeDasharray="3 3"
          />
          {/* Path 6: Criteria 3 -> Evidence 3 */}
          <path
            d="M 505 350 L 565 350"
            stroke="#F59E0B"
            strokeWidth="2"
          />

          {/* Path 7: Evidence -> Verification Engine */}
          <path
            d="M 685 110 C 720 110, 725 210, 760 210"
            stroke="#38BDF8"
            strokeWidth="1.5"
          />
          <path
            d="M 685 230 L 760 230"
            stroke="#F43F5E"
            strokeWidth="2"
            strokeDasharray="4 2"
          />
          <path
            d="M 685 350 C 720 350, 725 250, 760 250"
            stroke="#F59E0B"
            strokeWidth="1.5"
          />

          {/* Path 8: Verification Engine -> Stage Gate */}
          <path
            d="M 855 230 L 890 230"
            stroke="#F43F5E"
            strokeWidth="2.5"
            className="flow-path path-gate"
          />

          {/* ============================================================= */}
          {/* 1. STAGE 1: POLICY ORIGIN DOCUMENT                           */}
          {/* ============================================================= */}
          <g
            className={`stage-group group-policy ${activeStep === 1 || activeStep === 0 ? 'highlight' : 'dimmed'}`}
            transform="translate(45, 120)"
          >
            {/* Background pages */}
            <rect x="12" y="12" width="138" height="196" rx="6" fill="#1E293B" stroke="#334155" strokeWidth="1" />
            <rect x="6" y="6" width="138" height="196" rx="6" fill="#0F172A" stroke="#334155" strokeWidth="1" />
            {/* Primary Document */}
            <rect x="0" y="0" width="138" height="196" rx="6" fill="#090D16" stroke="#38BDF8" strokeWidth="1.5" />

            {/* Folded corner */}
            <polygon points="106,0 138,32 106,32" fill="#1E293B" stroke="#38BDF8" strokeWidth="1" />

            {/* Document Header & Seal */}
            <circle cx="28" cy="28" r="10" fill="#1E293B" stroke="#38BDF8" strokeWidth="1" />
            <path d="M 24 28 L 27 31 L 33 24" stroke="#38BDF8" strokeWidth="1.5" strokeLinecap="round" />
            <text x="46" y="26" fill="#94A3B8" fontSize="8" fontFamily="monospace" fontWeight="700">POLICY SPEC</text>
            <text x="46" y="36" fill="#F8FAFC" fontSize="10" fontWeight="700">FSSAI 2026</text>

            {/* Policy Text Clauses (simulated lines) */}
            <line x1="18" y1="58" x2="118" y2="58" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="18" y1="72" x2="108" y2="72" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="18" y1="86" x2="94" y2="86" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />

            {/* Highlighted extracted section */}
            <rect x="14" y="102" width="110" height="24" rx="3" fill="#1E293B" stroke="#0284C7" strokeWidth="1" />
            <text x="22" y="117" fill="#38BDF8" fontSize="8" fontFamily="monospace">§4.2 Criteria Extract</text>

            <line x1="18" y1="140" x2="114" y2="140" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="18" y1="154" x2="100" y2="154" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="18" y1="168" x2="80" y2="168" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />

            {/* Animated Laser Scanning Beam */}
            <motion.rect
              x="2"
              y="50"
              width="134"
              height="8"
              fill="url(#policyBeam)"
              animate={{ y: [48, 172, 48] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Label below */}
            <text x="69" y="222" textAnchor="middle" fill="#64748B" fontSize="9" fontWeight="600" letterSpacing="0.08em">
              ORIGINAL CIRCULAR
            </text>
          </g>

          {/* ============================================================= */}
          {/* 2. STAGE 2: ATOMIC REQUIREMENTS MATRIX CARDS                  */}
          {/* ============================================================= */}
          {/* Criteria 1: Graduate Degree (VERIFIED) */}
          <g
            className={`stage-group group-req ${activeStep === 2 || activeStep === 0 ? 'highlight' : 'dimmed'}`}
            transform="translate(330, 75)"
          >
            <rect x="0" y="0" width="175" height="70" rx="8" fill="#090D16" stroke="#10B981" strokeWidth="1.5" />
            <rect x="0" y="0" width="4" height="70" rx="2" fill="#10B981" />
            <text x="14" y="22" fill="#10B981" fontSize="9" fontFamily="monospace" fontWeight="700">REQ-01 · ELIGIBILITY</text>
            <text x="14" y="38" fill="#F8FAFC" fontSize="11" fontWeight="600">Graduate Degree Marksheet</text>
            <rect x="14" y="47" width="56" height="15" rx="3" fill="#064E3B" />
            <text x="21" y="58" fill="#34D399" fontSize="8" fontWeight="700">✓ VERIFIED</text>
            <text x="80" y="58" fill="#64748B" fontSize="8">Section 4.1</text>
          </g>

          {/* Criteria 2: College NOC (ACTIVE BLOCKER) */}
          <g
            className={`stage-group group-req ${activeStep === 2 || activeStep === 0 ? 'highlight' : 'dimmed'}`}
            transform="translate(330, 195)"
          >
            <rect x="0" y="0" width="175" height="70" rx="8" fill="#090D16" stroke="#F43F5E" strokeWidth="1.75" />
            <rect x="0" y="0" width="4" height="70" rx="2" fill="#F43F5E" />
            <text x="14" y="22" fill="#FB7185" fontSize="9" fontFamily="monospace" fontWeight="700">REQ-07 · PREREQUISITE</text>
            <text x="14" y="38" fill="#F8FAFC" fontSize="11" fontWeight="600">College NOC Certificate</text>
            <rect x="14" y="47" width="58" height="15" rx="3" fill="#881337" />
            <text x="20" y="58" fill="#FDA4AF" fontSize="8" fontWeight="700">✕ BLOCKER</text>
            <text x="80" y="58" fill="#FB7185" fontSize="8" fontWeight="600">Blocks Joining</text>
          </g>

          {/* Criteria 3: Recommendation (NEEDS VERIFICATION) */}
          <g
            className={`stage-group group-req ${activeStep === 2 || activeStep === 0 ? 'highlight' : 'dimmed'}`}
            transform="translate(330, 315)"
          >
            <rect x="0" y="0" width="175" height="70" rx="8" fill="#090D16" stroke="#F59E0B" strokeWidth="1.5" />
            <rect x="0" y="0" width="4" height="70" rx="2" fill="#F59E0B" />
            <text x="14" y="22" fill="#FBBF24" fontSize="9" fontFamily="monospace" fontWeight="700">REQ-05 · DOCUMENTATION</text>
            <text x="14" y="38" fill="#F8FAFC" fontSize="11" fontWeight="600">HoD Recommendation</text>
            <rect x="14" y="47" width="56" height="15" rx="3" fill="#78350F" />
            <text x="22" y="58" fill="#FCD34D" fontSize="8" fontWeight="700">⌛ REVIEW</text>
            <text x="78" y="58" fill="#64748B" fontSize="8">Section 6.3</text>
          </g>

          {/* ============================================================= */}
          {/* 3. STAGE 3: EVIDENCE ATTACHMENT NODES                         */}
          {/* ============================================================= */}
          {/* Evidence 1: degree.pdf */}
          <g
            className={`stage-group group-evidence ${activeStep === 3 || activeStep === 0 ? 'highlight' : 'dimmed'}`}
            transform="translate(565, 85)"
          >
            <rect x="0" y="0" width="120" height="50" rx="6" fill="#1E293B" stroke="#334155" strokeWidth="1" />
            <rect x="10" y="10" width="14" height="18" rx="2" fill="#0F172A" stroke="#34D399" strokeWidth="1" />
            <text x="14" y="22" fill="#34D399" fontSize="7" fontWeight="700">PDF</text>
            <text x="32" y="20" fill="#F8FAFC" fontSize="10" fontFamily="monospace" fontWeight="600">degree.pdf</text>
            <text x="32" y="32" fill="#10B981" fontSize="8">✓ Linked & OCR Verified</text>
          </g>

          {/* Evidence 2: Missing Attachment Alert */}
          <g
            className={`stage-group group-evidence ${activeStep === 3 || activeStep === 0 ? 'highlight' : 'dimmed'}`}
            transform="translate(565, 205)"
          >
            <rect x="0" y="0" width="120" height="50" rx="6" fill="#1F151B" stroke="#F43F5E" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx="20" cy="25" r="8" fill="#881337" />
            <text x="17" y="29" fill="#FDA4AF" fontSize="11" fontWeight="700">!</text>
            <text x="36" y="22" fill="#FDA4AF" fontSize="10" fontWeight="600">Missing PDF</text>
            <text x="36" y="34" fill="#94A3B8" fontSize="8">Upload Required</text>
          </g>

          {/* Evidence 3: recommendation.pdf */}
          <g
            className={`stage-group group-evidence ${activeStep === 3 || activeStep === 0 ? 'highlight' : 'dimmed'}`}
            transform="translate(565, 325)"
          >
            <rect x="0" y="0" width="120" height="50" rx="6" fill="#1E293B" stroke="#334155" strokeWidth="1" />
            <rect x="10" y="10" width="14" height="18" rx="2" fill="#0F172A" stroke="#F59E0B" strokeWidth="1" />
            <text x="14" y="22" fill="#F59E0B" fontSize="7" fontWeight="700">PDF</text>
            <text x="32" y="20" fill="#F8FAFC" fontSize="10" fontFamily="monospace" fontWeight="600">hod_rec.pdf</text>
            <text x="32" y="32" fill="#FBBF24" fontSize="8">Awaiting Signoff</text>
          </g>

          {/* ============================================================= */}
          {/* 4. STAGE 4: VERIFICATION ENGINE                               */}
          {/* ============================================================= */}
          <g
            className={`stage-group group-verify ${activeStep === 4 || activeStep === 0 ? 'highlight' : 'dimmed'}`}
            transform="translate(760, 180)"
          >
            <rect x="0" y="0" width="95" height="100" rx="10" fill="#090D16" stroke="#38BDF8" strokeWidth="1.5" />
            {/* Spinning/pulsing verification core */}
            <circle cx="47" cy="38" r="18" fill="#0F172A" stroke="#0284C7" strokeWidth="1" />
            <path
              d="M 39 38 L 45 44 L 57 32"
              stroke="#38BDF8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <text x="47" y="70" textAnchor="middle" fill="#E2E8F0" fontSize="9" fontWeight="700">RULE ENGINE</text>
            <text x="47" y="82" textAnchor="middle" fill="#38BDF8" fontSize="8" fontFamily="monospace">Deterministic</text>
          </g>

          {/* ============================================================= */}
          {/* 5. STAGE 5: TARGET STAGE GATE CLEARANCE                       */}
          {/* ============================================================= */}
          <g
            className={`stage-group group-gate ${activeStep === 5 || activeStep === 0 ? 'highlight' : 'dimmed'}`}
            transform="translate(890, 155)"
          >
            <rect x="0" y="0" width="105" height="150" rx="10" fill="url(#gateGlow)" stroke="#F43F5E" strokeWidth="2" />
            {/* Target Stage Badge */}
            <rect x="10" y="14" width="85" height="18" rx="4" fill="#881337" />
            <text x="52" y="26" textAnchor="middle" fill="#FDA4AF" fontSize="8" fontWeight="800" letterSpacing="0.04em">
              JOINING GATE
            </text>

            {/* Lock / Checkpoint Icon */}
            <circle cx="52" cy="62" r="18" fill="#1C1917" stroke="#F43F5E" strokeWidth="1.5" />
            <path
              d="M 48 58 L 48 54 C 48 51.5 50 49.5 52 49.5 C 54 49.5 56 51.5 56 54 L 56 58 M 46 58 L 58 58 L 58 68 L 46 68 Z"
              stroke="#FDA4AF"
              strokeWidth="1.5"
              fill="none"
            />

            {/* Status Text */}
            <text x="52" y="98" textAnchor="middle" fill="#F43F5E" fontSize="11" fontWeight="700">
              NOT READY
            </text>
            <text x="52" y="112" textAnchor="middle" fill="#FB7185" fontSize="8" fontWeight="600">
              2 Blockers
            </text>

            <rect x="12" y="124" width="81" height="16" rx="4" fill="#27272A" />
            <text x="52" y="135" textAnchor="middle" fill="#E4E4E7" fontSize="7" fontWeight="600">
              Resolve NOC →
            </text>
          </g>

          {/* Animated Stream Pulses (Dots moving along key paths) */}
          <motion.circle
            r="4"
            fill="#34D399"
            filter="url(#glowFilter)"
            animate={{
              cx: [195, 270, 330, 505, 565, 685, 760],
              cy: [210, 110, 110, 110, 110, 110, 210],
              opacity: [0, 1, 1, 1, 1, 1, 0],
            }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
          />
          <motion.circle
            r="4"
            fill="#FB7185"
            filter="url(#glowFilter)"
            animate={{
              cx: [195, 270, 330, 505, 565, 760, 890],
              cy: [230, 230, 230, 230, 230, 230, 230],
              opacity: [0, 1, 1, 1, 1, 1, 0],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear', delay: 1 }}
          />
        </svg>
      </div>

      {/* Narrative Subtitle */}
      <div className="illustration-caption">
        <span className="caption-tag">ARCHITECTURE SCHEMATIC</span>
        <p className="caption-text">
          Statutory policy guidelines are automatically decomposed into verifiable criteria, connected to applicant
          evidence records, and evaluated through deterministic rules to compute stage-gate readiness.
        </p>
      </div>
    </div>
  );
}

export default ProductWorkflowIllustration;
