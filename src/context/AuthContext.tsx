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
      const hasAuth = Object.keys(headers).length > 0 ||
        document.cookie.includes('auth_token');

      if (!hasAuth) {
        setUser(null);
        setIsLoading(false);
        return;
      }

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
    if (Capacitor.isNativePlatform()) {
      await Preferences.remove({ key: 'auth_token' });
    }
    // Clear cookie for web
    document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    setUser(null);
    window.location.href = '/login';
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
