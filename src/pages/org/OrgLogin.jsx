import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import loginBrandLogo from '@/assets/medlink-login-logo.png';
import { Mail, Lock, Building2 } from 'lucide-react';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Button } from '@/components/ui/button.jsx';
import { useOrgAuth } from '@/context/OrgAuthContext';
import { getOrgErrorMessage } from '@/lib/orgApi';

export default function OrgLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useOrgAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/org', { replace: true });
    } catch (err) {
      setError(getOrgErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-mesh bg-dots relative overflow-hidden">
      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/3 w-[450px] h-[450px] bg-primary/15 rounded-full blur-[140px]" />
      <div className="absolute bottom-1/3 right-1/4 w-[350px] h-[350px] bg-brand-gold/12 rounded-full blur-[120px]" />
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2" />

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        {/* Logo */}
        <div className="mb-10 flex flex-col items-center gap-4 text-center">
          <img
            src={loginBrandLogo}
            alt="MedLink Africa"
            decoding="async"
            className="h-48 w-auto max-w-[min(100%,20rem)] object-contain object-center sm:h-56 sm:max-w-[22rem] md:h-60"
          />
          <span className="text-xs font-semibold uppercase tracking-wide text-brand-gold flex items-center justify-center gap-1.5">
            <Building2 size={14} aria-hidden />
            Organization Admin
          </span>
        </div>

        {/* Card */}
        <div className="glass-dark rounded-2xl shadow-soft-lg border border-border p-8">
          <div className="mb-6 h-1 w-14 rounded-full bg-gradient-to-r from-primary to-brand-gold/80" />
          <h1 className="text-2xl font-bold text-foreground mb-1 tracking-tight">Sign in</h1>
          <p className="text-muted-foreground text-sm mb-8">Access your organization panel</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 rounded-xl bg-destructive/20 border border-destructive/30 text-destructive text-sm font-medium">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="font-semibold text-foreground">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="admin@acme.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-12"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="font-semibold text-foreground">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                <Input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12"
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full h-12 text-base">
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </div>

        <p className="text-center text-muted-foreground text-sm mt-8 font-medium">
          Organization Admin Panel • Credentials are provided by Global Admin
        </p>
      </div>
    </div>
  );
}

