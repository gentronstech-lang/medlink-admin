import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, LogOut } from 'lucide-react';
import { MedLinkLogo } from '@/components/brand/MedLinkLogo.jsx';
import { Button } from '@/components/ui/button.jsx';
import { useAuth } from '@/context/AuthContext';
import { LogoutConfirmModal } from '@/components/layout/LogoutConfirmModal.jsx';
import { Sidebar } from './Sidebar';

export function Layout({ children }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [logoutOpen, setLogoutOpen] = useState(false);
    const { logout } = useAuth();
    const navigate = useNavigate();

    const confirmLogout = () => {
        logout();
        navigate('/login', { replace: true });
        setIsSidebarOpen(false);
        setLogoutOpen(false);
    };

    return (
        <div className="min-h-screen bg-mesh bg-dots relative overflow-hidden">
            {/* Ambient orbs */}
            <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -translate-y-1/2" />
            <div className="fixed bottom-0 right-1/4 w-[400px] h-[400px] bg-brand-gold/10 rounded-full blur-[100px] pointer-events-none translate-y-1/2" />

            {/* Mobile Header */}
            <div className="fixed top-0 z-40 flex w-full items-center justify-between gap-2 p-4 glass-dark md:hidden">
                <div className="flex min-w-0 flex-1 items-center">
                    <button
                        type="button"
                        onClick={() => setIsSidebarOpen(true)}
                        className="mr-2 rounded-xl p-2.5 text-foreground transition-all duration-200 hover:bg-accent active:scale-95"
                    >
                        <Menu size={24} />
                    </button>
                    <div className="flex min-w-0 items-center gap-2">
                        <MedLinkLogo className="h-8 max-w-[160px]" />
                    </div>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5 border-border"
                    onClick={() => setLogoutOpen(true)}
                >
                    <LogOut className="size-4" />
                    Logout
                </Button>
            </div>

            {/* Desktop top bar — logout top right */}
            <header className="fixed left-0 top-0 z-40 hidden h-16 w-full items-center justify-end border-b border-border bg-card/85 px-6 backdrop-blur-md md:left-64 md:flex md:px-8">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2 border-border"
                    onClick={() => setLogoutOpen(true)}
                >
                    <LogOut className="size-4" />
                    Logout
                </Button>
            </header>

            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-md z-30 md:hidden animate-fade-in"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <LogoutConfirmModal open={logoutOpen} onOpenChange={setLogoutOpen} onConfirm={confirmLogout} />

            <main className="relative min-h-screen p-4 pt-20 transition-all duration-300 md:ml-64 md:pt-24 md:p-8">
                <div className="mx-auto max-w-7xl animate-slide-up">{children}</div>
            </main>
        </div>
    );
}
