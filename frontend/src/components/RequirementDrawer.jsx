import React, { useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useApplication } from '../context';
import RequirementInspector from './RequirementInspector';

/**
 * RequirementDrawer Component
 * Shared, accessible detail drawer available across all four routes:
 * - /overview
 * - /requirements
 * - /readiness
 * - /action-plan
 *
 * Capabilities:
 * - Smooth slide-in presentation over the active route
 * - Dismissible via Close button, Backdrop click, and Escape key
 * - Synchronizes with URL query param `?detail=ID_OR_CODE`
 * - Preserves browser Back/Forward history
 * - Supports direct deep linking
 */
export function RequirementDrawer() {
  const {
    aggregate,
    selectedRequirementId,
    setSelectedRequirementId,
    selectedRequirement,
  } = useApplication();

  const [searchParams, setSearchParams] = useSearchParams();
  const detailParam = searchParams.get('detail');
  const isClosingRef = useRef(false);

  // Close handler: immediately removes detail param and clears selection without resurrection
  const handleClose = useCallback(() => {
    isClosingRef.current = true;
    setSelectedRequirementId(null);
    const nextParams = new URLSearchParams(searchParams);
    if (nextParams.has('detail')) {
      nextParams.delete('detail');
      setSearchParams(nextParams, { replace: true });
    }
  }, [setSelectedRequirementId, searchParams, setSearchParams]);

  // 1. Synchronize URL query param -> selectedRequirementId
  useEffect(() => {
    if (isClosingRef.current) {
      if (!detailParam) {
        isClosingRef.current = false;
      }
      return;
    }

    if (!detailParam) {
      // If URL has no detail param and drawer is open, close it (e.g. browser back button)
      if (selectedRequirementId) {
        setSelectedRequirementId(null);
      }
      return;
    }

    if (!aggregate?.requirements) return;

    // Search by ID or Code (e.g. 'FSSAI-REQ-07')
    const match = aggregate.requirements.find(
      (r) => r.id === detailParam || r.code === detailParam
    );

    if (match) {
      if (match.id !== selectedRequirementId) {
        setSelectedRequirementId(match.id);
      }
    } else {
      // Clean up stale or unrecognized detail query parameter
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('detail');
      setSearchParams(nextParams, { replace: true });
    }
  }, [detailParam, aggregate?.requirements, selectedRequirementId, searchParams, setSearchParams, setSelectedRequirementId]);

  // 2. Synchronize in-app selectedRequirement -> URL query param
  useEffect(() => {
    if (isClosingRef.current) return;

    if (selectedRequirement) {
      const targetParam = selectedRequirement.code || selectedRequirement.id;
      if (detailParam !== targetParam) {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('detail', targetParam);
        setSearchParams(nextParams, { replace: false });
      }
    }
  }, [selectedRequirement, detailParam, searchParams, setSearchParams]);

  // Escape key listener
  useEffect(() => {
    if (!selectedRequirementId) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRequirementId, handleClose]);

  return (
    <AnimatePresence>
      {selectedRequirementId && selectedRequirement ? (
        <div className="drawer-overlay" role="presentation">
          {/* 1. Backdrop for click-outside dismissal */}
          <motion.div
            className="drawer-backdrop"
            onClick={handleClose}
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          {/* 2. Sliding Drawer Panel */}
          <motion.aside
            className="drawer-panel"
            role="dialog"
            aria-modal="true"
            aria-label={`Requirement Details: ${selectedRequirement.code} - ${selectedRequirement.title}`}
            data-testid="requirement-detail-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <RequirementInspector onClose={handleClose} />
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

export default RequirementDrawer;
