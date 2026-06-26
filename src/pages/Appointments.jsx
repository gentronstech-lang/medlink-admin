import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card.jsx';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog.jsx';
import { Input } from '@/components/ui/input.jsx';
import {
    Calendar as CalendarIcon,
    Clock,
    Eye,
    Filter,
    Mail,
    Phone,
    Search,
    Stethoscope,
    User,
    Video,
} from 'lucide-react';
import api, { getPayload } from '@/lib/api';
import { formatMoney } from '@/lib/currency';
import { toast } from '@/lib/toast';

/** MedLink Africa logo — appointments page text uses only this palette (+ white on teal buttons). */
const tx = {
    pageTitle:
        'bg-gradient-to-r from-[#004d4d] via-[#00796b] to-[#26a69a] bg-clip-text text-transparent',
    subtitle: 'text-[#d9923b]',
    body: 'text-[#00796b] dark:text-[#26a69a]',
    bodyStrong: 'text-[#004d4d] dark:text-[#26a69a]',
    labelCaps: 'text-[#d9923b]',
    mutedLine: 'text-[#26a69a]/90 dark:text-[#26a69a]',
    fee: 'text-[#00796b] dark:text-[#26a69a] font-bold',
};

function formatTime(iso) {
    if (!iso) return null;
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

function initials(name) {
    if (!name || typeof name !== 'string') return '?';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
}

function dash(v) {
    if (v === null || v === undefined || v === '') return '—';
    return String(v);
}

function mapAppointment(apt) {
    const patientObj =
        apt.patient && typeof apt.patient === 'object' ? apt.patient : {};
    const doctorObj = apt.doctor && typeof apt.doctor === 'object' ? apt.doctor : {};
    const scheduledStart = apt.scheduledStart ?? apt.scheduledAt;
    const scheduledEnd = apt.scheduledEnd;
    return {
        ...apt,
        patient: patientObj,
        doctor: doctorObj,
        patientName:
            patientObj.fullName ??
            patientObj.full_name ??
            apt.patientName ??
            'Patient',
        doctorName:
            doctorObj.fullName ?? doctorObj.full_name ?? apt.doctorName ?? 'Doctor',
        patientId: patientObj.id ?? apt.patientId,
        doctorId: doctorObj.id ?? apt.doctorId,
        type: apt.appointmentType ?? apt.type ?? 'Consultation',
        consultKind: apt.consultKind ?? '—',
        status: apt.status ?? 'PENDING',
        date:
            apt.date ??
            scheduledStart?.split('T')[0] ??
            apt.scheduledAt?.split('T')[0] ??
            '—',
        time:
            apt.time ??
            formatTime(scheduledStart) ??
            '—',
        timeEnd: formatTime(scheduledEnd),
    };
}

function DetailRow({ label, children }) {
    return (
        <div className="grid gap-0.5 sm:grid-cols-[minmax(0,7.5rem)_1fr] sm:gap-3 sm:items-start border-b border-border/60 py-2.5 last:border-0 last:pb-0">
            <span className={`text-[11px] font-semibold uppercase tracking-wide ${tx.labelCaps}`}>{label}</span>
            <div className={`text-sm break-words ${tx.bodyStrong}`}>{children}</div>
        </div>
    );
}

function AppointmentDetailModal({ apt, open, onOpenChange }) {
    if (!apt) return null;
    const p = apt.patient ?? {};
    const d = apt.doctor ?? {};
    const feeLabel =
        apt.feeAmount != null && String(apt.feeAmount).length
            ? formatMoney(apt.feeAmount, apt.currency)
            : '—';
    const consultIsVideo = String(apt.consultKind || '').toUpperCase() === 'VIDEO';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[min(90vh,760px)] max-w-lg overflow-y-auto sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle className={`pr-8 ${tx.pageTitle}`}>Appointment #{apt.id}</DialogTitle>
                    <DialogDescription className="flex flex-wrap items-center gap-2 pt-1">
                        <span
                            className={`inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                consultIsVideo
                                    ? 'bg-[#00796b]/15 text-[#00796b] dark:text-[#26a69a]'
                                    : 'bg-[#004d4d]/10 text-[#004d4d] dark:text-[#26a69a]'
                            }`}
                        >
                            {consultIsVideo && <Video className="size-3" aria-hidden />}
                            {dash(apt.consultKind)}
                        </span>
                        <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                apt.status === 'PENDING'
                                    ? 'bg-[#d9923b]/18 text-[#d9923b]'
                                    : apt.status === 'CANCELLED'
                                      ? 'bg-[#d9923b]/15 text-[#d9923b]'
                                      : apt.status === 'CONFIRMED'
                                        ? 'bg-[#26a69a]/18 text-[#00796b] dark:text-[#26a69a]'
                                        : apt.status === 'COMPLETED'
                                          ? 'bg-[#004d4d]/12 text-[#004d4d] dark:text-[#26a69a]'
                                          : 'bg-[#00796b]/10 text-[#00796b] dark:text-[#26a69a]'
                            }`}
                        >
                            {apt.status}
                        </span>
                        <span className={`text-xs font-semibold ${tx.fee}`}>{feeLabel}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-1 pt-1">
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${tx.labelCaps}`}>Schedule</p>
                    <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                        <p className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${tx.body}`}>
                            <CalendarIcon className="size-4 shrink-0 opacity-80 text-[#00796b] dark:text-[#26a69a]" />
                            <span>{apt.date}</span>
                            <span className="text-[#26a69a]">·</span>
                            <Clock className="size-4 shrink-0 opacity-80 text-[#00796b] dark:text-[#26a69a]" />
                            <span>{apt.timeEnd ? `${apt.time}–${apt.timeEnd}` : apt.time}</span>
                        </p>
                        {(apt.scheduledStart || apt.scheduledEnd) && (
                            <p className={`mt-2 text-xs leading-relaxed ${tx.mutedLine}`}>
                                {apt.scheduledStart && apt.scheduledEnd
                                    ? `${formatDateTime(apt.scheduledStart)} → ${formatDateTime(apt.scheduledEnd)}`
                                    : formatDateTime(apt.scheduledStart ?? apt.scheduledEnd)}
                            </p>
                        )}
                    </div>
                </div>

                <div className="space-y-1">
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${tx.labelCaps}`}>Patient</p>
                    <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-2">
                        <DetailRow label="Name">{apt.patientName}</DetailRow>
                        <DetailRow label="ID">{dash(p.id ?? apt.patientId)}</DetailRow>
                        <DetailRow label="Email">
                            <span className="flex items-start gap-1.5 break-all">
                                <Mail className="mt-0.5 size-3.5 shrink-0 text-[#00796b] dark:text-[#26a69a]" aria-hidden />
                                {dash(p.email)}
                            </span>
                        </DetailRow>
                        <DetailRow label="Phone">
                            <span className="flex items-center gap-1.5">
                                <Phone className="size-3.5 shrink-0 text-[#00796b] dark:text-[#26a69a]" aria-hidden />
                                {dash(p.phone)}
                            </span>
                        </DetailRow>
                    </div>
                </div>

                <div className="space-y-1">
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${tx.labelCaps}`}>Doctor</p>
                    <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-2">
                        <DetailRow label="Name">{apt.doctorName}</DetailRow>
                        <DetailRow label="ID">{dash(d.id ?? apt.doctorId)}</DetailRow>
                        <DetailRow label="Email">
                            <span className="flex items-start gap-1.5 break-all">
                                <Mail className="mt-0.5 size-3.5 shrink-0 text-[#00796b] dark:text-[#26a69a]" aria-hidden />
                                {dash(d.email)}
                            </span>
                        </DetailRow>
                        <DetailRow label="Phone">
                            <span className="flex items-center gap-1.5">
                                <Phone className="size-3.5 shrink-0 text-[#00796b] dark:text-[#26a69a]" aria-hidden />
                                {dash(d.phone)}
                            </span>
                        </DetailRow>
                    </div>
                </div>

                <div className="space-y-1">
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${tx.labelCaps}`}>Visit</p>
                    <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-2">
                        <DetailRow label="Type">{dash(apt.type)}</DetailRow>
                        <DetailRow label="Reason">{dash(apt.reason)}</DetailRow>
                    </div>
                </div>

                {(apt.cancelReason || apt.cancelledById != null || apt.status === 'CANCELLED') && (
                    <div className="space-y-1">
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${tx.labelCaps}`}>
                            Cancellation
                        </p>
                        <div className="rounded-xl border border-[#d9923b]/30 bg-[#d9923b]/[0.06] px-3 py-2 text-sm">
                            <DetailRow label="Reason">{dash(apt.cancelReason)}</DetailRow>
                            <DetailRow label="By user ID">{dash(apt.cancelledById)}</DetailRow>
                        </div>
                    </div>
                )}

                <div className="rounded-xl border border-dashed border-border/80 bg-muted/15 px-3 py-2 text-[11px]">
                    <p className={tx.mutedLine}>Created {formatDateTime(apt.createdAt)}</p>
                    <p className={`mt-0.5 ${tx.mutedLine}`}>Updated {formatDateTime(apt.updatedAt)}</p>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function Appointments() {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('PENDING');
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [detailApt, setDetailApt] = useState(null);

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            const res = await api.get("/admin/appointments", {
                params: { page, limit: 50, status: activeTab !== 'all' ? activeTab : undefined }
            });
            const data = getPayload(res) ?? res.data;
            const items = data?.items ?? (Array.isArray(data) ? data : []) ?? [];

            setAppointments(items.map(mapAppointment));
        } catch (error) {
            console.error("Failed to fetch appointments", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, [page, activeTab]);

    const filteredAppointments = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return appointments;
        return appointments.filter((apt) => {
            const p = apt.patient ?? {};
            const d = apt.doctor ?? {};
            const hay = [
                apt.patientName,
                apt.doctorName,
                p.email,
                p.phone,
                d.email,
                d.phone,
                apt.reason,
                apt.cancelReason,
                apt.feeAmount,
                apt.currency,
                apt.type,
                apt.consultKind,
                apt.date,
                apt.time,
                apt.status,
                apt.patientId,
                apt.doctorId,
                String(apt.id),
                String(apt.cancelledById ?? ''),
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return hay.includes(q);
        });
    }, [appointments, search]);

    const updateStatus = async (aptId, status, cancelReason = '') => {
        try {
            await api.patch(`/admin/appointments/${aptId}/status`, { status, cancelReason });
            fetchAppointments();
        } catch (error) {
            console.error("Failed to update appointment", error);
            toast.error('Error updating appointment');
        }
    };

    const tabs = ['all','PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

    return (
        <div className="space-y-6">
            <AppointmentDetailModal
                apt={detailApt}
                open={!!detailApt}
                onOpenChange={(open) => {
                    if (!open) setDetailApt(null);
                }}
            />
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className={`text-3xl font-bold tracking-tight ${tx.pageTitle}`}>Appointments</h1>
                    <p className={`mt-1 font-medium ${tx.subtitle}`}>Manage and track appointments</p>
                </div>
                <div className="relative w-full sm:w-72 shrink-0">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-[#00796b] dark:text-[#26a69a]" />
                    <Input
                        type="search"
                        placeholder="Search patient, doctor, date..."
                        className={`pl-10 text-[#004d4d] placeholder:text-[#26a69a]/70 dark:text-[#26a69a] dark:placeholder:text-[#26a69a]/50`}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        aria-label="Search appointments"
                    />
                </div>
            </div>

            <div className="flex flex-wrap gap-2 p-1.5 bg-surface rounded-2xl w-fit border border-border">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 capitalize ${activeTab === tab
                            ? 'bg-[#00796b] text-white shadow-sm shadow-[#00796b]/25 hover:bg-[#004d4d]'
                            : `text-[#00796b] hover:text-[#004d4d] hover:bg-[#26a69a]/10 dark:text-[#26a69a] dark:hover:text-[#26a69a]`
                            }`}
                    >
                        {tab === 'all' ? 'All' : tab}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3">
                {loading ? (
                    <div className={`col-span-full py-16 text-center font-medium ${tx.body}`}>Loading...</div>
                ) : appointments.length > 0 && filteredAppointments.length === 0 ? (
                    <div className="col-span-full py-16 text-center bg-surface rounded-2xl border-2 border-dashed border-border">
                        <Search className="mx-auto h-14 w-14 mb-4 text-[#26a69a]/60" />
                        <p className={`font-medium ${tx.bodyStrong}`}>No appointments match your search</p>
                    </div>


                ) : filteredAppointments.length > 0 ? (
                    filteredAppointments.map((apt) => {
                        const p = apt.patient ?? {};
                        const d = apt.doctor ?? {};
                        const feeLabel =
                            apt.feeAmount != null && String(apt.feeAmount).length
                                ? formatMoney(apt.feeAmount, apt.currency)
                                : '—';
                        const consultIsVideo = String(apt.consultKind || '').toUpperCase() === 'VIDEO';
                        return (
                            <Card
                                key={apt.id}
                                className="group relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-[#00796b]/[0.04] shadow-sm transition-all duration-300 hover:border-[#26a69a]/35 hover:shadow-md"
                            >
                                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#26a69a]/45 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                                <CardContent className="relative space-y-3 p-4 sm:p-5">
                                    <div className="flex flex-wrap items-center gap-2 gap-y-2">
                                        <span className={`text-xs font-bold tabular-nums ${tx.mutedLine}`}>
                                            #{apt.id}
                                        </span>
                                        <span
                                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                                                consultIsVideo
                                                    ? 'bg-[#00796b]/15 text-[#00796b] dark:text-[#26a69a]'
                                                    : 'bg-[#004d4d]/10 text-[#004d4d] dark:text-[#26a69a]'
                                            }`}
                                        >
                                            {consultIsVideo && <Video className="size-3" aria-hidden />}
                                            {dash(apt.consultKind)}
                                        </span>
                                        <span
                                            className={`rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                                                apt.status === 'PENDING'
                                                    ? 'bg-[#d9923b]/18 text-[#d9923b]'
                                                    : apt.status === 'CANCELLED'
                                                      ? 'bg-[#d9923b]/15 text-[#d9923b]'
                                                      : apt.status === 'CONFIRMED'
                                                        ? 'bg-[#26a69a]/18 text-[#00796b] dark:text-[#26a69a]'
                                                        : apt.status === 'COMPLETED'
                                                          ? 'bg-[#004d4d]/12 text-[#004d4d] dark:text-[#26a69a]'
                                                          : 'bg-[#00796b]/10 text-[#00796b] dark:text-[#26a69a]'
                                            }`}
                                        >
                                            {apt.status}
                                        </span>
                                        <span className={`ml-auto text-sm font-bold tabular-nums ${tx.fee}`}>
                                            {feeLabel}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/60 px-3 py-3">
                                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#00796b]/12 text-xs font-bold text-[#004d4d] dark:bg-[#26a69a]/15 dark:text-[#26a69a]">
                                            {initials(apt.patientName)}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className={`truncate text-sm font-semibold leading-snug ${tx.bodyStrong}`}>
                                                {apt.patientName}
                                            </p>
                                            <p className={`mt-1 flex items-center gap-1.5 text-sm ${tx.subtitle}`}>
                                                <Stethoscope className="size-3.5 shrink-0 text-[#d9923b]" aria-hidden />
                                                <span className="truncate">{apt.doctorName}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-sm ${tx.body}`}>
                                        <span className="inline-flex items-center gap-1.5">
                                            <CalendarIcon className="size-4 shrink-0 text-[#00796b] dark:text-[#26a69a]" />
                                            {apt.date}
                                        </span>
                                        <span className="inline-flex items-center gap-1.5">
                                            <Clock className="size-4 shrink-0 text-[#00796b] dark:text-[#26a69a]" />
                                            {apt.timeEnd ? `${apt.time}–${apt.timeEnd}` : apt.time}
                                        </span>
                                    </div>

                                    <div className="rounded-xl border border-dashed border-border/70 bg-muted/15 px-3 py-2.5">
                                        <div className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${tx.labelCaps}`}>
                                            <User className="size-3.5 text-[#d9923b]" aria-hidden />
                                            Reason
                                        </div>
                                        <p className={`mt-1 line-clamp-2 text-sm leading-relaxed ${tx.bodyStrong}`}>
                                            {dash(apt.reason)}
                                        </p>
                                    </div>

                                    <div className="space-y-3 border-t border-border/50 pt-3">
                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => setDetailApt(apt)}
                                                className="inline-flex items-center gap-2 rounded-xl border border-[#00796b]/35 bg-background px-3.5 py-2 text-sm font-semibold text-[#004d4d] shadow-sm transition-colors hover:border-[#26a69a] hover:bg-[#26a69a]/10 hover:text-[#00796b] dark:text-[#26a69a] dark:hover:text-[#26a69a]"
                                                aria-label="View full appointment details"
                                            >
                                                <Eye className="size-4 shrink-0 text-[#00796b] dark:text-[#26a69a]" aria-hidden />
                                                View details
                                            </button>
                                        </div>

                                        {apt.status === 'PENDING' && (
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => updateStatus(apt.id, 'CONFIRMED')}
                                                    className="flex-1 rounded-xl bg-[#00796b] py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#004d4d]"
                                                >
                                                    Confirm
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => updateStatus(apt.id, 'CANCELLED', 'Cancelled by admin')}
                                                    className="flex-1 rounded-xl border-2 border-[#d9923b] bg-white py-2.5 text-sm font-semibold text-[#d9923b] transition-colors hover:bg-[#f8f8f8]"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                ) : (
                    <div className="col-span-full py-16 text-center bg-surface rounded-2xl border-2 border-dashed border-border">
                        <Filter className="mx-auto h-14 w-14 mb-4 text-[#26a69a]/60" />
                        <p className={`font-medium ${tx.bodyStrong}`}>
                            No {activeTab === 'all' ? '' : `${activeTab.toLowerCase()} `}appointments found
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
