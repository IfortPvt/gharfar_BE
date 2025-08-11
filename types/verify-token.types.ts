/**
 * TypeScript interfaces for the Verify Token API
 * These interfaces define the structure of requests and responses
 */

// Request interface for token verification
export interface VerifyTokenRequest {
  api_token: string;
}

// Authentication model returned by the API
export interface AuthModel {
  api_token: string;
  refreshToken?: string;
}

// User information included in the response
export interface UserInfo {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  profileImage?: string;
  verifications: {
    emailVerified: boolean;
    phoneVerified: boolean;
    idVerified: boolean;
  };
}

// Token information included in the response
export interface TokenInfo {
  issuedAt: Date;
  expiresAt: Date;
  validFor: string;
}

// Complete response interface for successful verification
export interface VerifyTokenResponse {
  success: true;
  message: string;
  data: AuthModel;
  user: UserInfo;
  tokenInfo: TokenInfo;
}

// Error response interface
export interface VerifyTokenErrorResponse {
  success: false;
  message: string;
  error?: string;
}

// Union type for all possible responses
export type VerifyTokenApiResponse = VerifyTokenResponse | VerifyTokenErrorResponse;

// Enum for possible error types
export enum TokenVerificationError {
  INVALID_FORMAT = 'Invalid token format or signature.',
  EXPIRED = 'Token has expired. Please login again.',
  USER_NOT_FOUND = 'User not found. Token may be invalid.',
  ACCOUNT_SUSPENDED = 'Account suspended',
  ACCOUNT_BANNED = 'Account has been permanently banned.',
  LOGIN_RESTRICTED = 'Login access has been restricted for this account.',
  MISSING_TOKEN = 'API token is required',
  EMPTY_TOKEN = 'API token cannot be empty'
}

// Type guard to check if response is successful
export function isSuccessfulVerification(
  response: VerifyTokenApiResponse
): response is VerifyTokenResponse {
  return response.success === true;
}

// Type guard to check if response is an error
export function isVerificationError(
  response: VerifyTokenApiResponse
): response is VerifyTokenErrorResponse {
  return response.success === false;
}

// Helper function type for frontend usage
export type VerifyTokenFunction = (token: string) => Promise<VerifyTokenApiResponse>;

// Configuration options for the verify token service
export interface VerifyTokenConfig {
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}
