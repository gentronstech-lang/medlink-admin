import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import loginBrandLogo from '@/assets/medlink-login-logo.png';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Button } from '@/components/ui/button.jsx';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
            navigate('/', { replace: true });
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const inputClass =
        'h-11 rounded-xl border border-border bg-card shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-primary/25 focus-visible:border-primary/40';

    return (
        <div className="relative flex min-h-screen items-center justify-center bg-mesh p-4 sm:p-6">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 h-[420px] w-[420px] rounded-full bg-primary/10 blur-[100px]" />
                <div className="absolute bottom-1/4 right-1/4 h-[320px] w-[320px] rounded-full bg-brand-gold/10 blur-[90px]" />
            </div>
            <div className="relative w-full max-w-[440px]">
                <header className="mb-10 flex flex-col items-center gap-4 text-center">
                    <img
                        src={loginBrandLogo}
                        alt="MedLink Africa"
                        decoding="async"
                        className="h-48 w-auto max-w-[min(100%,20rem)] object-contain object-center sm:h-56 sm:max-w-[22rem] md:h-60"
                    />
                    <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-6xl">Admin sign in</h1>
                </header>

                <div className="rounded-2xl border border-border bg-card p-8 shadow-soft">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-3.5 rounded-xl bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-sm font-medium">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-foreground">
                                <Mail className="shrink-0 opacity-80" size={18} strokeWidth={2} aria-hidden />
                                <Label htmlFor="email" className="p-0 text-sm font-medium text-foreground">
                                    Email address
                                </Label>
                            </div>
                            <div className="relative">
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    placeholder="Email address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-foreground">
                                <Lock className="shrink-0 opacity-80" size={18} strokeWidth={2} aria-hidden />
                                <Label htmlFor="password" className="p-0 text-sm font-medium text-foreground">
                                    Password
                                </Label>
                            </div>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    autoComplete="current-password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={`${inputClass} pr-11`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-primary"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff size={20} strokeWidth={2} /> : <Eye size={20} strokeWidth={2} />}
                                </button>
                            </div>
                            {/* <div className="flex justify-end pt-0.5">
                                <button
                                    type="button"
                                    className={`text-sm font-medium ${navy} hover:underline underline-offset-2`}
                                >
                                    Forgot your password?
                                </button>
                            </div> */}
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 text-base font-bold rounded-full bg-primary text-white shadow-md shadow-primary/25 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 focus-visible:ring-primary/40 border-0"
                        >
                            {loading ? 'Signing in...' : 'Sign in'}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
