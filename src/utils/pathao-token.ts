/**
 * Pathao Token Management Utilities
 * Handles token storage, expiration checking, and automatic refresh
 */

const TOKEN_STORAGE_KEY = "pathao_access_token";
const REFRESH_TOKEN_STORAGE_KEY = "pathao_refresh_token";
const TOKEN_EXPIRY_KEY = "pathao_token_expiry";

interface TokenResponse {
  token_type: string;
  expires_in: number; // seconds
  access_token: string;
  refresh_token: string;
}

/**
 * Store tokens in localStorage with expiry timestamp
 */
export function storePathaoTokens(response: TokenResponse): void {
  if (typeof window === "undefined") return;

  const expiresIn = response.expires_in || 432000; // Default 5 days in seconds
  const expiryTime = Date.now() + expiresIn * 1000;

  localStorage.setItem(TOKEN_STORAGE_KEY, response.access_token);
  localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, response.refresh_token);
  localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
}

/**
 * Get stored access token
 */
export function getPathaoAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

/**
 * Get stored refresh token
 */
export function getPathaoRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
}

/**
 * Check if token is expired or will expire soon (within 5 minutes)
 */
export function isPathaoTokenExpired(): boolean {
  if (typeof window === "undefined") return true;

  const expiryTime = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!expiryTime) return true;

  const expiry = parseInt(expiryTime, 10);
  const now = Date.now();
  const buffer = 5 * 60 * 1000; // 5 minutes buffer

  return now >= expiry - buffer;
}

/**
 * Clear all stored Pathao tokens
 */
export function clearPathaoTokens(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

/**
 * Refresh the Pathao access token using refresh token
 */
export async function refreshPathaoToken(): Promise<TokenResponse> {
  const refreshToken = getPathaoRefreshToken();
  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  const response = await fetch("/api/pathao/refresh-token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.NEXT_PUBLIC_PATHAO_CLIENT_ID,
      client_secret: process.env.NEXT_PUBLIC_PATHAO_CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: `HTTP error! status: ${response.status}`,
    }));
    throw new Error(error.error || "Failed to refresh token");
  }

  const data: TokenResponse = await response.json();
  storePathaoTokens(data);
  return data;
}

/**
 * Get a valid access token, refreshing if necessary
 */
export async function getValidPathaoToken(): Promise<string | null> {
  if (isPathaoTokenExpired()) {
    try {
      const tokenData = await refreshPathaoToken();
      return tokenData.access_token;
    } catch (error) {
      console.error("Failed to refresh Pathao token:", error);
      clearPathaoTokens();
      return null;
    }
  }

  return getPathaoAccessToken();
}

/**
 * Make a Pathao API request with automatic token refresh
 * This function will automatically refresh the token if it's expired
 */
export async function pathaoApiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getValidPathaoToken();
  
  if (!token) {
    throw new Error("No valid Pathao token available. Please generate a token first.");
  }

  const pathaoBaseUrl =
    process.env.NEXT_PUBLIC_PATHAO_BASE_URL || "https://api-hermes.pathao.com";
  
  const response = await fetch(`${pathaoBaseUrl}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  // If token expired (401), try refreshing once
  if (response.status === 401) {
    try {
      const newTokenData = await refreshPathaoToken();
      const retryResponse = await fetch(`${pathaoBaseUrl}${endpoint}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${newTokenData.access_token}`,
          ...options.headers,
        },
      });

      if (!retryResponse.ok) {
        const error = await retryResponse.json().catch(() => ({
          error: `HTTP error! status: ${retryResponse.status}`,
        }));
        throw new Error(error.error || `HTTP error! status: ${retryResponse.status}`);
      }

      return retryResponse.json();
    } catch (error) {
      clearPathaoTokens();
      throw error;
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: `HTTP error! status: ${response.status}`,
    }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

