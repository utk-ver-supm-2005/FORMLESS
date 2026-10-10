/**
 * Overview Model & State Derivation Helper
 *
 * Single source of truth for the Overview experience. Evaluates hero headline,
 * readiness summary counts, prioritized attention items, and recent activity
 * strictly from authoritative ApplicationContext aggregate data.
 *
 * Never fabricates counts, blockers, timestamps, or activity entries.
 */

import {
  formatAuditAction,
  formatEventTimestamp,
  formatStateLabel,
} from '../components/auditModel.js';

/**
 * Derives hero presentation strictly from backend gate readiness read model.
 * Produces dynamic, confident editorial typography without hardcoded text.
 */
export function deriveOverviewHeroModel(aggregate, activeGate = 'JOINING') {
  const readiness = aggregate?.gate_readiness;
  const targetGate = readiness?.gate || activeGate || 'JOINING';
  const hasData = Boolean(aggregate && readiness);
  const isReady = hasData && Boolean(readiness.is_ready);
  const activeBlockers = readiness?.active_blockers || [];
  const blockerCount = activeBlockers.length;
  const gateDisplay = targetGate.toLowerCase();

  let state = 'PENDING';
  let headline = `Evaluating readiness for ${gateDisplay}...`;
  let subline = 'Awaiting authoritative gate evaluation from the compliance engine.';

  if (hasData) {
    if (isReady) {
      state = 'READY';
      headline = `Ready for ${gateDisplay}.`;
      subline = 'All mandatory criteria and stage blockers have been verified.';
    } else {
      state = 'NOT_READY';
      headline = `You’re not ready for ${gateDisplay} yet.`;
      subline =
        blockerCount === 1
          ? `1 requirement is currently blocking the ${targetGate} gate.`
          : `${blockerCount} requirements are currently blocking the ${targetGate} gate.`;
    }
  }

  return {
    state, // 'PENDING' | 'READY' | 'NOT_READY'
    targetGate,
    isReady,
    hasData,
    blockerCount,
    headline,
    subline,
  };
}

/**
 * Derives the stage gate progression timeline inspired by institutional milestones.
 * Identifies passed, current, and upcoming gates relative to active stage gate.
 */
export function deriveStageTimeline(aggregate, activeGate = 'JOINING') {
  const readiness = aggregate?.gate_readiness;
  const currentGate = readiness?.gate || activeGate || 'JOINING';
  const isReady = Boolean(readiness?.is_ready);
  const blockerCount = readiness?.active_blockers?.length || 0;

  const STAGES = [
    { key: 'APPLICATION_SUBMISSION', title: 'Application', sub: 'Initial Filing' },
    { key: 'DOCUMENT_VERIFICATION', title: 'Verification', sub: 'Policy Extraction' },
    {
      key: 'JOINING',
      title: 'Joining Gate',
      sub: isReady ? 'Cleared' : `${blockerCount} Blocker${blockerCount === 1 ? '' : 's'}`,
    },
    { key: 'ONBOARDING', title: 'Onboarding', sub: 'Institutional Sign-off' },
  ];

  const currentIndex = STAGES.findIndex((s) => s.key === currentGate);
  const effectiveIndex = currentIndex >= 0 ? currentIndex : 2;

  return STAGES.map((stage, idx) => {
    let state = 'upcoming'; // 'completed' | 'active' | 'upcoming'
    if (idx < effectiveIndex) {
      state = 'completed';
    } else if (idx === effectiveIndex) {
      state = isReady ? 'completed' : 'active';
    } else {
      state = 'upcoming';
    }

    return {
      ...stage,
      state,
      isCurrent: idx === effectiveIndex,
      isPassed: idx < effectiveIndex || (idx === effectiveIndex && isReady),
      badgeText:
        idx < effectiveIndex
          ? 'Passed'
          : idx === effectiveIndex
          ? isReady
            ? 'Ready'
            : `${blockerCount} Blocker${blockerCount === 1 ? '' : 's'}`
          : 'Pending',
    };
  });
}

/**
 * Derives the dominant horizontal readiness summary model.
 * Consumes verified, needs-verification, missing, and total counts from aggregate.progress.
 */
export function deriveReadinessSummaryModel(aggregate, activeGate = 'JOINING') {
  const progress = aggregate?.progress;
  const verified = progress?.verified_count ?? progress?.resolved_count ?? 0;
  const needsVerification = progress?.needs_verification_count ?? 0;
  const missing = progress?.missing_count ?? 0;
  const inProgress = progress?.in_progress_count ?? 0;
  const total =
    progress?.total_count ?? (verified + needsVerification + missing + inProgress);

  const calcPct = (val) => (total > 0 ? (val / total) * 100 : 0);
  const stageTimeline = deriveStageTimeline(aggregate, activeGate);

  return {
    verified,
    needsVerification,
    missing,
    inProgress,
    total,
    verifiedPct: calcPct(verified),
    needsVerificationPct: calcPct(needsVerification),
    missingPct: calcPct(missing),
    inProgressPct: calcPct(inProgress),
    displayProgress:
      progress?.display_progress || `${verified} of ${total} requirements resolved`,
    stageTimeline,
  };
}

/**
 * Derives items needing user attention in strict priority order:
 *   1. Active gate blockers (highest priority)
 *   2. Needs-verification requirements
 *   3. In-progress / rejected requirements
 *
 * Strictly excludes verified requirements.
 */
export function deriveAttentionItems(aggregate, activeGate = 'JOINING') {
  if (!aggregate?.requirements || !Array.isArray(aggregate.requirements)) {
    return [];
  }

  const readiness = aggregate.gate_readiness;
  const activeBlockers = readiness?.active_blockers || [];
  const activeBlockerMap = new Map(activeBlockers.map((b) => [b.requirement_id, b]));
  const targetGate = readiness?.gate || activeGate || 'JOINING';
  const gateDisplay = targetGate.toLowerCase();

  const attentionCandidates = [];

  for (const req of aggregate.requirements) {
    // Strictly exclude verified items
    if (req.state === 'VERIFIED') {
      continue;
    }

    const isBlocker = activeBlockerMap.has(req.id);
    const blockerMeta = activeBlockerMap.get(req.id);

    let priority = 5;
    let statusLabel = '';
    let reason = '';

    if (isBlocker) {
      priority = 1;
      statusLabel = `${formatStateLabel(req.state)} · blocks ${gateDisplay}`;
      reason =
        blockerMeta?.reason ||
        `${req.title} is missing and required before ${targetGate} clearance.`;
    } else if (req.state === 'NEEDS_VERIFICATION') {
      priority = 2;
      statusLabel = 'Needs verification';
      reason = 'Extraction ambiguity requires human certification.';
    } else if (req.state === 'REJECTED') {
      priority = 3;
      statusLabel = 'Rejected';
      reason = req.rejection_reason || 'Evidence was rejected; new submission required.';
    } else if (req.state === 'IN_PROGRESS') {
      priority = 4;
      statusLabel = 'In progress';
      reason = 'Requirement requested; awaiting evidence attachment.';
    } else if (req.state === 'EVIDENCE_RECEIVED') {
      priority = 4;
      statusLabel = 'Evidence received';
      reason = 'Evidence attached; awaiting reviewer verification.';
    } else {
      priority = 5;
      statusLabel = 'Missing';
      reason = 'No evidence uploaded or requested.';
    }

    attentionCandidates.push({
      id: req.id,
      code: req.code,
      title: req.title,
      state: req.state,
      isBlocker,
      priority,
      statusLabel,
      reason,
      blockingStages: req.blocking_stages || [],
      detailUrl: `/requirements?detail=${encodeURIComponent(req.id)}`,
    });
  }

  // Sort by priority ascending, then by requirement code
  return attentionCandidates.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return (a.code || '').localeCompare(b.code || '');
  });
}

/**
 * Flattens and extracts recent transition events across all requirements.
 * Sorts in descending chronological order (newest first).
 */
export function deriveRecentActivityEvents(aggregate, limit = 5) {
  if (!aggregate?.requirements || !Array.isArray(aggregate.requirements)) {
    return [];
  }

  const allEvents = [];
  for (const req of aggregate.requirements) {
    const events = req.transition_events || [];
    for (const ev of events) {
      const actionPresentation = formatAuditAction(ev.action);
      allEvents.push({
        id: ev.id,
        action: ev.action,
        actionLabel: actionPresentation.label,
        actionBadgeClass: actionPresentation.badgeClass,
        fromState: ev.from_state || ev.previous_state,
        toState: ev.to_state || ev.new_state,
        actor: ev.actor || 'System',
        createdAt: ev.created_at,
        formattedTimestamp: formatEventTimestamp(ev.created_at),
        metadata: ev.metadata,
        requirementId: req.id,
        requirementCode: req.code,
        requirementTitle: req.title,
      });
    }
  }

  // Sort descending (newest first)
  allEvents.sort((a, b) => {
    const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tB - tA;
  });

  return allEvents.slice(0, limit);
}
