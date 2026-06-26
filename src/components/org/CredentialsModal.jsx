import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Copy, TriangleAlert } from 'lucide-react';

export function CredentialsModal({ open, onOpenChange, title = 'Credentials', credentials }) {
  const canCopy = !!credentials?.password && (!!credentials?.email || !!credentials?.phone);

  const copyText = async () => {
    const lines = [
      credentials?.email ? `Email: ${credentials.email}` : null,
      credentials?.phone ? `Phone: ${credentials.phone}` : null,
      credentials?.password ? `Password: ${credentials.password}` : null,
    ].filter(Boolean);

    const text = lines.join('\n');

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore; button remains best-effort
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-4 space-y-2 text-sm">
            {credentials?.email && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Email</span>
                <span className="font-semibold text-foreground break-all">{credentials.email}</span>
              </div>
            )}
            {credentials?.phone && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-semibold text-foreground break-all">{credentials.phone}</span>
              </div>
            )}
            {credentials?.password && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Password</span>
                <span className="font-semibold text-foreground break-all">{credentials.password}</span>
              </div>
            )}
          </div>

          <div className="rounded-xl bg-brand-gold/10 border border-brand-gold/20 p-4 flex gap-3">
            <TriangleAlert className="text-brand-gold mt-0.5" size={18} />
            <div className="text-sm">
              <div className="font-semibold text-foreground">Password will not be shown again</div>
              <div className="text-muted-foreground mt-0.5">Copy and share it with the user now.</div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button className="flex-1" onClick={copyText} disabled={!canCopy}>
              <Copy size={16} className="mr-2" />
              Copy
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

