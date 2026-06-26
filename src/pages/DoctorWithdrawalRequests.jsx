import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog.jsx';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select.jsx';
import { Banknote, ChevronLeft, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import api, { getPayload } from '@/lib/api';
import { resolveCurrency } from '@/lib/currency';
import { getAdminErrorMessage } from '@/lib/adminErrors';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const DEFAULT_LIMIT = 20;

/** Admin action targets (API); current row status is always included in the select. */
const STATUS_PRESETS = ['PENDING', 'PROCESSING', 'PAID', 'REJECTED', 'FAILED'];

function fmtDate(dt) {
    if (!dt) return '—';
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString();
}

function pickDoctorName(row) {
    const d = row?.doctor;
    if (d && typeof d === 'object') {
        return d.fullName ?? d.full_name ?? d.name ?? '—';
    }
    return row?.doctorName ?? row?.doctor_name ?? (row?.doctorId != null ? `Doctor #${row.doctorId}` : '—');
}

/**
 * List GET: ResponseInterceptor wraps payload; getPayload yields `data` with
 * items, total, page, limit. amount is often string (Prisma Decimal).
 */
function normalizeListResponse(res) {
    const data = getPayload(res) ?? res.data;
    const list = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
          ? data
          : [];
    const total = Number(data?.total);
    const safeTotal = Number.isFinite(total) ? total : list.length;
    const serverPage = data?.page != null ? Number(data.page) : null;
    const limit =
        data?.limit != null && Number.isFinite(Number(data.limit))
            ? Number(data.limit)
            : DEFAULT_LIMIT;
    return { list, total: safeTotal, serverPage, limit };
}

function statusBadgeClass(status) {
    const s = String(status ?? '').toUpperCase();
    if (s === 'PAID') return 'bg-primary/15 text-primary';
    if (s === 'REJECTED' || s === 'FAILED') return 'bg-brand-gold/15 text-brand-gold';
    if (s === 'PROCESSING') return 'bg-brand-gold/15 text-brand-gold';
    if (s === 'PENDING') return 'bg-primary/10 text-primary';
    return 'bg-primary/10 text-primary';
}

function amountLabel(row) {
    const amt = row?.amount;
    if (amt == null || amt === '') return '—';
    const s = typeof amt === 'string' ? amt : String(amt);
    return `${s} ${resolveCurrency(row?.currency)}`;
}

function PayoutSummary({ row }) {
    const p = row?.payout;
    if (p && typeof p === 'object') {
        const bits = [p.provider, p.providerRef].filter(Boolean);
        const line = bits.length ? bits.join(' · ') : '—';
        const paid = p.paidAt ?? row?.paidAt;
        return (
            <div className="text-xs space-y-0.5 max-w-[200px]">
                <div className="text-foreground font-medium truncate" title={line}>
                    {line}
                </div>
                {paid && (
                    <div className="text-muted-foreground whitespace-nowrap">{fmtDate(paid)}</div>
                )}
            </div>
        );
    }
    if (row?.paidAt) {
        return <div className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(row.paidAt)}</div>;
    }
    return <span className="text-muted-foreground">—</span>;
}

export default function DoctorWithdrawalRequests() {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [error, setError] = useState('');

    const [dialogOpen, setDialogOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    const [saving, setSaving] = useState(false);
    const [statusForm, setStatusForm] = useState({
        status: 'PAID',
        reviewerNote: '',
        provider: '',
        providerRef: '',
    });

    const statusSelectOptions = useMemo(() => {
        const cur = selected?.status;
        const set = new Set(STATUS_PRESETS);
        if (cur && typeof cur === 'string') set.add(cur);
        return Array.from(set);
    }, [selected]);

    const fetchList = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/admin/doctor-withdrawal-requests', {
                params: { page, limit: DEFAULT_LIMIT },
            });
            const { list, total: t } = normalizeListResponse(res);
            setItems(list);
            setTotal(t);
        } catch (e) {
            setError(getAdminErrorMessage(e));
            setItems([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    const totalPages = Math.max(1, Math.ceil(total / DEFAULT_LIMIT) || 1);

    const openStatusDialog = (row) => {
        setSelected(row);
        const rowStatus = row?.status && typeof row.status === 'string' ? row.status : 'PENDING';
        const po = row?.payout && typeof row.payout === 'object' ? row.payout : null;
        setStatusForm({
            status: rowStatus,
            reviewerNote: row?.reviewerNote != null ? String(row.reviewerNote) : '',
            provider: po?.provider != null ? String(po.provider) : '',
            providerRef: po?.providerRef != null ? String(po.providerRef) : '',
        });
        setDialogOpen(true);
    };

    const submitStatus = async (e) => {
        e.preventDefault();
        if (!selected?.id) return;
        setSaving(true);
        try {
            const body = {
                status: statusForm.status,
                reviewerNote: statusForm.reviewerNote.trim() || undefined,
                provider: statusForm.provider.trim() || undefined,
                providerRef: statusForm.providerRef.trim() || undefined,
            };
            await api.patch(`/admin/doctor-withdrawal-requests/${selected.id}/status`, body);
            setDialogOpen(false);
            setSelected(null);
            await fetchList();
        } catch (e2) {
            toast.error(getAdminErrorMessage(e2));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
                        <Banknote className="w-8 h-8 text-primary shrink-0" />
                        Doctor withdrawal requests
                    </h1>
                    <p className="text-brand-gold mt-1 font-medium">
                        List is sorted by <span className="text-brand-gold">createdAt</span> descending;
                        <span className="text-brand-gold"> payout</span> appears once PAID with a linked
                        payout record.
                    </p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    className="gap-2 shrink-0"
                    onClick={() => fetchList()}
                    disabled={loading}
                >
                    <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
                    Refresh
                </Button>
            </div>

            <Card className="border-border overflow-hidden hover:shadow-card">
                <CardHeader className="border-b border-border py-4">
                    <CardTitle className="text-lg text-[#004d4d]">Requests</CardTitle>
                    <p className="text-xs text-brand-gold font-normal">
                        Response <code className="text-primary/90">data</code>: items, total, page, limit (wrapped by
                        interceptor).
                    </p>
                </CardHeader>
                <CardContent className="p-0">
                    {error && (
                        <div className="p-4 text-sm text-destructive bg-destructive/10 border-b border-destructive/20">
                            {error}
                        </div>
                    )}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-sm font-medium">Loading requests…</p>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="py-16 text-center text-muted-foreground text-sm font-medium">
                            No withdrawal requests found
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                                        <th className="px-4 py-3 font-semibold">ID</th>
                                        <th className="px-4 py-3 font-semibold">Doctor</th>
                                        <th className="px-4 py-3 font-semibold">Amount</th>
                                        <th className="px-4 py-3 font-semibold">Status</th>
                                        <th className="px-4 py-3 font-semibold">Payout</th>
                                        <th className="px-4 py-3 font-semibold max-w-[140px]">Note</th>
                                        <th className="px-4 py-3 font-semibold">Created</th>
                                        <th className="px-4 py-3 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((row) => (
                                        <tr
                                            key={row.id}
                                            className="border-b border-border/80 hover:bg-accent/30 transition-colors"
                                        >
                                            <td className="px-4 py-3 font-mono text-xs align-top">{row.id}</td>
                                            <td className="px-4 py-3 max-w-[180px] align-top">
                                                <span className="font-medium text-foreground truncate block">
                                                    {pickDoctorName(row)}
                                                </span>
                                                {row.doctorId != null && (
                                                    <span className="text-[10px] text-muted-foreground">
                                                        doctor #{row.doctorId}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 tabular-nums align-top whitespace-nowrap">
                                                {amountLabel(row)}
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <span
                                                    className={cn(
                                                        'inline-flex px-2 py-0.5 rounded-md text-xs font-semibold',
                                                        statusBadgeClass(row.status)
                                                    )}
                                                >
                                                    {row.status ?? '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <PayoutSummary row={row} />
                                            </td>
                                            <td className="px-4 py-3 align-top max-w-[160px]">
                                                <span
                                                    className="text-xs text-muted-foreground line-clamp-2"
                                                    title={row.reviewerNote || ''}
                                                >
                                                    {row.reviewerNote != null && row.reviewerNote !== ''
                                                        ? row.reviewerNote
                                                        : '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap align-top text-xs">
                                                {fmtDate(row.createdAt)}
                                            </td>
                                            <td className="px-4 py-3 text-right align-top">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => openStatusDialog(row)}
                                                >
                                                    Update status
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {!loading && items.length > 0 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border bg-muted/20">
                            <p className="text-xs text-muted-foreground">
                                Page {page} of {totalPages} · limit {DEFAULT_LIMIT} · {total} total
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={page <= 1 || loading}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    className="gap-1"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Previous
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={page >= totalPages || loading}
                                    onClick={() => setPage((p) => p + 1)}
                                    className="gap-1"
                                >
                                    Next
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-md">
                    <form onSubmit={submitStatus}>
                        <DialogHeader>
                            <DialogTitle>Update withdrawal status</DialogTitle>
                            <p className="text-sm text-muted-foreground">
                                PATCH{' '}
                                <code className="text-xs text-primary/90 break-all">
                                    /admin/doctor-withdrawal-requests/{selected?.id ?? 'id'}/status
                                </code>
                                <span className="block mt-1">
                                    Response returns the updated request (with{' '}
                                    <code className="text-xs">doctor</code>,{' '}
                                    <code className="text-xs">payout</code> when applicable) inside{' '}
                                    <code className="text-xs">data</code>.
                                </span>
                            </p>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select
                                    value={statusForm.status}
                                    onValueChange={(v) =>
                                        setStatusForm((f) => ({ ...f, status: v }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statusSelectOptions.map((s) => (
                                            <SelectItem key={s} value={s}>
                                                {s}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reviewerNote">Reviewer note</Label>
                                <Textarea
                                    id="reviewerNote"
                                    rows={2}
                                    placeholder="Processed"
                                    value={statusForm.reviewerNote}
                                    onChange={(e) =>
                                        setStatusForm((f) => ({
                                            ...f,
                                            reviewerNote: e.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="provider">Provider</Label>
                                <Input
                                    id="provider"
                                    placeholder="Bank"
                                    value={statusForm.provider}
                                    onChange={(e) =>
                                        setStatusForm((f) => ({
                                            ...f,
                                            provider: e.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="providerRef">Provider reference</Label>
                                <Input
                                    id="providerRef"
                                    placeholder="TXN-123"
                                    value={statusForm.providerRef}
                                    onChange={(e) =>
                                        setStatusForm((f) => ({
                                            ...f,
                                            providerRef: e.target.value,
                                        }))
                                    }
                                />
                            </div>
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setDialogOpen(false)}
                                disabled={saving}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={saving} className="gap-2">
                                {saving ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : null}
                                Save
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
