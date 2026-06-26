import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { AlertTriangle, Eye, RefreshCw } from 'lucide-react';
import api, { getPayload } from '@/lib/api';
import { getAdminErrorMessage } from '@/lib/adminErrors';
import { cn } from '@/lib/utils';

function fmtDate(value) {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString();
}

function roleBadge(role) {
    const normalized = String(role ?? '').toUpperCase();
    if (normalized === 'PATIENT') return 'bg-primary/15 text-primary';
    if (normalized === 'DRIVER') return 'bg-brand-gold/15 text-brand-gold';
    return 'bg-muted text-muted-foreground';
}

function statusBadge(status) {
    const s = String(status ?? '').toUpperCase();
    if (s === 'OPEN') return 'bg-brand-gold/15 text-brand-gold';
    if (s === 'CLOSED') return 'bg-primary/15 text-primary';
    return 'bg-muted text-muted-foreground';
}

export default function SosEvents() {
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selected, setSelected] = useState(null);

    const fetchEvents = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/admin/sos-events/full-details');
            const data = getPayload(res) ?? res.data ?? {};
            const list = Array.isArray(data?.items) ? data.items : [];
            setItems(list);
            setTotal(Number.isFinite(Number(data?.total)) ? Number(data.total) : list.length);
        } catch (e) {
            setError(getAdminErrorMessage(e));
            setItems([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const selectedMeta = useMemo(() => selected?.meta ?? {}, [selected]);

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
                        <AlertTriangle className="w-8 h-8 text-primary shrink-0" />
                        SOS Events
                    </h1>
                    <p className="text-brand-gold mt-1 font-medium">Emergency SOS events with trip and message details</p>
                </div>
                <Button type="button" variant="outline" className="gap-2 shrink-0" onClick={fetchEvents} disabled={loading}>
                    <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
                    Refresh
                </Button>
            </div>

            <Card className="border-border overflow-hidden hover:shadow-card">
                <CardHeader className="border-b border-border py-4">
                    <CardTitle className="text-lg">All SOS Events</CardTitle>
                    <p className="text-xs text-[#26a69a] font-normal">Response data: items, total</p>
                </CardHeader>
                <CardContent className="p-0">
                    {error && (
                        <div className="p-4 text-sm text-destructive bg-destructive/10 border-b border-destructive/20">
                            {error}
                        </div>
                    )}
                    {loading ? (
                        <div className="py-16 text-center text-muted-foreground font-medium">Loading SOS events...</div>
                    ) : items.length === 0 ? (
                        <div className="py-16 text-center text-muted-foreground font-medium">No SOS events found.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                                        <th className="px-4 py-3 font-semibold">ID</th>
                                        <th className="px-4 py-3 font-semibold">Patient</th>
                                        <th className="px-4 py-3 font-semibold">Driver</th>
                                        <th className="px-4 py-3 font-semibold">Status</th>
                                        <th className="px-4 py-3 font-semibold text-right">Messages</th>
                                        <th className="px-4 py-3 font-semibold text-right">Trips</th>
                                        <th className="px-4 py-3 font-semibold">Created</th>
                                        <th className="px-4 py-3 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((row) => (
                                        <tr key={row.id} className="border-b border-border/80 hover:bg-accent/30 transition-colors">
                                            <td className="px-4 py-3 font-semibold text-foreground">#{row.id}</td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-foreground">{row.patient?.fullName ?? '—'}</div>
                                                <div className="text-xs text-muted-foreground">{row.patient?.phone ?? '—'}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-foreground">{row.assignedDriver?.fullName ?? '—'}</div>
                                                <div className="text-xs text-muted-foreground">{row.assignedDriver?.phone ?? '—'}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={cn('inline-flex px-2 py-0.5 rounded-md text-xs font-semibold', statusBadge(row.status))}>
                                                    {row.status ?? '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{row.meta?.sosMessageCount ?? row.messages?.length ?? 0}</td>
                                            <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{row.meta?.tripCount ?? row.trips?.length ?? 0}</td>
                                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmtDate(row.createdAt)}</td>
                                            <td className="px-4 py-3 text-right">
                                                <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setSelected(row)}>
                                                    <Eye className="h-4 w-4" />
                                                    View
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {!loading && (
                        <div className="px-4 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
                            Total: {total}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    {selected && (
                        <>
                            <DialogHeader>
                                <DialogTitle>SOS Event #{selected.id}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="rounded-xl border border-border p-4 bg-surface/40">
                                        <p className="text-xs text-brand-gold font-semibold mb-1">Status</p>
                                        <span className={cn('inline-flex px-2 py-0.5 rounded-md text-xs font-semibold', statusBadge(selected.status))}>
                                            {selected.status ?? '—'}
                                        </span>
                                    </div>
                                    <div className="rounded-xl border border-border p-4 bg-surface/40">
                                        <p className="text-xs text-brand-gold font-semibold mb-1">Created</p>
                                        <p className="text-sm text-foreground">{fmtDate(selected.createdAt)}</p>
                                    </div>
                                    <div className="rounded-xl border border-border p-4 bg-surface/40">
                                        <p className="text-xs text-brand-gold font-semibold mb-1">Updated</p>
                                        <p className="text-sm text-foreground">{fmtDate(selected.updatedAt)}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="rounded-xl border border-border p-4">
                                        <p className="text-xs text-brand-gold font-semibold mb-2">Patient</p>
                                        <p className="text-sm font-medium text-foreground">{selected.patient?.fullName ?? '—'}</p>
                                        <p className="text-xs text-muted-foreground mt-1">{selected.patient?.phone ?? '—'}</p>
                                    </div>
                                    <div className="rounded-xl border border-border p-4">
                                        <p className="text-xs text-brand-gold font-semibold mb-2">Assigned Driver</p>
                                        <p className="text-sm font-medium text-foreground">{selected.assignedDriver?.fullName ?? '—'}</p>
                                        <p className="text-xs text-muted-foreground mt-1">{selected.assignedDriver?.phone ?? '—'}</p>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-border p-4">
                                    <p className="text-xs text-brand-gold font-semibold mb-2">Meta</p>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                        <div className="bg-surface/40 rounded-lg p-2">SOS messages: <span className="font-semibold">{selectedMeta.sosMessageCount ?? 0}</span></div>
                                        <div className="bg-surface/40 rounded-lg p-2">Trips: <span className="font-semibold">{selectedMeta.tripCount ?? 0}</span></div>
                                        <div className="bg-surface/40 rounded-lg p-2">Trip messages: <span className="font-semibold">{selectedMeta.tripMessageCount ?? 0}</span></div>
                                        <div className="bg-surface/40 rounded-lg p-2">Trip locations: <span className="font-semibold">{selectedMeta.tripLocationPointCount ?? 0}</span></div>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-border p-4">
                                    <p className="text-xs text-brand-gold font-semibold mb-2">Messages</p>
                                    {(selected.messages ?? []).length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No messages.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {(selected.messages ?? []).map((m) => (
                                                <div key={m.id} className="rounded-lg border border-border bg-surface/40 p-3">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={cn('inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold', roleBadge(m.sender?.role))}>
                                                            {m.sender?.role ?? '—'}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">{m.sender?.fullName ?? 'Unknown'} → {m.receiver?.fullName ?? 'Unknown'}</span>
                                                        <span className="ml-auto text-xs text-muted-foreground">{fmtDate(m.sentAt)}</span>
                                                    </div>
                                                    <p className="text-sm text-foreground">{m.message ?? '—'}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-xl border border-border p-4">
                                    <p className="text-xs text-brand-gold font-semibold mb-2">Trips</p>
                                    {(selected.trips ?? []).length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No trips.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {(selected.trips ?? []).map((trip) => (
                                                <div key={trip.id} className="rounded-lg border border-border bg-surface/40 p-3">
                                                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                        <span className={cn('inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold', statusBadge(trip.status))}>
                                                            {trip.status ?? '—'}
                                                        </span>
                                                        <span>Trip #{trip.id}</span>
                                                        <span>Requested: {fmtDate(trip.requestedAt)}</span>
                                                    </div>
                                                    <p className="mt-2 text-sm text-foreground">
                                                        Driver: {trip.driver?.fullName ?? '—'} ({trip.driver?.driverProfile?.vehicleType ?? '—'} / {trip.driver?.driverProfile?.vehiclePlate ?? '—'})
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

