import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { LogoutConfirmModal } from '@/components/layout/LogoutConfirmModal.jsx';
import { MedLinkLogo } from '@/components/brand/MedLinkLogo.jsx';
import {
    LayoutDashboard,
    Users,
    Stethoscope,
    Calendar,
    Wallet,
    Banknote,
    FileText,
    Clapperboard,
    Bell,
    AlertTriangle,
    ShieldCheck,
    Building2,
    UserCog,
    Settings,
    LogOut,
    ChevronRight,
    ChevronDown,
} from 'lucide-react';

/** Top-level items and collapsible groups (relevant submenus). */
const navConfig = [
    { kind: 'link', icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    {
        kind: 'group',
        id: 'doctors',
        icon: Stethoscope,
        label: 'Doctors',
        items: [
            { icon: Stethoscope, label: 'All doctors', path: '/doctors' },
            { icon: Banknote, label: 'Withdrawals', path: '/doctor-withdrawals' },
        ],
    },
    {
        kind: 'group',
        id: 'care',
        icon: Users,
        label: 'Patients & care',
        items: [
            { icon: Users, label: 'Patients', path: '/patients' },
            { icon: Calendar, label: 'Appointments', path: '/appointments' },
        ],
    },
    { kind: 'link', icon: ShieldCheck, label: 'Specialties', path: '/specialties' },
    { kind: 'link', icon: Wallet, label: 'Earnings', path: '/earnings' },
    {
        kind: 'group',
        id: 'content',
        icon: FileText,
        label: 'Content & reach',
        items: [
            { icon: FileText, label: 'Content', path: '/content' },
            { icon: Clapperboard, label: 'Reels', path: '/reels' },
            { icon: Bell, label: 'Notifications', path: '/notifications' },
        ],
    },
    {
        kind: 'group',
        id: 'organizations',
        icon: Building2,
        label: 'Organizations',
        items: [
            { icon: Building2, label: 'All organizations', path: '/organizations' },
            { icon: UserCog, label: 'Org admins', path: '/organization-admins' },
        ],
    },
    { kind: 'link', icon: AlertTriangle, label: 'SOS Events', path: '/sos-events' },

    { kind: 'link', icon: Settings, label: 'Settings', path: '/settings' },
];

function groupContainsPath(group, pathname) {
    return group.items.some((item) => pathname === item.path);
}

export function Sidebar({ isOpen, onClose }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const defaultOpen = useMemo(() => {
        const set = new Set();
        navConfig.forEach((entry) => {
            if (entry.kind === 'group' && groupContainsPath(entry, location.pathname)) {
                set.add(entry.id);
            }
        });
        return set;
    }, [location.pathname]);

    const selectedFromRoute = useMemo(() => {
        for (const entry of navConfig) {
            if (entry.kind === 'link' && location.pathname === entry.path) return entry.path;
            if (entry.kind === 'group' && groupContainsPath(entry, location.pathname)) return location.pathname;
        }
        return null;
    }, [location.pathname]);

    const [openGroups, setOpenGroups] = useState(() => defaultOpen);
    const [selectedKey, setSelectedKey] = useState(() => selectedFromRoute);

    useEffect(() => {
        setSelectedKey(selectedFromRoute);
    }, [selectedFromRoute]);

    useEffect(() => {
        setOpenGroups((prev) => {
            const next = new Set(prev);
            navConfig.forEach((entry) => {
                if (entry.kind === 'group' && groupContainsPath(entry, location.pathname)) {
                    next.add(entry.id);
                }
            });
            return next;
        });
    }, [location.pathname]);

    const toggleGroup = (id) => {
        setOpenGroups((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const confirmLogout = () => {
        logout();
        navigate('/login', { replace: true });
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
            <div className="relative h-20 flex items-center px-5 border-b border-border overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
                <div className="relative flex min-w-0 flex-1 items-center py-1">
                    <MedLinkLogo className="h-16 w-full max-w-none object-cover object-center" />
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-1">
                {navConfig.map((entry) => {
                    if (entry.kind === 'link') {
                        const isActive = selectedKey === entry.path;
                        const Icon = entry.icon;
                        return (
                            <Link
                                key={entry.path}
                                to={entry.path}
                                onClick={() => {
                                    setSelectedKey(entry.path);
                                    onClose?.();
                                }}
                                className={cn(
                                    'relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium group',
                                    isActive
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'text-black hover:bg-accent/50 hover:text-black'
                                )}
                            >
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                                )}
                                <div
                                    className={cn(
                                        'flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200',
                                        isActive ? 'bg-white/10' : 'bg-transparent group-hover:bg-primary/10'
                                    )}
                                >
                                    <Icon
                                        size={18}
                                        className={cn(
                                            isActive
                                                ? 'text-primary-foreground'
                                                : 'text-black group-hover:text-black'
                                        )}
                                    />
                                </div>
                                <span className="flex-1">{entry.label}</span>
                                <ChevronRight
                                    size={16}
                                    className={cn(
                                        'opacity-0 -translate-x-1 transition-all duration-200',
                                        isActive
                                            ? 'opacity-100 text-primary-foreground/70'
                                            : 'group-hover:opacity-50 group-hover:translate-x-0'
                                    )}
                                />
                            </Link>
                        );
                    }

                    const expanded = openGroups.has(entry.id);
                    const childActive = groupContainsPath(entry, location.pathname);
                    const groupSelected = selectedKey === entry.id;
                    const GroupIcon = entry.icon;

                    return (
                        <div
                            key={entry.id}
                            className={cn(
                                'rounded-xl transition-all duration-200',
                                expanded &&
                                    'bg-muted/80 border border-border/90 shadow-sm px-1.5 py-1.5'
                            )}
                        >
                            <button
                                type="button"
                                onClick={() => {
                                    toggleGroup(entry.id);
                                    setSelectedKey(entry.id);
                                }}
                                className={cn(
                                    'relative flex w-full items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 font-medium text-left',
                                    groupSelected
                                        ? 'bg-primary text-primary-foreground font-semibold border-b border-primary/40 mb-1'
                                        : expanded
                                            ? 'text-black font-semibold bg-muted/90 hover:bg-muted border-b border-border/60 mb-1'
                                            : 'text-black hover:bg-accent/50 hover:text-black'
                                )}
                                aria-expanded={expanded}
                            >
                                <div
                                    className={cn(
                                        'flex items-center justify-center w-9 h-9 rounded-lg transition-colors',
                                        groupSelected && 'bg-white/10',
                                        expanded && !childActive && 'bg-background/50 ring-1 ring-border/50',
                                        !expanded && groupSelected && 'bg-white/10',
                                        !expanded && !childActive && 'bg-transparent'
                                    )}
                                >
                                    <GroupIcon
                                        size={18}
                                        className={cn(
                                            groupSelected
                                                ? 'text-primary-foreground'
                                                : expanded
                                                    ? 'text-primary'
                                                    : 'text-black'
                                        )}
                                    />
                                </div>
                                <span className="flex-1">{entry.label}</span>
                                <ChevronDown
                                    size={16}
                                    className={cn(
                                        'shrink-0 transition-transform duration-200',
                                        expanded
                                            ? groupSelected
                                                ? 'text-primary-foreground/80 rotate-180'
                                                : 'text-black/80 rotate-180'
                                            : groupSelected
                                                ? 'text-primary-foreground'
                                                : 'text-black'
                                    )}
                                />
                            </button>
                            {expanded && (
                                <div className="ml-1 pl-2.5 border-l-2 border-primary/30 space-y-0.5 py-0.5">
                                    {entry.items.map((item) => {
                                        const isActive = selectedKey === item.path;
                                        const SubIcon = item.icon;
                                        return (
                                            <Link
                                                key={item.path}
                                                to={item.path}
                                                onClick={() => {
                                                    setSelectedKey(item.path);
                                                    onClose?.();
                                                }}
                                                className={cn(
                                                    'relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                                                    isActive
                                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                                        : 'text-black bg-background/40 hover:bg-background/90 hover:text-black'
                                                )}
                                            >
                                                <SubIcon
                                                    size={16}
                                                    className={cn(
                                                        'shrink-0',
                                                        isActive
                                                            ? 'text-primary-foreground'
                                                            : 'text-black'
                                                    )}
                                                />
                                                <span className="flex-1">{item.label}</span>
                                                <ChevronRight
                                                    size={14}
                                                    className={cn(
                                                        'opacity-0 shrink-0',
                                                        isActive && 'opacity-70'
                                                    )}
                                                />
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-border">
                <div className="flex items-center gap-2 mb-3 px-2">
                    <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
                </div>
                <button
                    type="button"
                    onClick={() => setShowLogoutModal(true)}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-black hover:bg-accent/40 hover:text-black transition-all duration-200 font-medium group"
                >
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-transparent group-hover:bg-accent/60 transition-colors">
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
