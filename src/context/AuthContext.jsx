import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { getPayload } from '../lib/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'access_token';
const USER_KEY = 'admin_user';

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem(TOKEN_KEY);
        const savedUser = localStorage.getItem(USER_KEY);
        if (token && savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch {
                localStorage.removeItem(USER_KEY);
            }
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        const res = await api.post('/auth/admin/login', { email, password });
        const payload = getPayload(res) ?? res.data;
        const token = payload?.access_token ?? payload?.token ?? payload?.accessToken ?? payload?.jwt ?? payload?.jwtToken;
        const userData = payload?.user ?? payload?.admin ?? payload;

        if (!token) {
            console.error('Login response:', res.data);
            throw new Error('No token received from server. Check API response format.');
        }

        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
        setUser(userData);
        return userData;
    };

    const logout = () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
    };

    const isAuthenticated = !!user || !!localStorage.getItem(TOKEN_KEY);

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
