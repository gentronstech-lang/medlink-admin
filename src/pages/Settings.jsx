import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Settings, Save, Loader2, Bold, Italic, Underline, List, Palette, Highlighter } from 'lucide-react';
import api, { getPayload } from '@/lib/api';
import { getAdminErrorMessage } from '@/lib/adminErrors';
import { toast } from '@/lib/toast';

function normalizeSettings(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const doctorPct =
        raw.medlinkCommissionFromDoctorPercent ??
        raw.medlink_commission_from_doctor_percent ??
        raw.doctorCommissionPercent ??
        raw.doctor_commission_percent;
    const orgPct =
        raw.medlinkCommissionFromOrganizationPercent ??
        raw.medlink_commission_from_organization_percent ??
        raw.organizationCommissionPercent ??
        raw.organization_commission_percent;
    return {
        id: raw.id,
        medlinkCommissionFromDoctorPercent:
            doctorPct === '' || doctorPct == null ? '' : String(doctorPct),
        medlinkCommissionFromOrganizationPercent:
            orgPct === '' || orgPct == null ? '' : String(orgPct),
        currency: raw.currency ?? raw.currencyCode ?? raw.currency_code ?? 'CFA',
        emergencyPhone: raw.emergencyPhone ?? raw.emergency_phone ?? '',
        emergencyDescription:
            raw.emergencyDescription ?? raw.emergency_description ?? '',
        instructions: raw.instructions ?? '',
        createdAt: raw.createdAt ?? raw.created_at ?? null,
        updatedAt: raw.updatedAt ?? raw.updated_at ?? null,
    };
}

function trimOrEmpty(v) {
    return String(v ?? '').trim();
}

function applyInlineTag(field, openTag, closeTag, ref, setForm) {
    const el = ref?.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const value = el.value ?? '';
    const selected = value.slice(start, end);
    const inside = selected || 'text';
    const next = `${value.slice(0, start)}${openTag}${inside}${closeTag}${value.slice(end)}`;
    setForm((f) => ({ ...f, [field]: next }));
    requestAnimationFrame(() => {
        const posStart = start + openTag.length;
        const posEnd = posStart + inside.length;
        el.focus();
        el.setSelectionRange(posStart, posEnd);
    });
}

function applyLinePrefix(field, prefix, ref, setForm) {
    const el = ref?.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const value = el.value ?? '';
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = value.indexOf('\n', end);
    const actualEnd = lineEnd === -1 ? value.length : lineEnd;
    const block = value.slice(lineStart, actualEnd);
    const prefixed = block
        .split('\n')
        .map((line) => (line.trim() ? `${prefix}${line}` : line))
        .join('\n');
    const next = `${value.slice(0, lineStart)}${prefixed}${value.slice(actualEnd)}`;
    setForm((f) => ({ ...f, [field]: next }));
    requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(lineStart, lineStart + prefixed.length);
    });
}

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [meta, setMeta] = useState({ id: null, createdAt: null, updatedAt: null });
    const [form, setForm] = useState({
        medlinkCommissionFromDoctorPercent: '',
        medlinkCommissionFromOrganizationPercent: '',
        currency: 'CFA',
        emergencyPhone: '',
        emergencyDescription: '',
        instructions: '',
    });
    const initialFormRef = useRef(null);
    const emergencyRef = useRef(null);
    const instructionsRef = useRef(null);
    const [emergencyColor, setEmergencyColor] = useState('#00796b');
    const [instructionsColor, setInstructionsColor] = useState('#00796b');

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/settings');
            const data = getPayload(res) ?? res.data;
            const s = normalizeSettings(data);
            if (s) {
                setMeta({
                    id: s.id,
                    createdAt: s.createdAt,
                    updatedAt: s.updatedAt,
                });
                const next = {
                    medlinkCommissionFromDoctorPercent: s.medlinkCommissionFromDoctorPercent,
                    medlinkCommissionFromOrganizationPercent:
                        s.medlinkCommissionFromOrganizationPercent,
                    currency: s.currency ?? 'CFA',
                    emergencyPhone: s.emergencyPhone ?? '',
                    emergencyDescription: s.emergencyDescription ?? '',
                    instructions: s.instructions ?? '',
                };
                setForm(next);
                initialFormRef.current = { ...next };
            }
        } catch (err) {
            console.error('Failed to load settings', err);
            toast.error(getAdminErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const buildPatchBody = () => {
        const body = {};
        const initial = initialFormRef.current;
        if (!initial) {
            return body;
        }

        const docTrim = trimOrEmpty(form.medlinkCommissionFromDoctorPercent);
        const initDoc = trimOrEmpty(initial.medlinkCommissionFromDoctorPercent);
        if (docTrim !== initDoc) {
            if (docTrim === '') {
                // omit — do not send empty to avoid unintended clears
            } else {
                const n = Number(docTrim);
                if (Number.isNaN(n)) {
                    return { __error: 'Medlink commission from doctor must be a valid number.' };
                }
                body.medlinkCommissionFromDoctorPercent = n;
            }
        }

        const orgTrim = trimOrEmpty(form.medlinkCommissionFromOrganizationPercent);
        const initOrg = trimOrEmpty(initial.medlinkCommissionFromOrganizationPercent);
        if (orgTrim !== initOrg) {
            if (orgTrim === '') {
                // omit
            } else {
                const n = Number(orgTrim);
                if (Number.isNaN(n)) {
                    return {
                        __error: 'Medlink commission from organization must be a valid number.',
                    };
                }
                body.medlinkCommissionFromOrganizationPercent = n;
            }
        }
        if (trimOrEmpty(form.currency) !== trimOrEmpty(initial.currency)) {
            body.currency = trimOrEmpty(form.currency);
        }

        if (trimOrEmpty(form.emergencyPhone) !== trimOrEmpty(initial.emergencyPhone)) {
            body.emergencyPhone = trimOrEmpty(form.emergencyPhone);
        }
        if (
            trimOrEmpty(form.emergencyDescription) !==
            trimOrEmpty(initial.emergencyDescription)
        ) {
            body.emergencyDescription = trimOrEmpty(form.emergencyDescription);
        }
        if (trimOrEmpty(form.instructions) !== trimOrEmpty(initial.instructions)) {
            body.instructions = trimOrEmpty(form.instructions);
        }

        return body;
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const body = buildPatchBody();
        if (body.__error) {
            toast.error(body.__error);
            return;
        }
        delete body.__error;
        if (Object.keys(body).length === 0) {
            toast.info('No changes to save.');
            return;
        }

        try {
            setSaving(true);
            const res = await api.patch('/admin/settings', body);
            const data = getPayload(res) ?? res.data;
            const s = normalizeSettings(data);
            if (s) {
                setMeta({
                    id: s.id,
                    createdAt: s.createdAt,
                    updatedAt: s.updatedAt,
                });
            }
            await load();
            toast.success('Settings saved.');
        } catch (err) {
            console.error('Failed to save settings', err);
            toast.error(getAdminErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm font-medium">Loading settings…</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
                    <Settings className="w-8 h-8 text-primary shrink-0" />
                    Settings
                </h1>
                <p className="text-brand-gold mt-1 font-medium">
                    Medlink commission rates, emergency contact, and patient-facing instructions
                </p>
            </div>

            <form onSubmit={handleSave}>
                <Card className="hover:shadow-card">
                    <CardHeader>
                        <CardTitle className="text-xl text-[#004d4d]">System settings</CardTitle>
                        {(meta.updatedAt || meta.createdAt) && (
                            <p className="text-xs text-muted-foreground font-normal mt-1">
                                {meta.updatedAt && (
                                    <>
                                        Last updated:{' '}
                                        {new Date(meta.updatedAt).toLocaleString()}
                                    </>
                                )}
                                {meta.updatedAt && meta.createdAt && ' · '}
                                {meta.createdAt && !meta.updatedAt && (
                                    <>
                                        Created: {new Date(meta.createdAt).toLocaleString()}
                                    </>
                                )}
                            </p>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-6 max-w-2xl">
                        <div className="grid gap-6 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="commissionDoctor" className="text-[#004d4d]">
                                    Medlink commission from doctor (%)
                                </Label>
                                <Input
                                    id="commissionDoctor"
                                    type="number"
                                    min={0}
                                    max={100}
                                    step="0.01"
                                    placeholder="e.g. 15"
                                    value={form.medlinkCommissionFromDoctorPercent}
                                    onChange={(e) =>
                                        setForm((f) => ({
                                            ...f,
                                            medlinkCommissionFromDoctorPercent: e.target.value,
                                        }))
                                    }
                                />
                                <p className="text-xs text-muted-foreground">
                                    Platform share from doctor side. Only changed fields are sent on
                                    save.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="commissionOrg" className="text-[#004d4d]">
                                    Medlink commission from organization (%)
                                </Label>
                                <Input
                                    id="commissionOrg"
                                    type="number"
                                    min={0}
                                    max={100}
                                    step="0.01"
                                    placeholder="e.g. 10"
                                    value={form.medlinkCommissionFromOrganizationPercent}
                                    onChange={(e) =>
                                        setForm((f) => ({
                                            ...f,
                                            medlinkCommissionFromOrganizationPercent: e.target.value,
                                        }))
                                    }
                                />
                                <p className="text-xs text-muted-foreground">
                                    Platform share from organization side.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="currency" className="text-[#004d4d]">Currency</Label>
                                <Input
                                    id="currency"
                                    placeholder="CFA"
                                    value={form.currency}
                                    onChange={(e) =>
                                        setForm((f) => ({
                                            ...f,
                                            currency: e.target.value.toUpperCase(),
                                        }))
                                    }
                                />
                                <p className="text-xs text-muted-foreground">
                                    Default app currency code, e.g. CFA.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="emergencyPhone" className="text-[#004d4d]">Emergency phone</Label>
                            <Input
                                id="emergencyPhone"
                                type="tel"
                                placeholder="+923001234567"
                                value={form.emergencyPhone}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, emergencyPhone: e.target.value }))
                                }
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="emergencyDescription" className="text-[#004d4d]">Emergency description</Label>
                            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/20 p-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2"
                                    onClick={() =>
                                        applyInlineTag(
                                            'emergencyDescription',
                                            '<strong>',
                                            '</strong>',
                                            emergencyRef,
                                            setForm
                                        )
                                    }
                                >
                                    <Bold className="w-4 h-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2"
                                    onClick={() =>
                                        applyInlineTag(
                                            'emergencyDescription',
                                            '<em>',
                                            '</em>',
                                            emergencyRef,
                                            setForm
                                        )
                                    }
                                >
                                    <Italic className="w-4 h-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2"
                                    onClick={() =>
                                        applyInlineTag(
                                            'emergencyDescription',
                                            '<u>',
                                            '</u>',
                                            emergencyRef,
                                            setForm
                                        )
                                    }
                                >
                                    <Underline className="w-4 h-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2"
                                    onClick={() =>
                                        applyLinePrefix(
                                            'emergencyDescription',
                                            '- ',
                                            emergencyRef,
                                            setForm
                                        )
                                    }
                                >
                                    <List className="w-4 h-4" />
                                </Button>
                                <div className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 bg-card">
                                    <Palette className="w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="color"
                                        value={emergencyColor}
                                        onChange={(e) => setEmergencyColor(e.target.value)}
                                        className="h-5 w-7 cursor-pointer border-0 bg-transparent p-0"
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2"
                                    onClick={() =>
                                        applyInlineTag(
                                            'emergencyDescription',
                                            `<span style="color:${emergencyColor};">`,
                                            '</span>',
                                            emergencyRef,
                                            setForm
                                        )
                                    }
                                >
                                    <Palette className="w-4 h-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2"
                                    onClick={() =>
                                        applyInlineTag(
                                            'emergencyDescription',
                                            '<span style="background-color:#fef08a;">',
                                            '</span>',
                                            emergencyRef,
                                            setForm
                                        )
                                    }
                                >
                                    <Highlighter className="w-4 h-4" />
                                </Button>
                            </div>
                            <Textarea
                                id="emergencyDescription"
                                ref={emergencyRef}
                                rows={3}
                                placeholder="For life-threatening emergencies, call this number immediately."
                                value={form.emergencyDescription}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        emergencyDescription: e.target.value,
                                    }))
                                }
                            />
                            <p className="text-xs text-muted-foreground">
                                HTML supported. Example: &lt;strong&gt;urgent&lt;/strong&gt; or
                                &lt;span style=&quot;color:#00796b&quot;&gt;text&lt;/span&gt;
                            </p>
                            <div className="rounded-xl border border-border bg-card p-3">
                                <p className="text-xs font-semibold text-muted-foreground mb-2">Preview</p>
                                <div
                                    className="prose prose-sm max-w-none text-foreground"
                                    dangerouslySetInnerHTML={{
                                        __html:
                                            form.emergencyDescription ||
                                            '<span class="text-muted-foreground">No content</span>',
                                    }}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="instructions" className="text-[#004d4d]">General instructions</Label>
                            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/20 p-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2"
                                    onClick={() =>
                                        applyInlineTag(
                                            'instructions',
                                            '<strong>',
                                            '</strong>',
                                            instructionsRef,
                                            setForm
                                        )
                                    }
                                >
                                    <Bold className="w-4 h-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2"
                                    onClick={() =>
                                        applyInlineTag(
                                            'instructions',
                                            '<em>',
                                            '</em>',
                                            instructionsRef,
                                            setForm
                                        )
                                    }
                                >
                                    <Italic className="w-4 h-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2"
                                    onClick={() =>
                                        applyInlineTag(
                                            'instructions',
                                            '<u>',
                                            '</u>',
                                            instructionsRef,
                                            setForm
                                        )
                                    }
                                >
                                    <Underline className="w-4 h-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2"
                                    onClick={() =>
                                        applyLinePrefix(
                                            'instructions',
                                            '- ',
                                            instructionsRef,
                                            setForm
                                        )
                                    }
                                >
                                    <List className="w-4 h-4" />
                                </Button>
                                <div className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 bg-card">
                                    <Palette className="w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="color"
                                        value={instructionsColor}
                                        onChange={(e) => setInstructionsColor(e.target.value)}
                                        className="h-5 w-7 cursor-pointer border-0 bg-transparent p-0"
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2"
                                    onClick={() =>
                                        applyInlineTag(
                                            'instructions',
                                            `<span style="color:${instructionsColor};">`,
                                            '</span>',
                                            instructionsRef,
                                            setForm
                                        )
                                    }
                                >
                                    <Palette className="w-4 h-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2"
                                    onClick={() =>
                                        applyInlineTag(
                                            'instructions',
                                            '<span style="background-color:#fef08a;">',
                                            '</span>',
                                            instructionsRef,
                                            setForm
                                        )
                                    }
                                >
                                    <Highlighter className="w-4 h-4" />
                                </Button>
                            </div>
                            <Textarea
                                id="instructions"
                                ref={instructionsRef}
                                rows={4}
                                placeholder="Book appointments at least 2 hours in advance."
                                value={form.instructions}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, instructions: e.target.value }))
                                }
                            />
                            <p className="text-xs text-muted-foreground">
                                HTML supported for body styling and text color.
                            </p>
                            <div className="rounded-xl border border-border bg-card p-3">
                                <p className="text-xs font-semibold text-muted-foreground mb-2">Preview</p>
                                <div
                                    className="prose prose-sm max-w-none text-foreground"
                                    dangerouslySetInnerHTML={{
                                        __html:
                                            form.instructions ||
                                            '<span class="text-muted-foreground">No content</span>',
                                    }}
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3 pt-2">
                            <Button type="submit" disabled={saving} className="gap-2">
                                {saving ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                Save changes
                            </Button>
                            <Button type="button" variant="outline" onClick={load} disabled={saving}>
                                Reload
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}
