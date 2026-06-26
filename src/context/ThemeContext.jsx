import React, { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext(null);
const THEME_KEY = 'medlink_theme';

/** App is light-only; persisted dark preference is cleared on load. */
export function ThemeProvider({ children }) {
    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove('dark');
        try {
            localStorage.setItem(THEME_KEY, 'light');
        } catch {
            /* ignore quota / private mode */
        }
    }, []);

    const theme = 'light';
    const setTheme = () => {};
    const toggleTheme = () => {};

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
}
