/**
 * FORMLESS Compliance Engine API Client
 *
 * Centralized fetch-based HTTP client communicating exclusively with the
 * FORMLESS backend at /api/v1. Never exposes or handles GEMINI_API_KEY.
 * Adheres to the single-source-of-truth architecture: backend returns the
 * complete updated aggregate on each mutation.
 */

export const MAX_POLICY_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_EVIDENCE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_EVIDENCE_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
];

export const ALLOWED_EVIDENCE_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg'];

export class ApiError extends Error {
  constructor(message, status = 0, detail = null, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
    this.data = data;
  }
}

/**
 * Normalizes error responses from FastAPI / network into clean human-readable ApiError.
 */
function parseErrorDetail(errorData, fallbackMessage) {
  if (!errorData) {
    return fallbackMessage;
  }
  if (typeof errorData.detail === 'string') {
    return errorData.detail;
  }
  if (Array.isArray(errorData.detail)) {
    // Pydantic / FastAPI validation error array
    const msgs = errorData.detail
      .map((item) => (item.msg ? `${item.loc?.join('.') || 'field'}: ${item.msg}` : JSON.stringify(item)))
      .join('; ');
    return msgs || fallbackMessage;
  }
  if (errorData.message && typeof errorData.message === 'string') {
    return errorData.message;
  }
  return fallbackMessage;
}

/**
 * Validates policy file format and size constraint (up to 50 MB, PDF only, >0 bytes).
 */
export function validatePolicyFile(file) {
  if (!file) {
    return { valid: false, error: 'No policy document file provided.' };
  }
  if (file.size === 0) {
    return { valid: false, error: 'Policy document file is empty (0 bytes).' };
  }
  if (file.size > MAX_POLICY_SIZE_BYTES) {
    const mbSize = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Policy document exceeds maximum limit of 50 MB (file is ${mbSize} MB).`,
    };
  }
  const isPdfType = file.type === 'application/pdf';
  const hasPdfExt = (file.name || '').toLowerCase().endsWith('.pdf');
  if (!isPdfType && !hasPdfExt) {
    return {
      valid: false,
      error: 'Policy document must be a PDF file (.pdf).',
    };
  }
  return { valid: true, error: null };
}

export class ApiClient {
  constructor(baseUrl = '/api/v1') {
    this.baseUrl = baseUrl;
  }

  /**
   * Internal request dispatcher with robust JSON/FormData handling and error extraction.
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers = { ...options.headers };

    // Set JSON header only when body is not FormData
    if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    let response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (networkError) {
      throw new ApiError(
        'Unable to connect to FORMLESS compliance backend. Please ensure the server is running on port 8000.',
        0,
        networkError.message
      );
    }

    // Try parsing JSON response
    const contentType = response.headers.get('content-type') || '';
    let responseData = null;
    if (contentType.includes('application/json')) {
      try {
        responseData = await response.json();
      } catch {
        responseData = null;
      }
    } else {
      try {
        responseData = await response.text();
      } catch {
        responseData = null;
      }
    }

    if (!response.ok) {
      const fallbackMsg = `Request failed with status ${response.status} (${response.statusText || 'Error'})`;
      const detail = parseErrorDetail(responseData, fallbackMsg);
      throw new ApiError(detail, response.status, detail, responseData);
    }

    return responseData;
  }

  /**
   * Health Check: Verifies backend liveness and active model configuration.
   * GET /api/v1/health
   */
  async health() {
    return this.request('/health', { method: 'GET' });
  }

  /**
   * Authenticate user credentials against the FORMLESS backend.
   * POST /api/v1/auth/login
   */
  async login(username, password) {
    if (!username || !password) {
      throw new ApiError('Username and password are required.', 400);
    }
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: username.trim(),
        password: password.trim(),
      }),
    });
  }

  /**
   * Introspect authentication providers and configuration.
   * GET /api/v1/auth/status
   */
  async getAuthStatus() {
    return this.request('/auth/status', { method: 'GET' });
  }

  /**
   * Reset Demo Baseline: Resets SQLite database to the canonical 8-requirement
   * FSSAI internship baseline.
   * POST /api/v1/demo/reset-fssai?gate={gate}
   */
  async resetFssai(gate = 'JOINING') {
    const query = new URLSearchParams({ gate });
    return this.request(`/demo/reset-fssai?${query.toString()}`, {
      method: 'POST',
    });
  }

  /**
   * Application Aggregate: Primary read model returning complete state.
   * GET /api/v1/applications/{applicationId}/aggregate?gate={gate}
   */
  async getApplicationAggregate(applicationId, gate = 'JOINING') {
    if (!applicationId) {
      throw new ApiError('Application ID is required to retrieve aggregate state.', 400);
    }
    const query = new URLSearchParams({ gate });
    return this.request(`/applications/${applicationId}/aggregate?${query.toString()}`, {
      method: 'GET',
    });
  }

  /**
   * Ingest Policy Document: Uploads PDF (up to 50 MB) for Gemini extraction
   * and multi-stage normalization.
   * POST /api/v1/documents/ingest?gate={gate}
   */
  async ingestPolicy(file, applicantContextId = 'demo_applicant_01', gate = 'JOINING') {
    const validation = validatePolicyFile(file);
    if (!validation.valid) {
      throw new ApiError(validation.error, 400);
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('applicant_context_id', applicantContextId || 'demo_applicant_01');

    const query = new URLSearchParams({ gate });
    return this.request(`/documents/ingest?${query.toString()}`, {
      method: 'POST',
      body: formData,
    });
  }

  /**
   * Request Requirement: Transitions requirement state from MISSING to IN_PROGRESS.
   * POST /api/v1/requirements/{requirementId}/request?gate={gate}
   */
  async requestRequirement(requirementId, actor = 'demo_applicant_01', notes = null, gate = 'JOINING') {
    if (!requirementId) {
      throw new ApiError('Requirement ID is required.', 400);
    }
    const query = new URLSearchParams({ gate });
    return this.request(`/requirements/${requirementId}/request?${query.toString()}`, {
      method: 'POST',
      body: JSON.stringify({
        actor: actor || 'demo_applicant_01',
        notes: notes || null,
      }),
    });
  }

  /**
   * Upload Evidence: Attaches an evidence file (PDF/PNG/JPG up to 10 MB)
   * to a requirement and transitions state to EVIDENCE_RECEIVED.
   * POST /api/v1/requirements/{requirementId}/evidence?gate={gate}
   */
  async uploadEvidence(requirementId, file, actor = 'demo_applicant_01', notes = null, gate = 'JOINING') {
    if (!requirementId) {
      throw new ApiError('Requirement ID is required.', 400);
    }
    if (!file) {
      throw new ApiError('No evidence file provided.', 400);
    }

    // Validate file size limit (10 MB)
    if (file.size > MAX_EVIDENCE_SIZE_BYTES) {
      throw new ApiError(
        `Evidence file exceeds maximum limit of 10 MB (file is ${(file.size / (1024 * 1024)).toFixed(1)} MB).`,
        400
      );
    }

    // Validate MIME type / extension
    const mimeValid = ALLOWED_EVIDENCE_TYPES.includes(file.type);
    const extValid = ALLOWED_EVIDENCE_EXTENSIONS.some((ext) => (file.name || '').toLowerCase().endsWith(ext));
    if (!mimeValid && !extValid) {
      throw new ApiError('Evidence file must be a PDF, PNG, or JPG document.', 400);
    }

    const formData = new FormData();
    formData.append('file', file);
    if (actor) {
      formData.append('actor', actor);
    }
    if (notes) {
      formData.append('notes', notes);
    }

    const query = new URLSearchParams({ gate });
    return this.request(`/requirements/${requirementId}/evidence?${query.toString()}`, {
      method: 'POST',
      body: formData,
    });
  }

  /**
   * Verify Requirement: Reviews attached evidence and transitions requirement to VERIFIED.
   * POST /api/v1/requirements/{requirementId}/verify?gate={gate}
   */
  async verifyRequirement(
    requirementId,
    actor = 'Demo Reviewer Confirmation',
    notes = null,
    gate = 'JOINING'
  ) {
    if (!requirementId) {
      throw new ApiError('Requirement ID is required.', 400);
    }
    const query = new URLSearchParams({ gate });
    return this.request(`/requirements/${requirementId}/verify?${query.toString()}`, {
      method: 'POST',
      body: JSON.stringify({
        actor: actor || 'Demo Reviewer Confirmation',
        notes: notes || null,
      }),
    });
  }

  /**
   * Reject Requirement: Rejects requirement evidence with mandatory reason,
   * transitioning to REJECTED.
   * POST /api/v1/requirements/{requirementId}/reject?gate={gate}
   */
  async rejectRequirement(
    requirementId,
    reason,
    actor = 'Demo Reviewer',
    notes = null,
    gate = 'JOINING'
  ) {
    if (!requirementId) {
      throw new ApiError('Requirement ID is required.', 400);
    }
    if (!reason || !reason.trim()) {
      throw new ApiError('Rejection reason is mandatory.', 400);
    }
    const query = new URLSearchParams({ gate });
    return this.request(`/requirements/${requirementId}/reject?${query.toString()}`, {
      method: 'POST',
      body: JSON.stringify({
        reason: reason.trim(),
        actor: actor || 'Demo Reviewer',
        notes: notes || null,
      }),
    });
  }

  /**
   * Requirement Transition Events: Fetches append-only audit trail for a requirement.
   * GET /api/v1/requirements/{requirementId}/events
   */
  async getRequirementEvents(requirementId) {
    if (!requirementId) {
      throw new ApiError('Requirement ID is required.', 400);
    }
    return this.request(`/requirements/${requirementId}/events`, {
      method: 'GET',
    });
  }

  /**
   * Evidence Metadata: Fetches metadata for an evidence item.
   * GET /api/v1/evidence/{evidenceId}
   */
  async getEvidenceMetadata(evidenceId) {
    if (!evidenceId) {
      throw new ApiError('Evidence ID is required.', 400);
    }
    return this.request(`/evidence/${evidenceId}`, {
      method: 'GET',
    });
  }

  /**
   * Evidence Download URL Helper: Returns relative URL for streaming an evidence file.
   * GET /api/v1/evidence/{evidenceId}/download
   */
  getEvidenceDownloadUrl(evidenceId) {
    if (!evidenceId) return '';
    return `${this.baseUrl}/evidence/${evidenceId}/download`;
  }

  /**
   * Submit Issue / Contact Report: Submits user problem or feedback report.
   * POST /api/v1/support/issues
   *
   * @param {Object} issueData
   * @param {string} issueData.email
   * @param {string} [issueData.issueType='Bug']
   * @param {string} issueData.subject
   * @param {string} issueData.description
   * @param {string} [issueData.pageRoute]
   * @returns {Promise<{success: boolean, issue_id: string, status: string, message: string, created_at: string}>}
   */
  async submitIssue({ email, issueType = 'Bug', subject, description, pageRoute = null }) {
    if (!email || !email.trim()) {
      throw new ApiError('Email is required so our support team can respond.', 400);
    }
    if (!subject || !subject.trim()) {
      throw new ApiError('Subject is required.', 400);
    }
    if (!description || !description.trim()) {
      throw new ApiError('Description of the issue is required.', 400);
    }

    return this.request('/support/issues', {
      method: 'POST',
      body: JSON.stringify({
        email: email.trim(),
        issue_type: issueType,
        subject: subject.trim(),
        description: description.trim(),
        page_route: pageRoute ? pageRoute.trim() : null,
      }),
    });
  }
}


// Default singleton instance exported for application use
export const apiClient = new ApiClient();
export default apiClient;
