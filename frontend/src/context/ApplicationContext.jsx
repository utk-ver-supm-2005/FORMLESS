import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { apiClient } from '../api/client';
import { DEFAULT_STAGE_GATE, INGESTION_STATES } from './constants';
import { ApplicationContext } from './context';

export function ApplicationProvider({ children }) {
  // Authoritative read model returned by backend
  const [aggregate, setAggregate] = useState(null);

  // Active Stage Gate: default is canonical 'JOINING'
  const [activeGate, setActiveGate] = useState(DEFAULT_STAGE_GATE);

  // Currently inspected requirement ID (for detail drawer/inspector)
  const [selectedRequirementId, setSelectedRequirementId] = useState(null);

  // Loading & mutation states
  const [loading, setLoading] = useState(true);
  const [mutationPending, setMutationPending] = useState(false);
  const [error, setError] = useState(null);

  // Honest Ingestion State Machine
  const [ingestionState, setIngestionState] = useState(INGESTION_STATES.IDLE);
  const [selectedPolicyFile, setSelectedPolicyFile] = useState(null);
  const [ingestionError, setIngestionError] = useState(null);
  const [ingestionResult, setIngestionResult] = useState(null);
  const [ingestionElapsedSeconds, setIngestionElapsedSeconds] = useState(0);
  const [isIngestionModalOpen, setIsIngestionModalOpen] = useState(false);

  // Stopwatch timer ref
  const timerRef = useRef(null);

  // Manage elapsed timer during long-running ingestion
  useEffect(() => {
    if (ingestionState === INGESTION_STATES.PROCESSING_POLICY || ingestionState === INGESTION_STATES.UPLOADING) {
      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          setIngestionElapsedSeconds((prev) => prev + 1);
        }, 1000);
      }
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [ingestionState]);

  // Derived selected requirement object from authoritative aggregate
  const selectedRequirement = useMemo(() => {
    if (!aggregate?.requirements || !selectedRequirementId) {
      return null;
    }
    return aggregate.requirements.find((r) => r.id === selectedRequirementId) || null;
  }, [aggregate, selectedRequirementId]);

  /**
   * Resets the environment to the canonical 8-requirement FSSAI internship baseline.
   * On success, directly sets aggregate from response.aggregate.
   */
  const resetFssai = useCallback(async (gateOverride) => {
    const targetGate = gateOverride || activeGate;
    setMutationPending(true);
    setError(null);
    try {
      const res = await apiClient.resetFssai(targetGate);
      if (res?.aggregate) {
        setAggregate(res.aggregate);
        setSelectedRequirementId(null);
      }
      return res;
    } catch (err) {
      const msg = err.message || 'Failed to reset canonical FSSAI demo scenario.';
      setError(msg);
      throw err;
    } finally {
      setMutationPending(false);
    }
  }, [activeGate]);

  /**
   * Fetches fresh aggregate for current or specified application ID.
   */
  const refreshAggregate = useCallback(async (applicationId, gateOverride) => {
    const targetAppId = applicationId || aggregate?.application?.id;
    if (!targetAppId) return;

    const targetGate = gateOverride || activeGate;
    setMutationPending(true);
    setError(null);
    try {
      const res = await apiClient.getApplicationAggregate(targetAppId, targetGate);
      if (res) {
        setAggregate(res);
      }
      return res;
    } catch (err) {
      const msg = err.message || 'Failed to refresh application aggregate.';
      setError(msg);
      throw err;
    } finally {
      setMutationPending(false);
    }
  }, [aggregate, activeGate]);

  /**
   * Switches active stage gate and retrieves updated readiness read model.
   */
  const changeGate = useCallback(async (newGate) => {
    setActiveGate(newGate);
    if (aggregate?.application?.id) {
      setMutationPending(true);
      try {
        const res = await apiClient.getApplicationAggregate(aggregate.application.id, newGate);
        if (res) {
          setAggregate(res);
        }
      } catch (err) {
        setError(err.message || `Failed to evaluate gate readiness for ${newGate}.`);
      } finally {
        setMutationPending(false);
      }
    }
  }, [aggregate]);

  /**
   * Action 1: Request Requirement (MISSING -> IN_PROGRESS).
   */
  const requestRequirement = useCallback(async (requirementId, actor, notes) => {
    setMutationPending(true);
    setError(null);
    try {
      const res = await apiClient.requestRequirement(requirementId, actor, notes, activeGate);
      if (res?.aggregate) {
        setAggregate(res.aggregate);
      }
      return res;
    } catch (err) {
      const msg = err.message || 'Failed to request requirement.';
      setError(msg);
      throw err;
    } finally {
      setMutationPending(false);
    }
  }, [activeGate]);

  /**
   * Action 2: Upload Evidence (IN_PROGRESS/MISSING/REJECTED -> EVIDENCE_RECEIVED).
   */
  const uploadEvidence = useCallback(async (requirementId, file, actor, notes) => {
    setMutationPending(true);
    setError(null);
    try {
      const res = await apiClient.uploadEvidence(requirementId, file, actor, notes, activeGate);
      if (res?.aggregate) {
        setAggregate(res.aggregate);
      }
      return res;
    } catch (err) {
      const msg = err.message || 'Failed to upload evidence.';
      setError(msg);
      throw err;
    } finally {
      setMutationPending(false);
    }
  }, [activeGate]);

  /**
   * Action 3: Verify Requirement (EVIDENCE_RECEIVED/NEEDS_VERIFICATION -> VERIFIED).
   */
  const verifyRequirement = useCallback(async (requirementId, actor, notes) => {
    setMutationPending(true);
    setError(null);
    try {
      const res = await apiClient.verifyRequirement(requirementId, actor, notes, activeGate);
      if (res?.aggregate) {
        setAggregate(res.aggregate);
      }
      return res;
    } catch (err) {
      const msg = err.message || 'Failed to verify requirement.';
      setError(msg);
      throw err;
    } finally {
      setMutationPending(false);
    }
  }, [activeGate]);

  /**
   * Action 4: Reject Requirement (EVIDENCE_RECEIVED/NEEDS_VERIFICATION -> REJECTED).
   */
  const rejectRequirement = useCallback(async (requirementId, reason, actor, notes) => {
    setMutationPending(true);
    setError(null);
    try {
      const res = await apiClient.rejectRequirement(requirementId, reason, actor, notes, activeGate);
      if (res?.aggregate) {
        setAggregate(res.aggregate);
      }
      return res;
    } catch (err) {
      const msg = err.message || 'Failed to reject requirement.';
      setError(msg);
      throw err;
    } finally {
      setMutationPending(false);
    }
  }, [activeGate]);

  /**
   * Fetches transition event audit trail for selected requirement.
   */
  const fetchRequirementEvents = useCallback(async (requirementId) => {
    try {
      return await apiClient.getRequirementEvents(requirementId);
    } catch (err) {
      setError(err.message || 'Failed to load requirement audit events.');
      throw err;
    }
  }, []);

  /**
   * File selection for Policy Ingestion Modal.
   */
  const selectPolicyFile = useCallback((file) => {
    if (!file) {
      setSelectedPolicyFile(null);
      setIngestionState(INGESTION_STATES.IDLE);
      return;
    }
    setSelectedPolicyFile(file);
    setIngestionError(null);
    setIngestionState(INGESTION_STATES.UPLOAD_SELECTED);
  }, []);

  /**
   * Clears selected policy file and resets ingestion state to IDLE.
   */
  const clearPolicyFile = useCallback(() => {
    setSelectedPolicyFile(null);
    setIngestionError(null);
    setIngestionState(INGESTION_STATES.IDLE);
    setIngestionElapsedSeconds(0);
  }, []);

  /**
   * Executes policy ingestion via Gemini 3.8 Flash, managing honest state transitions.
   */
  const ingestPolicy = useCallback(async (file, applicantContextId = 'demo_applicant_01') => {
    // Prevent duplicate simultaneous submissions
    if (
      ingestionState === INGESTION_STATES.UPLOADING ||
      ingestionState === INGESTION_STATES.PROCESSING_POLICY
    ) {
      return;
    }

    const targetFile = file || selectedPolicyFile;
    if (!targetFile) {
      setIngestionState(INGESTION_STATES.ERROR);
      setIngestionError('No policy document selected for ingestion.');
      return;
    }

    setIngestionError(null);
    setIngestionElapsedSeconds(0);
    setIngestionState(INGESTION_STATES.UPLOADING);

    try {
      // Transition to PROCESSING_POLICY when HTTP request is sent
      setIngestionState(INGESTION_STATES.PROCESSING_POLICY);
      const res = await apiClient.ingestPolicy(targetFile, applicantContextId, activeGate);

      if (res?.aggregate) {
        setAggregate(res.aggregate);
        setSelectedRequirementId(null);
      }

      setIngestionResult({
        status: res.status,
        extraction_source: res.extraction_source,
        model_used: res.model_used,
        extracted_policy: res.extracted_policy,
        policy_document: res.policy_document,
        application: res.application,
      });

      setIngestionState(INGESTION_STATES.COMPLETE);
      return res;
    } catch (err) {
      setIngestionState(INGESTION_STATES.ERROR);
      const msg = err.message || 'Policy analysis failed.';
      setIngestionError(msg);
      throw err;
    }
  }, [selectedPolicyFile, activeGate, ingestionState]);

  /**
   * Resets the ingestion modal state back to IDLE.
   */
  const resetIngestionState = useCallback(() => {
    setIngestionState(INGESTION_STATES.IDLE);
    setSelectedPolicyFile(null);
    setIngestionError(null);
    setIngestionResult(null);
    setIngestionElapsedSeconds(0);
  }, []);

  /**
   * Ingestion Modal visibility controls
   */
  const openIngestionModal = useCallback(() => {
    setIsIngestionModalOpen(true);
  }, []);

  const closeIngestionModal = useCallback(() => {
    if (
      ingestionState === INGESTION_STATES.UPLOADING ||
      ingestionState === INGESTION_STATES.PROCESSING_POLICY
    ) {
      return false;
    }
    setIsIngestionModalOpen(false);
    if (ingestionState === INGESTION_STATES.COMPLETE) {
      resetIngestionState();
    }
    return true;
  }, [ingestionState, resetIngestionState]);

  /**
   * Retries ingestion with previously selected file
   */
  const retryIngestion = useCallback(async () => {
    if (selectedPolicyFile) {
      return await ingestPolicy(selectedPolicyFile);
    }
  }, [selectedPolicyFile, ingestPolicy]);

  /**
   * Clears active general error banner.
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initialization: Verify backend health and seed canonical FSSAI baseline
  useEffect(() => {
    let isMounted = true;

    async function initializeApplication() {
      setLoading(true);
      setError(null);
      try {
        const health = await apiClient.health();
        if (!isMounted) return;

        if (health?.status === 'healthy') {
          // Initialize baseline read model for canonical FSSAI demo
          const resetRes = await apiClient.resetFssai(DEFAULT_STAGE_GATE);
          if (isMounted && resetRes?.aggregate) {
            setAggregate(resetRes.aggregate);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err.message ||
              'Unable to connect to FORMLESS compliance backend. Please ensure the server is running on port 8000.'
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initializeApplication();

    return () => {
      isMounted = false;
    };
  }, []);

  const value = {
    // Authoritative Aggregate Read Model
    aggregate,
    activeGate,
    changeGate,
    setActiveGate,

    // Requirement selection
    selectedRequirementId,
    setSelectedRequirementId,
    selectedRequirement,

    // Status flags
    loading,
    mutationPending,
    error,
    clearError,

    // State mutations (Always replace aggregate from backend response)
    resetFssai,
    refreshAggregate,
    requestRequirement,
    uploadEvidence,
    verifyRequirement,
    rejectRequirement,
    fetchRequirementEvents,

    // Evidence helpers
    getEvidenceDownloadUrl: (id) => apiClient.getEvidenceDownloadUrl(id),

    // Ingestion state machine & modal controls
    ingestionState,
    setIngestionState,
    selectedPolicyFile,
    selectPolicyFile,
    clearPolicyFile,
    ingestionError,
    ingestionResult,
    ingestionElapsedSeconds,
    ingestPolicy,
    resetIngestionState,
    isIngestionModalOpen,
    openIngestionModal,
    closeIngestionModal,
    retryIngestion,
  };

  return (
    <ApplicationContext.Provider value={value}>
      {children}
    </ApplicationContext.Provider>
  );
}

export default ApplicationProvider;
