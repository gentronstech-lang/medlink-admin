import React, { createContext, useContext, useMemo, useState } from 'react';
import orgApi, { getOrgPayload, ORG_ADMIN_KEY, ORG_TOKEN_KEY } from '@/lib/orgApi';

const OrgAuthContext = createContext(null);

export function OrgAuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    const token = localStorage.getItem(ORG_TOKEN_KEY);
    const savedAdmin = localStorage.getItem(ORG_ADMIN_KEY);
    if (!token || !savedAdmin) return null;
    try {
      return JSON.parse(savedAdmin);
    } catch {
      localStorage.removeItem(ORG_ADMIN_KEY);
      return null;
    }
  });
  const loading = false;

  const login = async (email, password) => {
    const res = await orgApi.post('/organization/auth/login', { email, password });
    const payload = getOrgPayload(res) ?? res.data;
    const token = payload?.access_token ?? payload?.token ?? payload?.accessToken;
    const adminData = payload?.admin ?? payload?.user ?? payload;

    if (!token) {
      // Keep error explicit for debugging response format mismatches
      throw new Error('No token received from server. Check API response format.');
    }

    localStorage.setItem(ORG_TOKEN_KEY, token);
    localStorage.setItem(ORG_ADMIN_KEY, JSON.stringify(adminData));
    setAdmin(adminData);
    return adminData;
  };

  const logout = () => {
    localStorage.removeItem(ORG_TOKEN_KEY);
    localStorage.removeItem(ORG_ADMIN_KEY);
    setAdmin(null);
  };

  const isAuthenticated = !!admin || !!localStorage.getItem(ORG_TOKEN_KEY);

  const value = useMemo(
    () => ({ admin, loading, login, logout, isAuthenticated }),
    [admin, loading, isAuthenticated]
  );

  return <OrgAuthContext.Provider value={value}>{children}</OrgAuthContext.Provider>;
}

export function useOrgAuth() {
  const ctx = useContext(OrgAuthContext);
  if (!ctx) throw new Error('useOrgAuth must be used within OrgAuthProvider');
  return ctx;
}

