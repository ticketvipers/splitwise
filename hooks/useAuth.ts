'use client';
import { useState, useEffect, useCallback } from 'react';

interface JWTPayload {
  sub?: string;
  email?: string;
  name?: string;
  exp?: number;
}

function decodeJWT(token: string): JWTPayload | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function useAuth() {
  const [token, setTokenState] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('splitwise_token');
      setTokenState(stored);
    }
  }, []);

  const login = useCallback((newToken: string) => {
    localStorage.setItem('splitwise_token', newToken);
    setTokenState(newToken);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('splitwise_token');
    setTokenState(null);
  }, []);

  const user = token ? decodeJWT(token) : null;
  const isLoggedIn = !!token && !!user && (user.exp ? user.exp * 1000 > Date.now() : true);

  return { token, user, login, logout, isLoggedIn };
}
