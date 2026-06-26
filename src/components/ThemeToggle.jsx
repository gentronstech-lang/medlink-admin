import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className }) {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <button
            onClick={toggleTheme}
            className={cn(
                "inline-flex items-center justify-center w-9 h-9 rounded-xl border border-border bg-card shadow-soft hover:bg-accent transition-colors",
                className
            )}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            {isDark ? (
                <Sun size={18} className="text-brand-gold" />
            ) : (
                <Moon size={18} className="text-primary" />
            )}
        </button>
    );
}
