import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import {
    Plus,
    Trash2,
    Edit2,
    Stethoscope,
    HeartPulse,
    Brain,
    Bone,
    Pill,
    Microscope,
    Syringe,
    Eye,
    Baby,
    ScanLine,
    Activity,
    Ear,
    Wind,
    Droplets,
    ImageOff,
} from 'lucide-react';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
import { cn } from '@/lib/utils';
import { resolveImageUrl } from '@/lib/images';
import api, { getPayload } from '@/lib/api';
import { toast } from '@/lib/toast';

const ICON_MAX = 2048;

/** App icon IDs — mobile app in inhe map kar sakta hai; ya admin full URL paste kar sakta hai */
const SPECIALTY_ICON_PRESETS = [
    { value: 'stethoscope', label: 'Stethoscope', Icon: Stethoscope },
    { value: 'heart-pulse', label: 'Heart', Icon: HeartPulse },
    { value: 'brain', label: 'Neuro', Icon: Brain },
    { value: 'bone', label: 'Ortho', Icon: Bone },
    { value: 'pill', label: 'Pharma', Icon: Pill },
    { value: 'microscope', label: 'Lab', Icon: Microscope },
    { value: 'syringe', label: 'Inject', Icon: Syringe },
    { value: 'eye', label: 'Eye', Icon: Eye },
    { value: 'baby', label: 'Pediatrics', Icon: Baby },
    { value: 'scan-line', label: 'Imaging', Icon: ScanLine },
    { value: 'activity', label: 'Vitals', Icon: Activity },
    { value: 'ear', label: 'ENT', Icon: Ear },
    { value: 'wind', label: 'Pulmo', Icon: Wind },
    { value: 'droplets', label: 'Blood', Icon: Droplets },
];

const PRESET_ICON_IDS = new Set(SPECIALTY_ICON_PRESETS.map((p) => p.value));

function isAbsoluteOrDataUrl(s) {
    if (!s || typeof s !== 'string') return false;
    return (
        s.startsWith('http://') ||
        s.startsWith('https://') ||
        s.startsWith('data:')
    );
}

function SpecialtyIconBadge({ icon, name, size = 'lg' }) {
    const [imgFailed, setImgFailed] = useState(false);
    const dims = size === 'lg' ? 'h-12 w-12' : 'h-10 w-10';
    const iconInner = size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';

    const { url, isUrl } = useMemo(() => {
        const raw = (icon ?? '').trim();
        if (!raw) return { url: '', isUrl: false };
        if (isAbsoluteOrDataUrl(raw)) return { url: raw, isUrl: true };
        const r = resolveImageUrl(raw);
        if (isAbsoluteOrDataUrl(r)) return { url: r, isUrl: true };
        return { url: raw, isUrl: false };
    }, [icon]);

    const preset = SPECIALTY_ICON_PRESETS.find((p) => p.value === icon?.trim());

    useEffect(() => {
        setImgFailed(false);
    }, [url]);

    if (isUrl && url && !imgFailed) {
        return (
            <div
                className={cn(
                    'flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted/40',
                    dims
                )}
            >
                <img
                    src={url}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={() => setImgFailed(true)}
                />
            </div>
        );
    }

    if (preset) {
        const I = preset.Icon;
        return (
            <div
                className={cn(
                    'flex shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15',
                    dims
                )}
            >
                <I className={iconInner} aria-hidden />
            </div>
        );
    }

    return (
        <div
            className={cn(
                'flex shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary transition-colors group-hover:bg-primary/15',
                dims
            )}
        >
            {name?.[0] || 'S'}
        </div>
    );
}

export default function Specialties() {
    const [specialties, setSpecialties] = useState([]);
    const [listLoading, setListLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [currentSpecialty, setCurrentSpecialty] = useState(null);
    const [formData, setFormData] = useState({ name: '', icon: '' });

    const iconSelectValue = useMemo(() => {
        const t = formData.icon.trim();
        if (!t) return '__none';
        if (PRESET_ICON_IDS.has(t)) return t;
        return '__custom';
    }, [formData.icon]);

    const fetchSpecialties = async () => {
        try {
            setListLoading(true);
            const res = await api.get('/admin/specialties');
            const data = getPayload(res) ?? res.data;
            const list = Array.isArray(data) ? data : data?.items ?? [];
            setSpecialties(
                list.map((s) => ({
                    ...s,
                    id: s.id,
                    name: s.name,
                    icon: s.icon ?? null,
                    doctorCount: s._count?.doctors ?? s.doctorCount ?? s.count ?? 0,
                }))
            );
        } catch (error) {
            console.error('Failed to fetch specialties', error);
        } finally {
            setListLoading(false);
        }
    };

    useEffect(() => {
        fetchSpecialties();
    }, []);

    const openAddModal = () => {
        setModalMode('add');
        setFormData({ name: '', icon: '' });
        setCurrentSpecialty(null);
        setIsModalOpen(true);
    };

    const openEditModal = (specialty) => {
        setModalMode('edit');
        setCurrentSpecialty(specialty);
        setFormData({
            name: specialty.name ?? '',
            icon: specialty.icon != null ? String(specialty.icon) : '',
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentSpecialty(null);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this specialty?')) {
            try {
                await api.delete(`/admin/specialties/${id}`);
                fetchSpecialties();
            } catch (error) {
                console.error('Failed to delete specialty', error);
                toast.error('Error deleting specialty');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const nameTrim = formData.name.trim();
        const iconTrim = formData.icon.trim().slice(0, ICON_MAX);

        if (!nameTrim) {
            toast.error('Specialty name is required');
            return;
        }
        if (formData.icon.length > ICON_MAX) {
            toast.error(`Icon must be at most ${ICON_MAX} characters`);
            return;
        }

        try {
            setSaving(true);
            if (modalMode === 'add') {
                const body = { name: nameTrim };
                if (iconTrim) body.icon = iconTrim;
                await api.post('/admin/specialties', body);
                toast.success('Specialty added');
            } else {
                const origName = (currentSpecialty.name ?? '').trim();
                const origIcon = (currentSpecialty.icon != null ? String(currentSpecialty.icon) : '').trim();

                const patch = {};
                if (nameTrim !== origName) patch.name = nameTrim;
                if (iconTrim !== origIcon) patch.icon = iconTrim;

                if (Object.keys(patch).length === 0) {
                    toast.error('Change name or icon to save');
                    setSaving(false);
                    return;
                }

                await api.patch(`/admin/specialties/${currentSpecialty.id}`, patch);
                toast.success('Specialty updated');
            }
            fetchSpecialties();
            closeModal();
        } catch (error) {
            console.error('Failed to save specialty', error);
            toast.error(
                error.response?.data?.message || error.message || 'Error saving specialty'
            );
        } finally {
            setSaving(false);
        }
    };

    const handleIconDropdownChange = (value) => {
        if (value === '__none') {
            setFormData((prev) => ({ ...prev, icon: '' }));
            return;
        }
        if (value === '__custom') {
            const t = formData.icon.trim();
            if (PRESET_ICON_IDS.has(t)) {
                setFormData((prev) => ({ ...prev, icon: '' }));
            }
            return;
        }
        setFormData((prev) => ({ ...prev, icon: value }));
    };

    const clearIcon = () => {
        setFormData((prev) => ({ ...prev, icon: '' }));
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Specialties & Categories</h1>
                    <p className="mt-1 font-medium text-brand-gold">Manage medical specialties and icons</p>
                </div>
                <Button type="button" onClick={openAddModal}>
                    <Plus size={18} className="mr-2" />
                    Add Specialty
                </Button>
            </div>

            {listLoading && specialties.length === 0 ? (
                <p className="text-brand-gold">Loading...</p>
            ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {specialties.map((spec) => (
                        <Card
                            key={spec.id}
                            className="group transition-all hover:shadow-card-hover hover:shadow-card"
                        >
                            <CardContent className="flex items-center justify-between p-6">
                                <div className="flex min-w-0 items-center gap-4">
                                    <SpecialtyIconBadge icon={spec.icon} name={spec.name} />
                                    <div className="min-w-0">
                                        <h3 className="text-lg font-bold text-foreground">{spec.name}</h3>
                                        <p className="text-sm font-medium text-brand-gold">
                                            {spec.doctorCount ?? 0} Doctors
                                        </p>
                                        {spec.icon ? (
                                            <p className="mt-1 truncate text-xs text-brand-gold/80" title={spec.icon}>
                                                {spec.icon}
                                            </p>
                                        ) : null}
                                    </div>
                                </div>
                                <div className="flex shrink-0 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => openEditModal(spec)}
                                        className="rounded-xl p-2.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(spec.id)}
                                        className="rounded-xl p-2.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
                <DialogContent className="max-h-[min(90vh,720px)] max-w-lg overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{modalMode === 'add' ? 'Add Specialty' : 'Edit Specialty'}</DialogTitle>
                        <DialogDescription>
                            Pick an icon from the dropdown or use a custom URL / ID below (max {ICON_MAX} chars). Clear
                            removes the icon (save sends empty string).
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="specialtyName">Specialty name</Label>
                            <Input
                                id="specialtyName"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                maxLength={256}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="iconPreset">Icon</Label>
                            <Select value={iconSelectValue} onValueChange={handleIconDropdownChange}>
                                <SelectTrigger id="iconPreset" className="w-full">
                                    <SelectValue placeholder="Select icon" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[min(60vh,320px)]">
                                    <SelectItem value="__none">No icon</SelectItem>
                                    {SPECIALTY_ICON_PRESETS.map(({ value, label, Icon }) => (
                                        <SelectItem key={value} value={value}>
                                            <span className="flex items-center gap-2">
                                                <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                                                <span>
                                                    {label}
                                                    <span className="ml-1 text-brand-gold">({value})</span>
                                                </span>
                                            </span>
                                        </SelectItem>
                                    ))}
                                    <SelectItem value="__custom">Custom URL or other ID…</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="specialtyIcon">Custom URL or icon ID</Label>
                            <Input
                                id="specialtyIcon"
                                value={formData.icon}
                                onChange={(e) => setFormData({ ...formData, icon: e.target.value.slice(0, ICON_MAX) })}
                                placeholder="https://… or stethoscope"
                                maxLength={ICON_MAX}
                            />
                            <div className="flex flex-wrap items-center gap-2">
                                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={clearIcon}>
                                    <ImageOff className="h-4 w-4" />
                                    Clear icon
                                </Button>
                                <span className="text-xs text-[#004d4d]">
                                    {formData.icon.length}/{ICON_MAX}
                                </span>
                            </div>
                        </div>

                        <div className="rounded-xl border border-border bg-muted/30 p-4">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#004d4d]">
                                Preview
                            </p>
                            <div className="flex items-center gap-3">
                                <SpecialtyIconBadge icon={formData.icon} name={formData.name} />
                                <span className="text-sm text-[#004d4d]">
                                    {formData.icon.trim()
                                        ? formData.icon.trim()
                                        : 'No icon — first letter of name will show in lists'}
                                </span>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={closeModal}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={saving}>
                                {modalMode === 'add' ? 'Add' : 'Save'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
