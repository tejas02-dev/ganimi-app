import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

/**
 * Backend expects cookie names exactly: access_token and refresh_token.
 * We store tokens securely using expo-secure-store (works in Expo Go and dev builds).
 * Tokens are stored RAW (not URL-encoded) and encoded only when building Cookie header.
 */
export const tokenStorage = {
  async getAccessToken(): Promise<string | null> {
    try {
      const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      // Decode if it was accidentally stored encoded (cleanup from old storage)
      if (token && token.includes('%')) {
        const decoded = decodeURIComponent(token);
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, decoded); // Fix it
        return decoded;
      }
      return token;
    } catch (e) {
      if (__DEV__) console.warn('[TokenStorage] getAccessToken failed', e);
      return null;
    }
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      const token = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      // Decode if it was accidentally stored encoded (cleanup from old storage)
      if (token && token.includes('%')) {
        const decoded = decodeURIComponent(token);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, decoded); // Fix it
        if (__DEV__) console.log('[TokenStorage] Decoded and fixed URL-encoded refresh token');
        return decoded;
      }
      return token;
    } catch (e) {
      if (__DEV__) console.warn('[TokenStorage] getRefreshToken failed', e);
      return null;
    }
  },

  async getBoth(): Promise<{ access_token: string | null; refresh_token: string | null }> {
    const [access_token, refresh_token] = await Promise.all([
      this.getAccessToken(),
      this.getRefreshToken(),
    ]);
    
    if (__DEV__) {
      console.log('[TokenStorage] Retrieved tokens:', {
        hasAccess: !!access_token,
        hasRefresh: !!refresh_token,
        accessLen: access_token?.length ?? 0,
        refreshLen: refresh_token?.length ?? 0,
      });
    }

    return { access_token, refresh_token };
  },

  async setTokens(access_token: string | null, refresh_token: string | null): Promise<void> {
    try {
      if (access_token != null) {
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access_token);
        if (__DEV__) console.log('[TokenStorage] Saved access_token, length:', access_token.length);
      }
      if (refresh_token != null) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh_token);
        if (__DEV__) console.log('[TokenStorage] Saved refresh_token, length:', refresh_token.length);
      }
    } catch (e) {
      if (__DEV__) console.warn('[TokenStorage] setTokens failed', e);
    }
  },

  async clear(): Promise<void> {
    if (__DEV__) {
      console.log('[TokenStorage] CLEARING ALL TOKENS - Called from:', new Error().stack);
    }
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      ]);
      if (__DEV__) console.log('[TokenStorage] Tokens cleared successfully');
    } catch (e) {
      if (__DEV__) console.warn('[TokenStorage] clear failed', e);
    }
  },

  /** Dev only: delete access token to test refresh flow */
  async deleteAccessToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      if (__DEV__) console.log('[TokenStorage] Access token deleted (dev)');
    } catch (e) {
      if (__DEV__) console.warn('[TokenStorage] deleteAccessToken failed', e);
    }
  },

  /** Dev only: delete refresh token */
  async deleteRefreshToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      if (__DEV__) console.log('[TokenStorage] Refresh token deleted (dev)');
    } catch (e) {
      if (__DEV__) console.warn('[TokenStorage] deleteRefreshToken failed', e);
    }
  },

  /**
   * Backend may return access_token or accessToken (same for refresh), top-level or under data.
   * We always store as access_token / refresh_token in secure storage.
   */
  async setTokensFromResponse(data: any): Promise<void> {
    const raw = data?.data ?? data;
    let access = raw?.access_token ?? raw?.accessToken ?? data?.access_token ?? data?.accessToken ?? null;
    let refresh = raw?.refresh_token ?? raw?.refreshToken ?? data?.refresh_token ?? data?.refreshToken ?? null;
    
    // Ensure tokens are NOT URL-encoded when storing (decode if they are)
    if (access && access.includes('%')) {
      access = decodeURIComponent(access);
      if (__DEV__) console.log('[TokenStorage] Decoded URL-encoded access token from response');
    }
    if (refresh && refresh.includes('%')) {
      refresh = decodeURIComponent(refresh);
      if (__DEV__) console.log('[TokenStorage] Decoded URL-encoded refresh token from response');
    }
    
    if (__DEV__) {
      console.log('[TokenStorage] setTokensFromResponse called with:', {
        hasAccess: !!access,
        hasRefresh: !!refresh,
        accessLen: access?.length ?? 0,
        refreshLen: refresh?.length ?? 0,
        accessPreview: access ? access.substring(0, 30) : 'null',
        refreshPreview: refresh ? refresh.substring(0, 30) : 'null',
      });
    }
    
    await this.setTokens(access, refresh);
    
    // Verify tokens were saved correctly
    if (__DEV__) {
      const verification = await this.getBoth();
      console.log('[TokenStorage] Verification after save:', {
        savedAccessLen: verification.access_token?.length ?? 0,
        savedRefreshLen: verification.refresh_token?.length ?? 0,
        match: verification.access_token === access && verification.refresh_token === refresh,
      });
    }
  },
};
