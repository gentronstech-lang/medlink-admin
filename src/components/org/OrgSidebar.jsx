import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LogoutConfirmModal } from '@/components/layout/LogoutConfirmModal.jsx';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useOrgAuth } from '@/context/OrgAuthContext';
import { MedLinkLogo } from '@/components/brand/MedLinkLogo.jsx';
import { Building2, LayoutDashboard, Users, UserCog, LogOut, X, ChevronRight } from 'lucide-react';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/org' },
  { icon: Users, label: 'Drivers', path: '/org/drivers' },
  { icon: UserCog, label: 'Admins', path: '/org/admins' },
];

export function OrgSidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, admin } = useOrgAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const confirmLogout = () => {
    logout();
    navigate('/org/login', { replace: true });
    onClose?.();
    setShowLogoutModal(false);
  };

  return (
    <aside
      className={cn(
        'w-64 h-screen fixed left-0 top-0 flex flex-col z-50 transition-transform duration-300 md:translate-x-0',
        'bg-card/95 backdrop-blur-2xl border-r border-border shadow-soft',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      {/* Logo + Theme */}
      <div className="relative h-20 flex items-center justify-between px-5 border-b border-border overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="relative flex min-w-0 flex-1 flex-col justify-center gap-0.5 py-1">
          <MedLinkLogo className="h-8 max-h-9 w-auto max-w-[min(100%,210px)] sm:h-9" />
          <span className="text-[9px] font-semibold uppercase tracking-wider text-brand-gold flex items-center gap-1">
            <Building2 className="size-3 opacity-80" aria-hidden />
            Org Admin
          </span>
        </div>
        <div className="relative flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={onClose}
            className="md:hidden relative p-2.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-all duration-200"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Identity */}
      <div className="px-5 py-4 border-b border-border">
        <div className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">Signed in</div>
        <div className="mt-2">
          <div className="font-bold text-foreground leading-tight">{admin?.fullName || '—'}</div>
          <div className="text-xs text-muted-foreground mt-0.5 break-all">{admin?.email || '—'}</div>
          <div className="text-xs text-primary mt-1 font-semibold">
            {admin?.organization?.name || admin?.organizationName || ''}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-0.5">
        <div className="mb-4 px-4 flex items-center gap-2">
          <div className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Org</span>
          <div className="h-px w-8 bg-gradient-to-l from-primary/20 to-transparent" />
        </div>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={cn(
                'relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium group',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              )}
            >
              {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />}
              <div
                className={cn(
                  'flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200',
                  isActive ? 'bg-white/10' : 'bg-transparent group-hover:bg-primary/10'
                )}
              >
                <Icon size={18} className={cn(isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-primary/80')} />
              </div>
              <span className="flex-1">{item.label}</span>
              <ChevronRight
                size={16}
                className={cn(
                  'opacity-0 -translate-x-1 transition-all duration-200',
                  isActive ? 'opacity-100 text-primary-foreground/70' : 'group-hover:opacity-50 group-hover:translate-x-0'
                )}
              />
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2 mb-3 px-2">
          <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
        </div>
        <button
          onClick={() => setShowLogoutModal(true)}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200 font-medium group"
        >
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-transparent group-hover:bg-destructive/20 transition-colors">
            <LogOut size={18} />
          </div>
          <span>Logout</span>
        </button>
      </div>

      <LogoutConfirmModal
        open={showLogoutModal}
        onOpenChange={setShowLogoutModal}
        onConfirm={confirmLogout}
      />
    </aside>
  );
}

