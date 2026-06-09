'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { API_BASE_URL } from '@/lib/config';
import { getAuthHeader } from '@/lib/auth-client';

interface AuthUser {
  id: string;
  email: string;
  role: string;
  plan: string;
  isActivated: boolean;
  [key: string]: any;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const headers = await getAuthHeader();

      const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      });

      if (res.ok) {
        const data = await res.json();
        // Uses `setUser(data)` because our `/api/auth/me` returns the user object directly at the top level
        setUser(data);
      } else if (res.status === 401) {
        setUser(null);
        // Also clear any stale native token if server says unauthorized
        if (Capacitor.isNativePlatform()) {
          await Preferences.remove({ key: 'auth_token' });
        }
        return;
      } else {
        setUser(null);
        // Clear invalid token
        if (Capacitor.isNativePlatform()) {
          await Preferences.remove({ key: 'auth_token' });
        }
      }
    } catch (err) {
      console.error('[AuthContext] Failed to fetch user:', err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const logout = async () => {
    console.log('[LOGOUT] Step 1: Setting user to null');
    setUser(null);

    console.log('[LOGOUT] Step 2: Removing Capacitor Preferences token');
    if (Capacitor.isNativePlatform()) {
      try {
        await Preferences.remove({ key: 'auth_token' });
        const check = await Preferences.get({ key: 'auth_token' });
        console.log('[LOGOUT] Token after removal:', JSON.stringify(check));
      } catch (err) {
        console.error('[LOGOUT] Preferences.remove failed:', err);
      }
    }

    console.log('[LOGOUT] Step 3: Calling logout API');
    try {
      const authHeaders = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
      });
      console.log('[LOGOUT] API response status:', res.status);
    } catch (err) {
      console.error('[LOGOUT] Logout API failed:', err);
    }

    console.log('[LOGOUT] Step 4: Hard navigating to /login');
    window.location.replace('/login');
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      logout,
      refreshUser: fetchUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
