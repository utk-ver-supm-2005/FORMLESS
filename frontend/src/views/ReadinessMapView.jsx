import React, { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useApplication } from '../context';
import { deriveReadinessGraph } from './readinessGraphModel';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';

// ---------------------------------------------------------------------------
// 1. Custom Node: Policy Document (Origin)
// ---------------------------------------------------------------------------
function PolicyNode({ data }) {
  return (
    <div className="flow-node flow-node-policy">
      <div className="node-icon-header">
        <span className="node-kicker">POLICY ORIGIN</span>
      </div>
      <h4 className="node-title">{data.title}</h4>
      <span className="node-meta-pill">{data.docType}</span>
      <Handle type="source" position={Position.Right} className="flow-handle" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Custom Node: Requirement (Matrix Criteria)
// ---------------------------------------------------------------------------
function RequirementNode({ data }) {
  return (
    <div
      className={`flow-node flow-node-requirement ${
        data.isBlocker ? 'is-active-blocker' : ''
      } state-${data.state.toLowerCase()}`}
      data-requirement-id={data.id}
    >
      <Handle type="target" position={Position.Left} className="flow-handle" />

      <div className="node-top-row">
        <span className="node-code">{data.code}</span>
        <StatusBadge state={data.state} />
      </div>

      <h4 className="node-req-title">{data.title}</h4>

      <div className="node-bottom-row">
        {data.isBlocker && (
          <span className="node-blocker-pill">Blocks Gate</span>
        )}
        <span className="node-action-hint">Click to inspect →</span>
      </div>

      <Handle type="source" position={Position.Right} className="flow-handle" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. Custom Node: Evidence Document (Attachment)
// ---------------------------------------------------------------------------
function EvidenceNode({ data }) {
  return (
    <div className="flow-node flow-node-evidence">
      <Handle type="target" position={Position.Left} className="flow-handle" />
      <span className="node-kicker">ATTACHED EVIDENCE</span>
      <h4 className="node-title node-file-title">{data.fileName}</h4>
      <span className="node-verified-pill">✓ Linked Document</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. Custom Node: Institutional Stage Gate
// ---------------------------------------------------------------------------
function StageGateNode({ data }) {
  return (
    <div
      className={`flow-node flow-node-gate ${
        data.isCurrent ? 'is-current-gate' : ''
      } ${data.isReady ? 'gate-ready' : data.hasBlockers ? 'gate-blocked' : ''}`}
    >
      <Handle type="target" position={Position.Left} className="flow-handle" />
      <span className="node-kicker">
        {data.isCurrent ? 'TARGET GATE' : 'INSTITUTIONAL GATE'}
      </span>
      <h4 className="node-gate-title">{data.label}</h4>

      <div className="node-gate-status">
        {data.isReady ? (
          <span className="gate-status-pill pill-ready">✓ Gate Cleared</span>
        ) : data.hasBlockers ? (
          <span className="gate-status-pill pill-blocked">
            Blocked ({data.blockerCount})
          </span>
        ) : (
          <span className="gate-status-pill pill-neutral">Pending</span>
        )}
      </div>
    </div>
  );
}

const NODE_TYPES = {
  policyNode: PolicyNode,
  requirementNode: RequirementNode,
  evidenceNode: EvidenceNode,
  stageGateNode: StageGateNode,
};

/**
 * ReadinessMapView Component (/readiness)
 * Interactive visual graph representing the relationships between:
 * Policy -> Requirements -> Evidence -> Stage Gates
 */
export function ReadinessMapView() {
  const { aggregate, activeGate, setSelectedRequirementId, loading } = useApplication();

  const graphData = useMemo(
    () => deriveReadinessGraph(aggregate, activeGate),
    [aggregate, activeGate]
  );

  const handleNodeClick = useCallback(
    (event, node) => {
      if (node.type === 'requirementNode') {
        setSelectedRequirementId(node.data.id);
      }
    },
    [setSelectedRequirementId]
  );

  if (loading && !aggregate) {
    return (
      <div className="readiness-map-page" role="region" aria-label="Readiness Map">
        <div className="graph-loading-state">
          <div className="spinner-indicator" aria-hidden="true" />
          <p className="empty-title">Loading readiness graph...</p>
          <span className="empty-sub">Connecting policy citations and criteria verification pathways</span>
        </div>
      </div>
    );
  }

  if (!graphData.hasData) {
    return (
      <div className="readiness-map-page" role="region" aria-label="Readiness Map">
        <EmptyState
          title="No readiness graph data available"
          description="Upload an institutional guideline PDF or reset demo baseline to generate the compliance map."
          className="graph-empty-wrap"
        />
      </div>
    );
  }

  return (
    <div className="readiness-map-page" role="region" aria-label="Interactive Readiness Map">
      {/* 1. Header with Breadcrumbs and Legend */}
      <header className="readiness-map-header">
        <div className="page-header-text">
          <span className="page-kicker">
            DEPENDENCY TRACEABILITY · STAGE GATE: {activeGate}
          </span>
          <h1 className="page-headline">Interactive Readiness Map</h1>
          <p className="page-description">
            Visual compliance graph tracing institutional policy guidelines through
            atomic criteria, applicant evidence, and target gate certification.
          </p>
        </div>

        {/* Legend */}
        <div className="graph-legend" aria-label="Graph Status Legend">
          <span className="legend-item">
            <span className="legend-dot dot-verified" /> Verified
          </span>
          <span className="legend-item">
            <span className="legend-dot dot-needs-verification" /> Review
          </span>
          <span className="legend-item">
            <span className="legend-dot dot-missing" /> Blocker
          </span>
          <span className="legend-item">
            <span className="legend-line line-dep" /> Prerequisite
          </span>
        </div>
      </header>

      {/* 2. Interactive Flow Canvas */}
      <div className="readiness-flow-container" data-testid="readiness-flow-canvas">
        <ReactFlow
          nodes={graphData.nodes}
          edges={graphData.edges}
          nodeTypes={NODE_TYPES}
          onNodeClick={handleNodeClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.3}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#E4E4E7" gap={24} size={1} />
          <Controls showInteractive={false} className="flow-controls-custom" />
          <MiniMap
            nodeColor={(n) => {
              if (n.type === 'stageGateNode') return '#18181B';
              if (n.type === 'requirementNode') {
                if (n.data?.isBlocker) return '#E11D48';
                if (n.data?.state === 'VERIFIED') return '#059669';
                if (n.data?.state === 'NEEDS_VERIFICATION') return '#D97706';
                return '#A1A1AA';
              }
              return '#F4F4F5';
            }}
            className="flow-minimap-custom"
          />
        </ReactFlow>
      </div>
    </div>
  );
}

export default ReadinessMapView;
