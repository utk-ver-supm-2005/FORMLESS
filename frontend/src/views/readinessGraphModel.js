import { isRequirementActiveBlocker } from '../components/matrixModel.js';

/**
 * Pure Selector for the Interactive Readiness Map Graph
 * Derives nodes and edges strictly from authoritative ApplicationContext aggregate.
 *
 * Visual Columns:
 * Column 1 (x: 40): Policy Document (Origin)
 * Column 2 (x: 340): Institutional Requirements (Matrix criteria)
 * Column 3 (x: 740): Attached Evidence (Traceability documents)
 * Column 4 (x: 1040): Institutional Stage Gates (Target clearances)
 */
export function deriveReadinessGraph(aggregate, activeGate = 'JOINING') {
  if (!aggregate || !aggregate.requirements || aggregate.requirements.length === 0) {
    return {
      nodes: [],
      edges: [],
      hasData: false,
    };
  }

  const requirements = aggregate.requirements;
  const gateReadiness = aggregate.gate_readiness || null;
  const dependencies = aggregate.dependencies || [];
  const policyDoc = aggregate.policy_document || {
    id: 'doc-origin',
    title: 'FSSAI Internship Scheme Circular 2026',
    document_type: 'POLICY_PDF',
  };

  const nodes = [];
  const edges = [];

  // Calculate layout vertical spacing
  const rowHeight = 100;
  const totalHeight = Math.max(requirements.length * rowHeight, 400);

  // 1. Column 1: Policy Document Node (Root)
  const policyNodeId = 'node-policy';
  nodes.push({
    id: policyNodeId,
    type: 'policyNode',
    position: { x: 40, y: totalHeight / 2 - 50 },
    data: {
      id: policyDoc.id,
      title: policyDoc.title || 'Institutional Policy Document',
      docType: policyDoc.document_type || 'POLICY_PDF',
      isDemoSeed: Boolean(policyDoc.is_demo_seed),
    },
  });

  // Track evidence items for Column 3
  const evidenceMap = new Map();

  // 2. Column 2: Requirement Nodes
  requirements.forEach((req, idx) => {
    const isBlocker = isRequirementActiveBlocker(req, gateReadiness);
    const yPos = idx * rowHeight + 40;

    nodes.push({
      id: req.id,
      type: 'requirementNode',
      position: { x: 340, y: yPos },
      data: {
        id: req.id,
        code: req.code,
        title: req.title,
        state: req.state,
        category: req.category,
        verificationMode: req.verification_mode,
        isBlocker,
        hasCitation: Boolean(req.source_citation),
        evidenceCount: req.evidence_links?.length || 0,
      },
    });

    // Structural Edge: Policy -> Requirement
    edges.push({
      id: `edge-policy-${req.id}`,
      source: policyNodeId,
      target: req.id,
      type: 'smoothstep',
      style: {
        stroke: '#D4D4D8',
        strokeWidth: 1.5,
      },
    });

    // Evidence records (Column 3)
    if (req.evidence_links && req.evidence_links.length > 0) {
      req.evidence_links.forEach((link, linkIdx) => {
        const evId = link.evidence_id || link.id || `ev-${req.id}-${linkIdx}`;
        if (!evidenceMap.has(evId)) {
          evidenceMap.set(evId, {
            id: evId,
            fileName: link.file_name || 'Evidence Attachment',
            sourceReqId: req.id,
            yPos: yPos + linkIdx * 45,
          });
        }

        // Edge: Requirement -> Evidence
        edges.push({
          id: `edge-req-${req.id}-ev-${evId}`,
          source: req.id,
          target: evId,
          type: 'smoothstep',
          style: {
            stroke: '#2563EB',
            strokeWidth: 1.5,
          },
        });
      });
    }
  });

  // Add Evidence Nodes to graph
  evidenceMap.forEach((ev) => {
    nodes.push({
      id: ev.id,
      type: 'evidenceNode',
      position: { x: 740, y: ev.yPos },
      data: {
        id: ev.id,
        fileName: ev.fileName,
      },
    });
  });

  // 3. Genuine Prerequisite Dependency Edges (strictly backend-derived)
  dependencies.forEach((dep) => {
    if (dep.prerequisite_id && dep.dependent_id) {
      edges.push({
        id: `edge-dep-${dep.id || `${dep.prerequisite_id}-${dep.dependent_id}`}`,
        source: dep.prerequisite_id,
        target: dep.dependent_id,
        type: 'smoothstep',
        animated: true,
        style: {
          stroke: '#E11D48',
          strokeWidth: 2,
          strokeDasharray: '4 4',
        },
        label: 'Prerequisite',
      });
    }
  });

  // 4. Column 4: Institutional Stage Gates
  const knownGates = [
    { key: 'APPLICATION_SUBMISSION', label: 'Application Submission' },
    { key: 'VERIFICATION', label: 'Verification Gate' },
    { key: 'JOINING', label: 'Joining Gate' },
    { key: 'ONBOARDING', label: 'Onboarding Gate' },
  ];

  const gateXPos = evidenceMap.size > 0 ? 1040 : 800;

  knownGates.forEach((g, gIdx) => {
    const gateNodeId = `gate-${g.key}`;
    const isCurrentActive = g.key === activeGate;
    const isReady = isCurrentActive ? Boolean(gateReadiness?.is_ready) : false;
    const hasActiveBlockers = isCurrentActive && (gateReadiness?.blocking_unresolved || 0) > 0;

    nodes.push({
      id: gateNodeId,
      type: 'stageGateNode',
      position: { x: gateXPos, y: gIdx * 120 + 70 },
      data: {
        key: g.key,
        label: g.label,
        isCurrent: isCurrentActive,
        isReady,
        hasBlockers: hasActiveBlockers,
        blockerCount: isCurrentActive ? gateReadiness?.blocking_unresolved || 0 : 0,
      },
    });

    // Edges from requirements to the gates they block
    requirements.forEach((req) => {
      const blocksThisGate = req.blocking_stages?.includes(g.key);
      if (blocksThisGate) {
        const isBlocker = isRequirementActiveBlocker(req, gateReadiness);
        edges.push({
          id: `edge-${req.id}-${gateNodeId}`,
          source: req.id,
          target: gateNodeId,
          type: 'smoothstep',
          style: {
            stroke: isBlocker ? '#E11D48' : '#A1A1AA',
            strokeWidth: isBlocker ? 2 : 1.25,
            strokeDasharray: isBlocker ? '4 2' : undefined,
          },
        });
      }
    });
  });

  return {
    nodes,
    edges,
    hasData: true,
    totalRequirements: requirements.length,
    activeGate,
  };
}

export default deriveReadinessGraph;
