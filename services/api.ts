import { API_CONFIG } from '@/constants/config';
import { tokenStorage } from './tokenStorage';

interface ApiRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
}

class ApiService {
  private baseUrl: string;

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

  async request<T>(endpoint: string, options: ApiRequestOptions): Promise<T> {
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
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw {
          status: data.status || 'error',
          message: data.message || 'An error occurred',
          error: data.error,
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
