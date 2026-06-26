import React, { useEffect, useState } from 'react';
import { subscribeToasts } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const icons = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
};

export function Toaster() {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        return subscribeToasts((action) => {
            if (action.type !== 'add' || !action.toast) return;
            const t = action.toast;
            setToasts((prev) => [...prev, t]);
            if (t.duration > 0) {
                window.setTimeout(() => {
                    setToasts((prev) => prev.filter((x) => x.id !== t.id));
                }, t.duration);
            }
        });
    }, []);

    if (toasts.length === 0) return null;

    return (
        <div
            className="fixed top-4 right-4 z-[200] flex w-[min(100vw-2rem,22rem)] flex-col gap-2 pointer-events-none"
            aria-live="polite"
            aria-relevant="additions text"
        >
            {toasts.map((t) => {
                const Icon = icons[t.variant] ?? Info;
                return (
                    <div
                        key={t.id}
                        role="status"
                        className={cn(
                            'pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-soft-lg backdrop-blur-xl animate-in slide-in-from-right-4 fade-in duration-300',
                            t.variant === 'success' &&
                                'border-primary/30 bg-primary/10 text-foreground',
                            t.variant === 'error' &&
                                'border-destructive/40 bg-destructive/10 text-foreground',
                            t.variant === 'info' &&
                                'border-border bg-popover/95 text-foreground'
                        )}
                    >
                        <Icon
                            className={cn(
                                'shrink-0 mt-0.5 h-5 w-5',
                                t.variant === 'success' && 'text-primary',
                                t.variant === 'error' && 'text-destructive',
                                t.variant === 'info' && 'text-primary'
                            )}
                            aria-hidden
                        />
                        <p className="flex-1 text-sm font-medium leading-snug pr-1">{t.message}</p>
                        <button
                            type="button"
                            onClick={() =>
                                setToasts((prev) => prev.filter((x) => x.id !== t.id))
                            }
                            className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground transition-colors"
                            aria-label="Dismiss"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
