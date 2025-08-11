/**
 * Client library for the Verify Token API
 * Provides easy-to-use functions for token verification
 */

const axios = require('axios');

class VerifyTokenClient {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost:3000';
    this.timeout = config.timeout || 10000;
    this.retries = config.retries || 3;
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Verify a JWT token
   * @param {string} apiToken - The JWT token to verify
   * @returns {Promise<Object>} Verification result
   */
  async verifyToken(apiToken) {
    if (!apiToken) {
      throw new Error('API token is required');
    }

    if (typeof apiToken !== 'string' || apiToken.trim() === '') {
      throw new Error('API token must be a non-empty string');
    }

    try {
      const response = await this.client.post('/api/users/verify-token', {
        api_token: apiToken
      });

      return {
        success: true,
        verified: true,
        data: response.data.data,
        user: response.data.user,
        tokenInfo: response.data.tokenInfo,
        message: response.data.message
      };
    } catch (error) {
      if (error.response) {
        // Server responded with an error status
        return {
          success: false,
          verified: false,
          error: error.response.data.message || 'Verification failed',
          statusCode: error.response.status,
          details: error.response.data
        };
      } else if (error.request) {
        // Request was made but no response received
        return {
          success: false,
          verified: false,
          error: 'Network error - no response from server',
          details: error.message
        };
      } else {
        // Something else happened
        return {
          success: false,
          verified: false,
          error: error.message,
          details: error
        };
      }
    }
  }

  /**
   * Quick verification - returns only boolean result
   * @param {string} apiToken - The JWT token to verify
   * @returns {Promise<boolean>} True if token is valid, false otherwise
   */
  async isTokenValid(apiToken) {
    try {
      const result = await this.verifyToken(apiToken);
      return result.verified;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get user information from token without full verification response
   * @param {string} apiToken - The JWT token to verify
   * @returns {Promise<Object|null>} User object or null if invalid
   */
  async getUserFromToken(apiToken) {
    try {
      const result = await this.verifyToken(apiToken);
      return result.verified ? result.user : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Verify token and return auth model
   * @param {string} apiToken - The JWT token to verify
   * @returns {Promise<Object|null>} Auth model or null if invalid
   */
  async getAuthModel(apiToken) {
    try {
      const result = await this.verifyToken(apiToken);
      return result.verified ? result.data : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Batch verify multiple tokens
   * @param {string[]} tokens - Array of tokens to verify
   * @returns {Promise<Array>} Array of verification results
   */
  async verifyTokens(tokens) {
    if (!Array.isArray(tokens)) {
      throw new Error('Tokens must be an array');
    }

    const results = await Promise.allSettled(
      tokens.map(token => this.verifyToken(token))
    );

    return results.map((result, index) => ({
      token: tokens[index],
      status: result.status,
      result: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason : null
    }));
  }

  /**
   * Set new base URL
   * @param {string} baseUrl - New base URL
   */
  setBaseUrl(baseUrl) {
    this.baseUrl = baseUrl;
    this.client.defaults.baseURL = baseUrl;
  }

  /**
   * Set timeout for requests
   * @param {number} timeout - Timeout in milliseconds
   */
  setTimeout(timeout) {
    this.timeout = timeout;
    this.client.defaults.timeout = timeout;
  }
}

// Helper functions for direct usage without class instantiation

/**
 * Quick token verification function
 * @param {string} apiToken - Token to verify
 * @param {Object} config - Configuration options
 * @returns {Promise<Object>} Verification result
 */
async function verifyToken(apiToken, config = {}) {
  const client = new VerifyTokenClient(config);
  return await client.verifyToken(apiToken);
}

/**
 * Check if token is valid (boolean result)
 * @param {string} apiToken - Token to verify
 * @param {Object} config - Configuration options
 * @returns {Promise<boolean>} True if valid, false otherwise
 */
async function isTokenValid(apiToken, config = {}) {
  const client = new VerifyTokenClient(config);
  return await client.isTokenValid(apiToken);
}

module.exports = {
  VerifyTokenClient,
  verifyToken,
  isTokenValid
};
