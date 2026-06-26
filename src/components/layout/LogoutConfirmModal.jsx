import React from 'react';
import { createPortal } from 'react-dom';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';

export function LogoutConfirmModal({ open, onOpenChange, onConfirm, title = 'Logout' }) {
    if (!open) return null;
    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm dark:bg-black/70 dark:backdrop-blur-md"
                onClick={() => onOpenChange(false)}
                onKeyDown={(e) => e.key === 'Escape' && onOpenChange(false)}
                role="presentation"
            />
            <div className="relative w-full max-w-sm rounded-2xl border border-border bg-popover p-6 shadow-soft-lg animate-slide-up">
                <div className="mb-6 flex flex-col items-center gap-4 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-destructive/15 ring-2 ring-destructive/20 dark:bg-destructive/20 dark:ring-destructive/30">
                        <LogOut size={24} className="text-destructive" />
                    </div>
                    <div className="text-center">
                        <h3 className="text-lg font-bold text-foreground">{title}</h3>
                        <p className="mt-0.5 text-sm text-muted-foreground">Are you sure you want to logout?</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button variant="destructive" className="flex-1" onClick={onConfirm}>
                        Logout
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
}
