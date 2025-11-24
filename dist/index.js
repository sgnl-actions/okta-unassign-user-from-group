// SGNL Job Script - Auto-generated bundle
'use strict';

/**
 * Okta Unassign User from Group Action
 *
 * Removes an Okta user from a group, revoking the permissions and access
 * associated with that group membership.
 */

/**
 * Helper function to perform user group removal
 * @private
 */
async function unassignUserFromGroup(userId, groupId, oktaDomain, authToken) {
  // Safely encode IDs to prevent injection
  const encodedUserId = encodeURIComponent(userId);
  const encodedGroupId = encodeURIComponent(groupId);
  const url = new URL(`/api/v1/groups/${encodedGroupId}/users/${encodedUserId}`, `https://${oktaDomain}`);

  const authHeader = authToken.startsWith('SSWS ') ? authToken : `SSWS ${authToken}`;

  const response = await fetch(url.toString(), {
    method: 'DELETE',
    headers: {
      'Authorization': authHeader,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  });

  return response;
}


var script = {
  /**
   * Main execution handler - removes the user from the specified group
   * @param {Object} params - Job input parameters
   * @param {string} params.userId - The Okta user ID
   * @param {string} params.groupId - The Okta group ID
   * @param {string} params.oktaDomain - The Okta domain (e.g., example.okta.com)
   * @param {Object} context - Execution context with env, secrets, outputs
   * @param {string} context.secrets.BEARER_AUTH_TOKEN - Bearer token for Okta API authentication
   * @returns {Object} Job results
   */
  invoke: async (params, context) => {
    const { userId, groupId, oktaDomain } = params;

    console.log(`Starting Okta user group removal: user ${userId} from group ${groupId}`);

    // Validate inputs
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid or missing userId parameter');
    }
    if (!groupId || typeof groupId !== 'string') {
      throw new Error('Invalid or missing groupId parameter');
    }
    if (!oktaDomain || typeof oktaDomain !== 'string') {
      throw new Error('Invalid or missing oktaDomain parameter');
    }

    // Validate Okta API token is present
    if (!context.secrets?.BEARER_AUTH_TOKEN) {
      throw new Error('Missing required secret: BEARER_AUTH_TOKEN');
    }

    // Make the API request to remove user from group
    const response = await unassignUserFromGroup(
      userId,
      groupId,
      oktaDomain,
      context.secrets.BEARER_AUTH_TOKEN
    );

    // Handle the response
    if (response.ok) {
      // 204 No Content is the expected success response
      console.log(`Successfully removed user ${userId} from group ${groupId}`);

      return {
        userId: userId,
        groupId: groupId,
        removed: true,
        oktaDomain: oktaDomain,
        removedAt: new Date().toISOString()
      };
    }

    // Handle error responses
    const statusCode = response.status;
    let errorMessage = `Failed to remove user from group: HTTP ${statusCode}`;

    try {
      const errorBody = await response.json();
      if (errorBody.errorSummary) {
        errorMessage = `Failed to remove user from group: ${errorBody.errorSummary}`;
      }
      console.error('Okta API error response:', errorBody);
    } catch {
      // Response might not be JSON
      console.error('Failed to parse error response');
    }

    // Throw error with status code for proper error handling
    const error = new Error(errorMessage);
    error.statusCode = statusCode;
    throw error;
  },

  /**
   * Error recovery handler - framework handles retries by default
   * Only implement if custom recovery logic is needed
   * @param {Object} params - Original params plus error information
   * @param {Object} context - Execution context
   * @returns {Object} Recovery results
   */
  error: async (params, _context) => {
    const { error, userId, groupId } = params;
    console.error(`User group removal failed for user ${userId} from group ${groupId}: ${error.message}`);

    // Framework handles retries for transient errors (429, 502, 503, 504)
    // Just re-throw the error to let the framework handle it
    throw error;
  },

  /**
   * Graceful shutdown handler - cleanup when job is halted
   * @param {Object} params - Original params plus halt reason
   * @param {Object} context - Execution context
   * @returns {Object} Cleanup results
   */
  halt: async (params, _context) => {
    const { reason, userId, groupId } = params;
    console.log(`User group removal job is being halted (${reason}) for user ${userId} from group ${groupId}`);

    // No cleanup needed for this simple operation
    // The DELETE request either completed or didn't

    return {
      userId: userId || 'unknown',
      groupId: groupId || 'unknown',
      reason: reason,
      haltedAt: new Date().toISOString(),
      cleanupCompleted: true
    };
  }
};

module.exports = script;
