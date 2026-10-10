/**
 * Pure state derivation helper for ReadinessBanner.
 * Evaluates readiness state strictly from backend aggregate data without
 * calculating or duplicating business logic.
 */

export function deriveReadinessViewModel(aggregate, activeGate = 'JOINING', selectedRequirementId = null) {
  const readiness = aggregate?.gate_readiness;
  const targetGate = readiness?.gate || activeGate || 'JOINING';
  const hasData = Boolean(aggregate && readiness);
  const isReady = hasData && Boolean(readiness.is_ready);
  const activeBlockers = readiness?.active_blockers || [];
  const blockingTotal = readiness?.blocking_total;
  const blockingSatisfied = readiness?.blocking_satisfied;

  let state = 'PENDING';
  let badgeLabel = 'READINESS PENDING';
  let message = 'Awaiting gate readiness evaluation from the backend.';

  if (hasData) {
    if (isReady) {
      state = 'READY';
      badgeLabel = 'STAGE READY';
      message = 'All criteria blocking this stage are verified. Ready for institutional sign-off.';
    } else {
      state = 'NOT_READY';
      badgeLabel = 'STAGE NOT READY';
      message = `${activeBlockers.length} unresolved requirement${
        activeBlockers.length === 1 ? ' is' : 's are'
      } blocking clearance for the ${targetGate} stage gate.`;
    }
  }

  // Format blockers with selection metadata
  const formattedBlockers = activeBlockers.map((b) => ({
    ...b,
    isSelected: selectedRequirementId === b.requirement_id,
  }));

  return {
    state, // 'PENDING' | 'READY' | 'NOT_READY'
    targetGate,
    badgeLabel,
    message,
    isReady,
    hasData,
    activeBlockers: formattedBlockers,
    blockerCount: activeBlockers.length,
    blockingTotal,
    blockingSatisfied,
  };
}
