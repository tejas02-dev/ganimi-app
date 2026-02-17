import { API_CONFIG } from '@/constants/config';
import { tokenStorage } from './tokenStorage';

interface ApiRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
}

class ApiService {
  private baseUrl: string;
  private isRefreshing: boolean = false;

  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
  }

  /** 
   * Backend expects cookie names access_token and refresh_token.
   * Backend decodes with decodeURIComponent, so we must encode the values.
   */
  private buildCookieHeader(access_token: string | null, refresh_token: string | null): string {
    const parts: string[] = [];
    if (access_token) {
      parts.push(`access_token=${encodeURIComponent(access_token)}`);
    }
    if (refresh_token) {
      parts.push(`refresh_token=${encodeURIComponent(refresh_token)}`);
    }
    return parts.join('; ');
  }

  /**
   * Refresh access token using refresh token.
   * Returns true if refresh was successful, false otherwise.
   */
  private async refreshAccessToken(): Promise<boolean> {
    if (this.isRefreshing) {
      // Already refreshing, wait a bit and return false to prevent infinite loops
      return false;
    }

    this.isRefreshing = true;
    try {
      const { refresh_token } = await tokenStorage.getBoth();
      
      if (!refresh_token) {
        if (__DEV__) console.log('[API] No refresh token available for refresh');
        return false;
      }

      // Call refresh-token endpoint with refresh_token in cookie
      const refreshUrl = `${this.baseUrl}/auth/refresh-token`;
      const refreshCookieHeader = this.buildCookieHeader(null, refresh_token);
      
      const refreshHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (refreshCookieHeader) {
        refreshHeaders['Cookie'] = refreshCookieHeader;
      }

      const refreshResponse = await fetch(refreshUrl, {
        method: 'POST',
        headers: refreshHeaders,
        credentials: 'omit',
      });

      const refreshData = await refreshResponse.json().catch(() => ({}));

      if (!refreshResponse.ok) {
        if (__DEV__) {
          console.log('[API] Refresh token failed:', refreshData);
        }
        return false;
      }

      // Backend returns { status, message, data: { accessToken, refreshToken } } – save and replace old tokens
      if (__DEV__) console.log('[API] Refresh successful, saving new tokens');
      await tokenStorage.setTokensFromResponse(refreshData);
      return true;
    } catch (error) {
      if (__DEV__) {
        console.error('[API] Error refreshing token:', error);
      }
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  async request<T>(endpoint: string, options: ApiRequestOptions, retryOn401: boolean = true): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const { access_token, refresh_token } = await tokenStorage.getBoth();
    const cookieHeader = this.buildCookieHeader(access_token, refresh_token);
    
    if (__DEV__) {
      console.log('[API]', endpoint, 'Tokens:', {
        hasAccess: !!access_token,
        hasRefresh: !!refresh_token,
        accessPreview: access_token ? `${access_token.substring(0, 20)}...` : 'null',
        refreshPreview: refresh_token ? `${refresh_token.substring(0, 20)}...` : 'null',
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    const config: RequestInit = {
      method: options.method,
      headers,
      // DON'T use 'credentials: include' - it sends old cached cookies
      // We manually manage cookies via the Cookie header
      credentials: 'omit',
    };

    if (options.body) {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);
      console.log('[API] Response:', response);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // On 401, try refresh if we have a refresh token and this isn't the refresh endpoint
        const shouldTryRefresh =
          response.status === 401 &&
          retryOn401 &&
          !!refresh_token &&
          !endpoint.startsWith('/auth/refresh-token');

        if (shouldTryRefresh) {
          if (__DEV__) {
            console.log('[API] 401 received (code:', data.code, '), attempting token refresh...');
          }

          const refreshSuccess = await this.refreshAccessToken();
          
          if (refreshSuccess) {
            // Retry the original request with new token
            if (__DEV__) {
              console.log('[API] Retrying original request after token refresh');
            }
            return this.request<T>(endpoint, options, false); // Don't retry again if this fails
          } else {
            // Refresh failed, throw original error
            if (__DEV__) {
              console.log('[API] Token refresh failed, throwing original error');
            }
          }
        }

        throw {
          status: data.status || 'error',
          message: data.message || 'An error occurred',
          error: data.error,
          code: data.code,
          statusCode: response.status,
        };
      }

      // If response contains new tokens, update storage
      if (data.accessToken || data.access_token || data.refreshToken || data.refresh_token) {
        if (__DEV__) console.log('[API] Response contains tokens, updating storage');
        await tokenStorage.setTokensFromResponse(data);
      }

      return data;
    } catch (error: any) {
      if (error.message === 'Network request failed' || error.message === 'Failed to fetch') {
        throw {
          status: 'error',
          message: 'Network error. Please check your connection and try again.',
        };
      }
      throw error;
    }
  }

  async get<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', headers });
  }

  async post<T>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body, headers });
  }

  async put<T>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body, headers });
  }

  async delete<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', headers });
  }

  async patch<T>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', body, headers });
  }
}

export const apiService = new ApiService();