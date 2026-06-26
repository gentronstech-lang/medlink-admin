import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Send, Bell, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select.jsx';
import api, { getPayload } from '@/lib/api';
import { toast } from '@/lib/toast';
import { getAdminErrorMessage } from '@/lib/adminErrors';
import { cn } from '@/lib/utils';

const AUDIENCE_API = {
    all: 'ALL',
    patients: 'PATIENTS',
    doctors: 'DOCTORS',
    drivers: 'DRIVERS',
    single: 'SINGLE',
};

const ROLE_PARAM = {
    patient: 'PATIENT',
    doctor: 'DOCTOR',
    driver: 'DRIVER',
};

const HISTORY_LIMIT = 20;

function normalizeRecipientList(raw) {
    const p = Array.isArray(raw)
        ? raw
        : raw?.data ?? raw?.items ?? raw?.recipients ?? raw?.options ?? raw?.users ?? [];
    if (!Array.isArray(p)) return [];
    return p
        .map((x) => {
            const id = x.id ?? x.userId ?? x.user_id ?? x.appUserId ?? x.targetUserId;
            const label =
                x.label ??
                x.name ??
                x.fullName ??
                x.email ??
                x.phone ??
                (id != null ? `User #${id}` : null);
            const uid = Number(id);
            if (!Number.isFinite(uid) || uid <= 0 || label == null) return null;
            return { id: uid, label: String(label) };
        })
        .filter(Boolean);
}

function historyListFromResponse(payload) {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== 'object') return [];
    const list = payload.items ?? payload.data ?? payload.rows ?? payload.history;
    if (Array.isArray(list)) return list;
    if (Array.isArray(payload.data) && !payload.items) return payload.data;
    return [];
}

function historyTotalFromResponse(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
    if (Number.isFinite(Number(payload.total))) return Number(payload.total);
    if (Number.isFinite(Number(payload.count))) return Number(payload.count);
    return null;
}

function formatHistoryItem(row) {
    const createdAt = row.createdAt ?? row.created_at ?? row.sentAt ?? row.at ?? row.date;
    return {
        id: row.id ?? `${createdAt ?? ''}-${row.title}`,
        title: row.title ?? '—',
        body: row.body ?? row.message ?? '—',
        notifType: row.notifType ?? row.type ?? row.notif_type ?? '—',
        audience: row.audience ?? '—',
        targetUserId: row.targetUserId ?? row.target_user_id ?? row.userId ?? null,
        at: createdAt,
    };
}

export default function PushNotifications() {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [audience, setAudience] = useState('all');
    const [type, setType] = useState('INFO');
    const [loading, setLoading] = useState(false);

    const [singleRole, setSingleRole] = useState('patient');
    const [recipientOptions, setRecipientOptions] = useState([]);
    const [targetUserId, setTargetUserId] = useState(null);
    const [optionsLoading, setOptionsLoading] = useState(false);
    const [manualUserId, setManualUserId] = useState('');

    const [historyPage, setHistoryPage] = useState(1);
    const [historyItems, setHistoryItems] = useState([]);
    const [historyTotal, setHistoryTotal] = useState(null);
    const [historyHasMore, setHistoryHasMore] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(true);

    const isSingle = audience === 'single';
    const trimmedManual = manualUserId.trim();

    const loadRecipientOptions = useCallback(async () => {
        if (!isSingle) return;
        setOptionsLoading(true);
        setRecipientOptions([]);
        setTargetUserId(null);
        try {
            const res = await api.get('/admin/push-notifications/recipient-options', {
                params: { role: ROLE_PARAM[singleRole] ?? 'PATIENT' },
            });
            const data = getPayload(res) ?? res.data;
            setRecipientOptions(normalizeRecipientList(data));
        } catch (error) {
            console.error('Failed to load recipient options', error);
            toast.error(getAdminErrorMessage(error) || 'Could not load users for this role');
        } finally {
            setOptionsLoading(false);
        }
    }, [isSingle, singleRole]);

    const fetchHistory = useCallback(async (page = 1) => {
        setHistoryLoading(true);
        try {
            const res = await api.get('/admin/push-notifications/history', {
                params: { page, limit: HISTORY_LIMIT },
            });
            const data = getPayload(res) ?? res.data ?? {};
            const list = historyListFromResponse(data);
            setHistoryItems(list.map(formatHistoryItem));
            const total = historyTotalFromResponse(data);
            setHistoryTotal(total != null ? total : null);
            setHistoryHasMore(
                total == null
                    ? list.length >= HISTORY_LIMIT
                    : page * HISTORY_LIMIT < total
            );
            setHistoryPage(page);
        } catch (error) {
            console.error('Failed to load notification history', error);
            toast.error(getAdminErrorMessage(error) || 'Could not load history');
            setHistoryItems([]);
            setHistoryTotal(0);
            setHistoryHasMore(false);
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHistory(1);
    }, [fetchHistory]);

    useEffect(() => {
        if (isSingle) {
            loadRecipientOptions();
        } else {
            setRecipientOptions([]);
            setTargetUserId(null);
            setManualUserId('');
        }
    }, [isSingle, loadRecipientOptions]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!title || !body) {
            toast.error('Please enter title and message');
            return;
        }
        const audienceValue = AUDIENCE_API[audience] ?? 'ALL';
        const payload = {
            audience: audienceValue,
            title,
            body,
            notifType: type || 'INFO',
        };

        if (audienceValue === 'SINGLE') {
            let uid;
            if (trimmedManual) {
                uid = Number(trimmedManual);
            } else if (targetUserId != null) {
                uid = Number(targetUserId);
            } else {
                uid = NaN;
            }
            if (!Number.isFinite(uid) || uid <= 0) {
                toast.error('Select a user from the list or enter a valid user ID');
                return;
            }
            payload.targetUserId = uid;
        }

        try {
            setLoading(true);
            await api.post('/admin/push-notifications/send', payload);
            setTitle('');
            setBody('');
            setTargetUserId(null);
            setManualUserId('');
            toast.success('Notification sent successfully');
            await fetchHistory(1);
        } catch (error) {
            console.error('Failed to send notification', error);
            toast.error(
                'Error sending notification: ' +
                    (error.response?.data?.message || error.message)
            );
        } finally {
            setLoading(false);
        }
    };

    const totalPages =
        historyTotal != null && historyTotal > 0
            ? Math.max(1, Math.ceil(historyTotal / HISTORY_LIMIT))
            : null;
    const canPrev = historyPage > 1;
    const canNext =
        totalPages != null ? historyPage < totalPages : historyHasMore;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight">Push Notifications</h1>
                <p className="text-brand-gold mt-1 font-medium">Send notifications to users</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="hover:shadow-card">
                    <CardHeader>
                        <CardTitle className="text-[#004d4d]">Send New Notification</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSend} className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[#004d4d]">Send to</Label>
                                <Select value={audience} onValueChange={setAudience}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Choose recipients" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="patients">Patients</SelectItem>
                                        <SelectItem value="doctors">Doctors</SelectItem>
                                        <SelectItem value="drivers">Drivers</SelectItem>
                                        <SelectItem value="single">Single user</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    {isSingle
                                        ? 'Pick a role, then choose a user or enter a user ID.'
                                        : 'Broadcast to everyone or to one role only.'}
                                </p>
                            </div>

                            {isSingle && (
                                <>
                                    <div className="space-y-2">
                                        <Label className="text-[#004d4d]">User role (for list)</Label>
                                        <Select
                                            value={singleRole}
                                            onValueChange={setSingleRole}
                                            disabled={optionsLoading}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="patient">Patient</SelectItem>
                                                <SelectItem value="doctor">Doctor</SelectItem>
                                                <SelectItem value="driver">Driver</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <Label className="text-[#004d4d]">User</Label>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-xs"
                                                onClick={loadRecipientOptions}
                                                disabled={optionsLoading}
                                            >
                                                <RefreshCw
                                                    className={cn(
                                                        'w-3.5 h-3.5 mr-1',
                                                        optionsLoading && 'animate-spin'
                                                    )}
                                                />
                                                Refresh
                                            </Button>
                                        </div>
                                        <Select
                                            value={targetUserId != null ? String(targetUserId) : undefined}
                                            onValueChange={(v) => setTargetUserId(v ? Number(v) : null)}
                                            disabled={optionsLoading}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue
                                                    placeholder={
                                                        optionsLoading
                                                            ? 'Loading...'
                                                            : 'Select a user'
                                                    }
                                                />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {recipientOptions.length === 0 && !optionsLoading ? (
                                                    <div className="px-2 py-3 text-xs text-muted-foreground">
                                                        No users returned for this role. Try another role,
                                                        refresh, or enter a user ID below.
                                                    </div>
                                                ) : (
                                                    recipientOptions.map((u) => (
                                                        <SelectItem key={u.id} value={String(u.id)}>
                                                            {u.label} (ID {u.id})
                                                        </SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="manualUserId" className="text-[#004d4d]">
                                            Or user ID
                                        </Label>
                                        <Input
                                            id="manualUserId"
                                            type="number"
                                            min={1}
                                            placeholder="App user id if not in the list"
                                            value={manualUserId}
                                            onChange={(e) => {
                                                setManualUserId(e.target.value);
                                                if (e.target.value.trim()) setTargetUserId(null);
                                            }}
                                        />
                                    </div>
                                </>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="title" className="text-[#004d4d]">Title</Label>
                                <Input
                                    id="title"
                                    required
                                    placeholder="Notification Title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="body" className="text-[#004d4d]">Message</Label>
                                <Textarea
                                    id="body"
                                    rows={4}
                                    required
                                    placeholder="Type your message here..."
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[#004d4d]">Type</Label>
                                <Select value={type} onValueChange={setType}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="INFO">Info</SelectItem>
                                        <SelectItem value="ALERT">Alert</SelectItem>
                                        <SelectItem value="PROMO">Promo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="pt-2">
                                <Button type="submit" className="w-full" disabled={loading}>
                                    <Send size={18} className="mr-2" />
                                    {loading ? 'Sending...' : 'Send Notification'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-2">
                        <CardTitle className="text-[#004d4d]">History</CardTitle>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            onClick={() => fetchHistory(historyPage)}
                            disabled={historyLoading}
                        >
                            <RefreshCw
                                className={cn('w-4 h-4', historyLoading && 'animate-spin')}
                            />
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {historyLoading && historyItems.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-4">Loading…</p>
                            ) : historyItems.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-4">No history yet.</p>
                            ) : (
                                <>
                                    <div className="max-h-[min(60vh,28rem)] overflow-y-auto space-y-3 pr-1">
                                        {historyItems.map((h) => (
                                            <div
                                                key={h.id}
                                                className="flex gap-4 p-4 rounded-xl bg-surface border border-border items-start"
                                            >
                                                <div className="p-2 bg-primary/20 rounded-xl text-primary shrink-0">
                                                    <Bell size={20} />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-semibold text-foreground text-sm truncate">
                                                        {h.title}
                                                    </h4>
                                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                        {h.body}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground/80 mt-2 flex flex-wrap gap-x-2 gap-y-0.5">
                                                        <span>
                                                            {h.at
                                                                ? new Date(h.at).toLocaleString()
                                                                : '—'}
                                                        </span>
                                                        {h.audience && <span>· {h.audience}</span>}
                                                        {h.notifType && (
                                                            <span className="uppercase">· {h.notifType}</span>
                                                        )}
                                                        {h.targetUserId != null && (
                                                            <span>· User #{h.targetUserId}</span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                                        <p className="text-xs text-muted-foreground">
                                            {totalPages != null
                                                ? `Page ${historyPage} of ${totalPages}`
                                                : `Page ${historyPage}`}
                                            {historyTotal != null
                                                ? ` · ${historyTotal} total`
                                                : ''}
                                        </p>
                                        <div className="flex gap-1">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8"
                                                disabled={!canPrev || historyLoading}
                                                onClick={() => fetchHistory(historyPage - 1)}
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8"
                                                disabled={!canNext || historyLoading}
                                                onClick={() => fetchHistory(historyPage + 1)}
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
