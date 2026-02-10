import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, VendorProfile } from '@/types/auth';
import { authService } from '@/services/auth.service';
import { tokenStorage } from '@/services/tokenStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  user: User | null;
  vendorProfile: VendorProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /**
   * Logs in the user and returns the authenticated user object.
   */
  login: (email: string, password: string, tenantId: string) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setVendorProfile: (profile: VendorProfile | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [vendorProfile, setVendorProfile] = useState<VendorProfile | null>(null);

  useEffect(() => {
    // Clean up any old token storage from AsyncStorage (migration cleanup)
    const cleanupOldTokens = async () => {
      try {
        await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'accessToken', 'refreshToken']);
        if (__DEV__) console.log('[Auth] Cleaned up old token keys from AsyncStorage');
      } catch (e) {
        // Ignore errors
      }
    };
    cleanupOldTokens();
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Check if we have a stored user
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }

      // Load cached vendor profile if available
      const storedVendorProfile = await AsyncStorage.getItem('vendorProfile');
      if (storedVendorProfile) {
        setVendorProfile(JSON.parse(storedVendorProfile));
      }
      
      // Optionally verify with the server
      // const response = await authService.getCurrentUser();
      // setUser(response.user);
      // await AsyncStorage.setItem('user', JSON.stringify(response.user));
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      await AsyncStorage.removeItem('user');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (
    email: string,
    password: string,
    tenantId: string
  ): Promise<User> => {
    try {
      const response = await authService.login({ email, password, tenantId });
      
      if (__DEV__) {
        console.log('[Auth] Login response received:', {
          hasAccessToken: !!(response.accessToken || response.access_token),
          hasRefreshToken: !!(response.refreshToken || response.refresh_token),
          user: response.user?.email,
        });
      }
      
      // Store tokens first in SecureStore before any navigation/API call
      await tokenStorage.setTokensFromResponse(response);
      
      // Wait a bit longer to ensure SecureStore persists the data
      await new Promise((r) => setTimeout(r, 100));
      
      // Verify tokens were actually stored
      if (__DEV__) {
        const verification = await tokenStorage.getBoth();
        console.log('[Auth] Post-login token verification:', {
          hasAccess: !!verification.access_token,
          hasRefresh: !!verification.refresh_token,
        });
      }

      // Fetch vendor profile (for vendor-specific data like categoryId, branches, etc.)
      let profile: VendorProfile | null = null;
      try {
        const profileResponse = await authService.getUserProfile();
        profile = profileResponse.data;
        setVendorProfile(profile);
        await AsyncStorage.setItem('vendorProfile', JSON.stringify(profile));
      } catch (profileError) {
        console.warn('[Auth] Failed to fetch vendor profile', profileError);
      }

      const authenticatedUser = response.user;
      setUser(authenticatedUser);
      await AsyncStorage.setItem('user', JSON.stringify(authenticatedUser));

      return authenticatedUser;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setVendorProfile(null);
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('vendorProfile');
      await tokenStorage.clear();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        vendorProfile,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        setUser,
        setVendorProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
