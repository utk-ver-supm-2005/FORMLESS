import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ApiClient,
  ApiError,
  MAX_POLICY_SIZE_BYTES,
  MAX_EVIDENCE_SIZE_BYTES,
  ALLOWED_EVIDENCE_TYPES,
  validatePolicyFile,
} from '../src/api/client.js';

test('ApiClient - Initial state and constants', () => {
  const client = new ApiClient('/api/v1');
  assert.equal(client.baseUrl, '/api/v1');
  assert.equal(MAX_POLICY_SIZE_BYTES, 50 * 1024 * 1024);
  assert.equal(MAX_EVIDENCE_SIZE_BYTES, 10 * 1024 * 1024);
  assert.ok(ALLOWED_EVIDENCE_TYPES.includes('application/pdf'));
  assert.ok(ALLOWED_EVIDENCE_TYPES.includes('image/png'));
  assert.ok(ALLOWED_EVIDENCE_TYPES.includes('image/jpeg'));
});

test('ApiClient - Policy PDF size and format validations', async () => {
  const client = new ApiClient('/api/v1');

  // Null file
  await assert.rejects(
    async () => client.ingestPolicy(null),
    (err) => {
      assert.ok(err instanceof ApiError);
      assert.match(err.message, /No policy document file provided/);
      return true;
    }
  );

  // Oversized file (> 50 MB)
  const oversizedFile = {
    name: 'giant_policy.pdf',
    type: 'application/pdf',
    size: 51 * 1024 * 1024,
  };
  await assert.rejects(
    async () => client.ingestPolicy(oversizedFile),
    (err) => {
      assert.ok(err instanceof ApiError);
      assert.match(err.message, /exceeds maximum limit of 50 MB/);
      return true;
    }
  );

  // Non-PDF file
  const docxFile = {
    name: 'document.docx',
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 500 * 1024,
  };
  await assert.rejects(
    async () => client.ingestPolicy(docxFile),
    (err) => {
      assert.ok(err instanceof ApiError);
      assert.match(err.message, /must be a PDF file/);
      return true;
    }
  );

  // Zero-byte file
  const emptyFile = {
    name: 'empty.pdf',
    type: 'application/pdf',
    size: 0,
  };
  await assert.rejects(
    async () => client.ingestPolicy(emptyFile),
    (err) => {
      assert.ok(err instanceof ApiError);
      assert.match(err.message, /empty/i);
      return true;
    }
  );
});

test('ApiClient - validatePolicyFile helper function', () => {
  // Null / undefined
  assert.deepEqual(validatePolicyFile(null), {
    valid: false,
    error: 'No policy document file provided.',
  });

  // Zero-byte
  assert.deepEqual(validatePolicyFile({ name: 'policy.pdf', size: 0, type: 'application/pdf' }), {
    valid: false,
    error: 'Policy document file is empty (0 bytes).',
  });

  // Exceeds 50 MB
  const over50Mb = validatePolicyFile({
    name: 'huge.pdf',
    size: 51 * 1024 * 1024,
    type: 'application/pdf',
  });
  assert.equal(over50Mb.valid, false);
  assert.match(over50Mb.error, /exceeds maximum limit of 50 MB/);

  // Non-PDF
  assert.deepEqual(
    validatePolicyFile({ name: 'policy.docx', size: 1024, type: 'application/msword' }),
    {
      valid: false,
      error: 'Policy document must be a PDF file (.pdf).',
    }
  );

  // Valid PDF
  assert.deepEqual(
    validatePolicyFile({ name: 'FSSAI_Policy.pdf', size: 200 * 1024, type: 'application/pdf' }),
    {
      valid: true,
      error: null,
    }
  );
});

test('ApiClient - Evidence upload validations', async () => {
  const client = new ApiClient('/api/v1');

  // Missing requirement ID
  await assert.rejects(
    async () => client.uploadEvidence('', { name: 'test.pdf', size: 1000, type: 'application/pdf' }),
    (err) => {
      assert.ok(err instanceof ApiError);
      assert.match(err.message, /Requirement ID is required/);
      return true;
    }
  );

  // Oversized evidence (> 10 MB)
  const oversizedEvidence = {
    name: 'large_evidence.pdf',
    type: 'application/pdf',
    size: 11 * 1024 * 1024,
  };
  await assert.rejects(
    async () => client.uploadEvidence('req_1', oversizedEvidence),
    (err) => {
      assert.ok(err instanceof ApiError);
      assert.match(err.message, /exceeds maximum limit of 10 MB/);
      return true;
    }
  );

  // Invalid file type (e.g. zip)
  const zipFile = {
    name: 'archive.zip',
    type: 'application/zip',
    size: 500 * 1024,
  };
  await assert.rejects(
    async () => client.uploadEvidence('req_1', zipFile),
    (err) => {
      assert.ok(err instanceof ApiError);
      assert.match(err.message, /must be a PDF, PNG, or JPG/);
      return true;
    }
  );
});

test('ApiClient - Reject requirement mandatory reason validation', async () => {
  const client = new ApiClient('/api/v1');

  await assert.rejects(
    async () => client.rejectRequirement('req_1', ''),
    (err) => {
      assert.ok(err instanceof ApiError);
      assert.match(err.message, /Rejection reason is mandatory/);
      return true;
    }
  );

  await assert.rejects(
    async () => client.rejectRequirement('req_1', '   '),
    (err) => {
      assert.ok(err instanceof ApiError);
      assert.match(err.message, /Rejection reason is mandatory/);
      return true;
    }
  );
});

test('ApiClient - Network failure normalization', async () => {
  const client = new ApiClient('/api/v1');

  // Mock fetch to simulate network down
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new TypeError('Failed to fetch');
  };

  try {
    await assert.rejects(
      async () => client.health(),
      (err) => {
        assert.ok(err instanceof ApiError);
        assert.match(err.message, /Unable to connect to FORMLESS compliance backend/);
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('ApiClient - Backend error response parsing', async () => {
  const client = new ApiClient('/api/v1');

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    return {
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      headers: {
        get: (h) => (h === 'content-type' ? 'application/json' : null),
      },
      json: async () => ({
        detail: 'Cannot request requirement in VERIFIED state.',
      }),
    };
  };

  try {
    await assert.rejects(
      async () => client.requestRequirement('req_1'),
      (err) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 400);
        assert.equal(err.message, 'Cannot request requirement in VERIFIED state.');
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('ApiClient - Auth login and status methods', async () => {
  const client = new ApiClient('/api/v1');

  // Rejection when credentials missing
  await assert.rejects(
    async () => client.login('', 'FormlessDemo2026!'),
    (err) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.status, 400);
      assert.match(err.message, /Username and password are required/);
      return true;
    }
  );

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (url.endsWith('/auth/login')) {
      const body = JSON.parse(opts.body);
      if (body.username === 'formless_demo' && body.password === 'FormlessDemo2026!') {
        return {
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          json: async () => ({
            status: 'authenticated',
            access_token: 'test-token',
            user: { username: 'formless_demo' },
          }),
        };
      }
      return {
        ok: false,
        status: 401,
        headers: { get: () => 'application/json' },
        json: async () => ({ detail: 'Invalid credentials.' }),
      };
    }
    if (url.endsWith('/auth/status')) {
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({ oauth_google_configured: false, demo_auth_enabled: true }),
      };
    }
    return { ok: false, status: 404 };
  };

  try {
    // Valid login
    const authSuccess = await client.login('formless_demo', 'FormlessDemo2026!');
    assert.equal(authSuccess.status, 'authenticated');
    assert.equal(authSuccess.user.username, 'formless_demo');

    // Invalid login
    await assert.rejects(
      async () => client.login('formless_demo', 'wrong'),
      (err) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 401);
        assert.equal(err.message, 'Invalid credentials.');
        return true;
      }
    );

    // Auth status
    const status = await client.getAuthStatus();
    assert.equal(status.demo_auth_enabled, true);
    assert.equal(status.oauth_google_configured, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
