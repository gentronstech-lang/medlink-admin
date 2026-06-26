/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                    light: '#3D9B9B',
                    dark: '#005050',
                },
                brand: {
                    gold: "hsl(var(--brand-gold))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                surface: "hsl(var(--card))",
                text: {
                    primary: "hsl(var(--foreground))",
                    secondary: "hsl(var(--muted-foreground))",
                    light: "hsl(var(--primary-foreground))",
                },
                divider: "hsl(var(--border))",
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            fontFamily: {
                sans: ['DM Sans', 'Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                'soft': '0 4px 20px -4px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255,255,255,0.04)',
                'soft-lg': '0 24px 48px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05)',
                'glow': '0 0 48px -12px hsl(180 58% 28% / 0.4)',
                'card': '0 4px 24px -4px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255,255,255,0.05)',
                'card-hover': '0 12px 40px -8px rgba(0, 0, 0, 0.45), 0 0 0 1px hsl(180 55% 32% / 0.2), 0 0 30px -10px hsl(180 58% 28% / 0.18)',
                'neon': '0 0 24px hsl(180 58% 28% / 0.28)',
                'inner-glow': 'inset 0 1px 0 0 rgba(255,255,255,0.06)',
            },
            animation: {
                'fade-in': 'fadeIn 0.4s ease-out',
                'slide-up': 'slideUp 0.4s ease-out',
                'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(16px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                pulseGlow: {
                    '0%, 100%': { boxShadow: '0 0 20px hsl(180 58% 28% / 0.22)' },
                    '50%': { boxShadow: '0 0 40px hsl(180 58% 28% / 0.38)' },
                },
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
}
