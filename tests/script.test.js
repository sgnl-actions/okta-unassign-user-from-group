import script from '../src/script.mjs';

describe('Okta Unassign User from Group Script', () => {
  const mockContext = {
    env: {
      ENVIRONMENT: 'test'
    },
    secrets: {
      BEARER_AUTH_TOKEN: 'test-okta-token-123456'
    },
    outputs: {}
  };

  let originalFetch;
  let originalURL;
  let fetchMock;

  beforeAll(() => {
    // Save original global functions
    originalFetch = global.fetch;
    originalURL = global.URL;
  });

  beforeEach(() => {
    // Create a fresh mock for each test
    fetchMock = (..._args) => Promise.resolve({
      ok: true,
      status: 204,
      json: async () => ({})
    });

    global.fetch = fetchMock;
    global.URL = class {
      constructor(path, base) {
        this.toString = () => `${base}${path}`;
      }
    };
  });

  afterEach(() => {
    // Restore console methods
    if (console.log.mockRestore) console.log.mockRestore();
    if (console.error.mockRestore) console.error.mockRestore();
  });

  afterAll(() => {
    // Restore original global functions
    global.fetch = originalFetch;
    global.URL = originalURL;
  });

  describe('invoke handler', () => {
    test('should successfully remove user from group', async () => {
      const params = {
        userId: 'user123',
        groupId: 'group456',
        address: 'https://example.okta.com'
      };

      // Mock successful API response (204 No Content)
      global.fetch = () => Promise.resolve({
        ok: true,
        status: 204
      });

      const result = await script.invoke(params, mockContext);

      expect(result.userId).toBe('user123');
      expect(result.groupId).toBe('group456');
      expect(result.removed).toBe(true);
      expect(result.address).toBe('https://example.okta.com');
      expect(result.removedAt).toBeDefined();
    });

    test('should throw error for missing address', async () => {
      const params = {
        userId: 'user123',
        groupId: 'group456'
      };

      await expect(script.invoke(params, mockContext))
        .rejects.toThrow('No URL specified. Provide address parameter or ADDRESS environment variable');
    });

    test('should throw error for missing BEARER_AUTH_TOKEN', async () => {
      const params = {
        userId: 'user123',
        groupId: 'group456',
        address: 'https://example.okta.com'
      };

      const contextWithoutToken = {
        ...mockContext,
        secrets: {}
      };

      await expect(script.invoke(params, contextWithoutToken))
        .rejects.toThrow('No authentication configured');
    });

    test('should handle API error with errorSummary', async () => {
      const params = {
        userId: 'user123',
        groupId: 'group456',
        address: 'https://example.okta.com'
      };

      global.fetch = () => Promise.resolve({
        ok: false,
        status: 404,
        json: async () => ({
          errorCode: 'E0000007',
          errorSummary: 'Not found: User user123 not found in group group456',
          errorLink: 'E0000007',
          errorId: 'oae123'
        })
      });

      const error = await script.invoke(params, mockContext).catch(e => e);
      expect(error.message).toBe('Failed to remove user from group: Not found: User user123 not found in group group456');
      expect(error.statusCode).toBe(404);
    });

    test('should handle API error without JSON body', async () => {
      const params = {
        userId: 'user123',
        groupId: 'group456',
        address: 'https://example.okta.com'
      };

      global.fetch = () => Promise.resolve({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Not JSON');
        }
      });

      const error = await script.invoke(params, mockContext).catch(e => e);
      expect(error.message).toBe('Failed to remove user from group: HTTP 500');
      expect(error.statusCode).toBe(500);
    });
  });

  describe('error handler', () => {
    test('should re-throw error for framework to handle', async () => {
      const params = {
        userId: 'user123',
        groupId: 'group456',
        error: new Error('Network timeout')
      };

      await expect(script.error(params, mockContext))
        .rejects.toThrow('Network timeout');
    });
  });

  describe('halt handler', () => {
    test('should handle graceful shutdown', async () => {
      const params = {
        userId: 'user123',
        groupId: 'group456',
        reason: 'timeout'
      };

      const result = await script.halt(params, mockContext);

      expect(result.userId).toBe('user123');
      expect(result.groupId).toBe('group456');
      expect(result.reason).toBe('timeout');
      expect(result.haltedAt).toBeDefined();
      expect(result.cleanupCompleted).toBe(true);
    });

    test('should handle halt with missing params', async () => {
      const params = {
        reason: 'system_shutdown'
      };

      const result = await script.halt(params, mockContext);

      expect(result.userId).toBe('unknown');
      expect(result.groupId).toBe('unknown');
      expect(result.reason).toBe('system_shutdown');
      expect(result.cleanupCompleted).toBe(true);
    });
  });
});