import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card.jsx';
import { Search, Eye, Phone, Droplet, User, Ruler, Weight, UserPlus, MoreVertical, Plus } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select.jsx';
import api, { getPayload } from '@/lib/api';
import { toast } from '@/lib/toast';
import { resolveImageUrl } from '@/lib/images';
import defaultAvatar from '@/assets/doctor-avatar.png';

// Map User + patientProfile from API
function mapPatient(p) {
    const fullName = p.fullName ?? p.full_name ?? '';
    const nameParts = fullName.split(" ");
    const pp = p.patientProfile ?? p.patient_profile ?? {};
    return {
        ...p,
        id: p.id,
        first_name: nameParts[0] ?? '',
        last_name: nameParts.slice(1).join(" ") ?? '',
        fullName,
        email: p.email,
        phone: p.phone,
        profilePhotoUrl: p.profilePhotoUrl ?? p.profile_photo_url,
        isActive: p.isActive ?? p.is_active ?? true,
        gender: pp.gender ?? null,
        age: pp.age ?? null,
        blood_group: pp.bloodGroup ?? pp.blood_group ?? null,
        height: pp.height ?? pp.height_cm ?? pp.heightCm ?? null,
        weight: pp.weight ?? pp.weight_kg ?? pp.weightKg ?? null,
        dob: pp.dob ?? pp.dateOfBirth ?? null,
        condition: pp.condition ?? null,
        emergency_contact: pp.emergencyContact ?? (Array.isArray(p.emergencyContacts) && p.emergencyContacts[0]) ?? {},
    };
}

const isMissingValue = (v) => v === null || v === undefined || v === '';

function FieldValue({ value, suffix = '' }) {
    const missing = isMissingValue(value);
    return (
        <span className={missing ? 'font-medium text-muted-foreground/70 italic' : 'font-semibold text-foreground'}>
            {missing ? 'Not given' : `${value}${suffix}`}
        </span>
    );
}

function emptyPatientCreateForm() {
    return {
        fullName: '',
        email: '',
        phone: '',
        password: '',
        gender: '',
        dob: '',
        weight: '',
        bloodGroup: '',
        emergencyFullName: '',
        emergencyContactNumber: '',
        profilePhotoUrl: '',
        isVerified: true,
    };
}

function apiErr(err) {
    const d = err.response?.data;
    const inner = d?.data ?? d;
    return inner?.message ?? d?.message ?? err.message ?? 'Request failed';
}

export default function Patients() {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createForm, setCreateForm] = useState(emptyPatientCreateForm);
    const [createSubmitting, setCreateSubmitting] = useState(false);
    const [patientDropdown, setPatientDropdown] = useState(null);
    const [passwordPatient, setPasswordPatient] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [passwordSubmitting, setPasswordSubmitting] = useState(false);
    const [statusLoadingId, setStatusLoadingId] = useState(null);
    const prevDebouncedSearch = useRef(debouncedSearch);

    const fetchPatients = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get("/admin/patients", {
                params: {
                    page,
                    limit: 20,
                    ...(debouncedSearch ? { search: debouncedSearch } : {}),
                },
            });
            const data = getPayload(res) ?? res.data;
            const items = data?.items ?? (Array.isArray(data) ? data : []) ?? [];
            setPatients(items.map(mapPatient));
        } catch (error) {
            console.error("Failed to fetch patients", error);
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch]);

    useEffect(() => {
        const id = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 350);
        return () => window.clearTimeout(id);
    }, [searchInput]);

    useEffect(() => {
        if (prevDebouncedSearch.current !== debouncedSearch) {
            prevDebouncedSearch.current = debouncedSearch;
            setPage(1);
        }
    }, [debouncedSearch]);

    useEffect(() => {
        fetchPatients();
    }, [fetchPatients]);

    const openDetailsModal = async (patient) => {
        try {
            setLoading(true);
            const res = await api.get(`/admin/patients/${patient.id}`);
            const p = getPayload(res) ?? res.data;
            setSelectedPatient(mapPatient(p));
            setIsDetailsModalOpen(true);
        } catch (error) {
            console.error("Failed to fetch patient details", error);
        } finally {
            setLoading(false);
        }
    };

    const closeDetailsModal = () => {
        setSelectedPatient(null);
        setIsDetailsModalOpen(false);
    };

    useEffect(() => {
        const onDown = (e) => {
            if (patientDropdown != null && !e.target.closest('.patient-dropdown')) {
                setPatientDropdown(null);
            }
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [patientDropdown]);

    const openCreateModal = () => {
        setCreateForm(emptyPatientCreateForm());
        setIsCreateOpen(true);
    };

    const closeCreateModal = () => {
        setIsCreateOpen(false);
        setCreateForm(emptyPatientCreateForm());
    };

    const handleCreatePatient = async (e) => {
        e.preventDefault();
        const f = createForm;
        if (!f.fullName?.trim() || !f.password || f.password.length < 6) {
            toast.error('Full name and password (min 6 characters) are required.');
            return;
        }
        if (!f.emergencyFullName?.trim() || !f.emergencyContactNumber?.trim()) {
            toast.error('Emergency contact name and number are required.');
            return;
        }
        if (!f.email?.trim() && !f.phone?.trim()) {
            toast.error('Provide at least an email or a phone number.');
            return;
        }
        const body = {
            fullName: f.fullName.trim(),
            password: f.password,
            emergencyFullName: f.emergencyFullName.trim(),
            emergencyContactNumber: f.emergencyContactNumber.trim(),
            isVerified: f.isVerified,
        };
        if (f.email?.trim()) body.email = f.email.trim();
        if (f.phone?.trim()) body.phone = f.phone.trim();
        if (f.gender?.trim()) body.gender = f.gender.trim();
        if (f.dob?.trim()) body.dob = f.dob.trim();
        if (f.weight !== '' && f.weight != null) {
            const w = Number(f.weight);
            if (!Number.isNaN(w)) body.weight = w;
        }
        if (f.bloodGroup?.trim()) body.bloodGroup = f.bloodGroup.trim();
        if (f.profilePhotoUrl?.trim()) body.profilePhotoUrl = f.profilePhotoUrl.trim();

        try {
            setCreateSubmitting(true);
            await api.post('/admin/patients', body);
            closeCreateModal();
            fetchPatients();
        } catch (err) {
            console.error('Create patient failed', err);
            toast.error(apiErr(err));
        } finally {
            setCreateSubmitting(false);
        }
    };

    const openPasswordModal = (patient) => {
        setPasswordPatient(patient);
        setNewPassword('');
        setPatientDropdown(null);
    };

    const closePasswordModal = () => {
        setPasswordPatient(null);
        setNewPassword('');
    };

    const handleResetPatientPassword = async (e) => {
        e.preventDefault();
        if (!passwordPatient || !newPassword || newPassword.length < 6) {
            toast.error('New password must be at least 6 characters.');
            return;
        }
        try {
            setPasswordSubmitting(true);
            const res = await api.patch(`/admin/patients/${passwordPatient.id}/password`, {
                newPassword,
            });
            const msg = getPayload(res)?.message ?? res?.data?.message ?? 'Password updated';
            toast.success(typeof msg === 'string' ? msg : 'Password updated');
            closePasswordModal();
        } catch (err) {
            console.error('Reset password failed', err);
            toast.error(apiErr(err));
        } finally {
            setPasswordSubmitting(false);
        }
    };

    const setPatientActiveStatus = async (patient, active) => {
        try {
            setStatusLoadingId(patient.id);
            setPatientDropdown(null);
            const path = active
                ? `/admin/patients/${patient.id}/activate`
                : `/admin/patients/${patient.id}/deactivate`;
            const res = await api.patch(path, {});
            const raw = getPayload(res) ?? res.data;
            const mapped = mapPatient(raw);
            setPatients((prev) => prev.map((p) => (p.id === patient.id ? mapped : p)));
            if (selectedPatient?.id === patient.id) {
                setSelectedPatient(mapped);
            }
        } catch (err) {
            console.error('Update patient active status failed', err);
            toast.error(apiErr(err));
        } finally {
            setStatusLoadingId(null);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight">Manage Patients</h1>
                <p className="text-brand-gold mt-1 font-medium">View patient records</p>
                 
            </div>

            <Card className="hover:shadow-card">
                <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <CardTitle className="text-xl text-[#004d4d]">Patient Records</CardTitle>
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto md:items-center">
                    <div className="relative w-full md:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
                            <Input
                                type="search"
                                placeholder="Search by name, email, phone…"
                                className="pl-10"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                aria-label="Search patients"
                                autoComplete="off"
                            />
                        </div>
                        <Button type="button" onClick={openCreateModal} className="shrink-0 gap-2">
                            <Plus className="w-4 h-4" />
                            Add patient
                        </Button>
                       
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[800px]">
                            <thead className="bg-surface border-b border-border">
                                <tr>
                                    <th className="text-left px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Patient</th>
                                    <th className="text-left px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Contact</th>
                                    <th className="text-left px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Gender/Age</th>
                                    <th className="text-left px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                                    <th className="text-right px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {loading && patients.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-16 text-center text-muted-foreground font-medium">
                                            Loading patients…
                                        </td>
                                    </tr>
                                ) : !loading && patients.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-16 text-center">
                                            <Search className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
                                            <p className="text-muted-foreground font-medium">
                                                {debouncedSearch
                                                    ? 'No patients match your search.'
                                                    : 'No patients found.'}
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                patients.map((patient, index) => (
                                    <tr key={patient.id} className="hover:bg-accent/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden shrink-0">
                                                    {patient.profilePhotoUrl ? (
                                                        <img src={resolveImageUrl(patient.profilePhotoUrl)} alt={patient.first_name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        patient.first_name?.[0] || '?'
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-foreground">{patient.first_name} {patient.last_name}</div>
                                                    <div className="text-xs text-muted-foreground">{patient.email || '—'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-text-secondary text-sm">
                                            <div className="flex items-center gap-2">
                                                <Phone size={14} />
                                                {patient.phone || '—'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-text-secondary text-sm">
                                            {patient.gender} / {patient.age} yrs
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <Switch
                                                    id={`patient-active-${patient.id}`}
                                                    checked={!!patient.isActive}
                                                    disabled={statusLoadingId === patient.id}
                                                    onCheckedChange={(checked) => {
                                                        if (checked === patient.isActive) return;
                                                        setPatientActiveStatus(patient, checked);
                                                    }}
                                                    aria-label={
                                                        patient.isActive
                                                            ? 'Patient is active, switch to deactivate'
                                                            : 'Patient is inactive, switch to activate'
                                                    }
                                                />
                                                <Label
                                                    htmlFor={`patient-active-${patient.id}`}
                                                    className={`text-xs font-semibold cursor-pointer select-none ${
                                                        patient.isActive ? 'text-foreground' : 'text-muted-foreground'
                                                    }`}
                                                >
                                                    {statusLoadingId === patient.id
                                                        ? 'Updating…'
                                                        : patient.isActive
                                                          ? 'Active'
                                                          : 'Inactive'}
                                                </Label>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex w-full min-w-0 justify-end">
                                                <div className="inline-flex items-center gap-1.5 flex-nowrap shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => openDetailsModal(patient)}
                                                    className="h-9 w-9 inline-flex items-center justify-center shrink-0 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <div className="relative patient-dropdown shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => setPatientDropdown(patientDropdown === patient.id ? null : patient.id)}
                                                        className={`h-9 w-9 inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors ${patientDropdown === patient.id ? 'bg-accent text-foreground' : ''}`}
                                                        title="More"
                                                    >
                                                        <MoreVertical size={18} />
                                                    </button>
                                                    {patientDropdown === patient.id && (
                                                        <div
                                                            className={`absolute right-0 w-48 bg-popover rounded-xl shadow-soft-lg z-50 border border-border py-1 backdrop-blur-xl patient-dropdown
                                                                ${index >= patients.length - 2 ? 'bottom-full mb-2 origin-bottom-right' : 'mt-2 origin-top-right'}`}
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() => openPasswordModal(patient)}
                                                                className="w-full text-left px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted rounded-lg mx-1 transition-colors"
                                                            >
                                                                Reset password
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isDetailsModalOpen} onOpenChange={(open) => !open && closeDetailsModal()}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                {selectedPatient && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Patient Details</DialogTitle>
                        </DialogHeader>

                        <div className="flex flex-col md:flex-row gap-6">
                            <div className="flex-shrink-0 flex flex-col items-center space-y-4">
                            <div className="w-32 h-32 rounded-2xl bg-muted overflow-hidden border-2 border-border shadow-soft">
                                {selectedPatient.profilePhotoUrl && !selectedPatient.profilePhotoUrl.includes('localhost') ? (
                                    <img src={resolveImageUrl(selectedPatient.profilePhotoUrl)} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <img src={defaultAvatar} alt="Avatar" className="w-full h-full object-cover" />
                                )}
                            </div>
                                <div className="text-center">
                                    <h3 className="text-xl font-bold text-foreground">{selectedPatient.first_name} {selectedPatient.last_name}</h3>
                                    <p className="text-muted-foreground">
                                        <FieldValue value={selectedPatient.age} suffix=" Years Old" />
                                    </p>
                                    <p className="text-primary font-medium">
                                        <FieldValue value={selectedPatient.condition} />
                                    </p>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2
                                        ${selectedPatient.isActive ? 'bg-primary/20 text-primary' : 'bg-brand-gold/20 text-brand-gold'}`}>
                                        {selectedPatient.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex-1 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-surface p-4 rounded-xl border border-border">
                                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Droplet size={14} /> Blood Group</p>
                                        <p><FieldValue value={selectedPatient.blood_group} /></p>
                                    </div>
                                    <div className="bg-surface p-4 rounded-xl border border-border">
                                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><User size={14} /> Gender</p>
                                        <p><FieldValue value={selectedPatient.gender} /></p>
                                    </div>
                                    <div className="bg-surface p-4 rounded-xl border border-border">
                                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Ruler size={14} /> Height</p>
                                        <p><FieldValue value={selectedPatient.height} suffix=" cm" /></p>
                                    </div>
                                    <div className="bg-surface p-4 rounded-xl border border-border">
                                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Weight size={14} /> Weight</p>
                                        <p><FieldValue value={selectedPatient.weight} suffix=" kg" /></p>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-semibold mb-3 border-b border-border pb-2 text-foreground">Contact Information</h4>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Email:</span>
                                            <FieldValue value={selectedPatient.email} />
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Phone:</span>
                                            <FieldValue value={selectedPatient.phone} />
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Date of Birth:</span>
                                            <FieldValue value={selectedPatient.dob} />
                                        </div>
                                    </div>
                                </div>

                                {selectedPatient.emergency_contact && (selectedPatient.emergency_contact.name || selectedPatient.emergency_contact.phone) && (
                                    <div>
                                        <h4 className="font-semibold mb-3 border-b border-border pb-2 text-destructive flex items-center gap-2">
                                            <UserPlus size={18} /> Emergency Contact
                                        </h4>
                                        <div className="bg-destructive/10 p-4 rounded-xl space-y-2 text-sm border border-destructive/20">
                                            <div className="flex justify-between">
                                                <span className="text-destructive/90">Name:</span>
                                                <FieldValue value={selectedPatient.emergency_contact?.name} />
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-destructive/90">Relation:</span>
                                                <FieldValue value={selectedPatient.emergency_contact?.relation} />
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-destructive/90">Phone:</span>
                                                <FieldValue value={selectedPatient.emergency_contact?.phone} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
                </DialogContent>
            </Dialog>

            <Dialog open={isCreateOpen} onOpenChange={(open) => !open && closeCreateModal()}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Create patient</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreatePatient} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2 space-y-2">
                                <Label htmlFor="p-fullName">Full name *</Label>
                                <Input
                                    id="p-fullName"
                                    value={createForm.fullName}
                                    onChange={(e) => setCreateForm((s) => ({ ...s, fullName: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="p-email">Email</Label>
                                <Input
                                    id="p-email"
                                    type="email"
                                    value={createForm.email}
                                    onChange={(e) => setCreateForm((s) => ({ ...s, email: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="p-phone">Phone</Label>
                                <Input
                                    id="p-phone"
                                    value={createForm.phone}
                                    onChange={(e) => setCreateForm((s) => ({ ...s, phone: e.target.value }))}
                                />
                            </div>
                            <div className="sm:col-span-2 space-y-2">
                                <Label htmlFor="p-password">Password * (min 6)</Label>
                                <Input
                                    id="p-password"
                                    type="password"
                                    autoComplete="new-password"
                                    value={createForm.password}
                                    onChange={(e) => setCreateForm((s) => ({ ...s, password: e.target.value }))}
                                    required
                                    minLength={6}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Gender</Label>
                                <Select
                                    value={createForm.gender || '__none__'}
                                    onValueChange={(v) => setCreateForm((s) => ({ ...s, gender: v === '__none__' ? '' : v }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Optional" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">—</SelectItem>
                                        <SelectItem value="Male">Male</SelectItem>
                                        <SelectItem value="Female">Female</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="p-dob">Date of birth</Label>
                                <Input
                                    id="p-dob"
                                    type="date"
                                    value={createForm.dob}
                                    onChange={(e) => setCreateForm((s) => ({ ...s, dob: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="p-weight">Weight (kg)</Label>
                                <Input
                                    id="p-weight"
                                    type="number"
                                    min={0}
                                    step="0.1"
                                    value={createForm.weight}
                                    onChange={(e) => setCreateForm((s) => ({ ...s, weight: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="p-blood">Blood group</Label>
                                <Input
                                    id="p-blood"
                                    placeholder="e.g. O+"
                                    value={createForm.bloodGroup}
                                    onChange={(e) => setCreateForm((s) => ({ ...s, bloodGroup: e.target.value }))}
                                />
                            </div>
                            <div className="sm:col-span-2 space-y-2">
                                <Label htmlFor="p-em-name">Emergency contact name *</Label>
                                <Input
                                    id="p-em-name"
                                    value={createForm.emergencyFullName}
                                    onChange={(e) => setCreateForm((s) => ({ ...s, emergencyFullName: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="sm:col-span-2 space-y-2">
                                <Label htmlFor="p-em-phone">Emergency contact number *</Label>
                                <Input
                                    id="p-em-phone"
                                    value={createForm.emergencyContactNumber}
                                    onChange={(e) => setCreateForm((s) => ({ ...s, emergencyContactNumber: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="sm:col-span-2 space-y-2">
                                <Label htmlFor="p-photo">Profile photo URL</Label>
                                <Input
                                    id="p-photo"
                                    value={createForm.profilePhotoUrl}
                                    onChange={(e) => setCreateForm((s) => ({ ...s, profilePhotoUrl: e.target.value }))}
                                    placeholder="/uploads/..."
                                />
                            </div>
                            <div className="sm:col-span-2 flex items-center justify-between rounded-xl border border-border px-4 py-3">
                                <div>
                                    <Label htmlFor="p-verified">Verified</Label>
                                    <p className="text-xs text-muted-foreground mt-0.5">Defaults to on if omitted on API</p>
                                </div>
                                <Switch
                                    id="p-verified"
                                    checked={createForm.isVerified}
                                    onCheckedChange={(checked) => setCreateForm((s) => ({ ...s, isVerified: checked }))}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={closeCreateModal}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createSubmitting}>
                                {createSubmitting ? 'Creating…' : 'Create patient'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={!!passwordPatient} onOpenChange={(open) => !open && closePasswordModal()}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Reset password</DialogTitle>
                        <p className="text-sm text-muted-foreground pt-1">
                            {passwordPatient
                                ? `${passwordPatient.first_name} ${passwordPatient.last_name}`.trim() || passwordPatient.fullName
                                : ''}
                        </p>
                    </DialogHeader>
                    <form onSubmit={handleResetPatientPassword} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="p-new-pw">New password *</Label>
                            <Input
                                id="p-new-pw"
                                type="password"
                                autoComplete="new-password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                minLength={6}
                                required
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={closePasswordModal}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={passwordSubmitting}>
                                {passwordSubmitting ? 'Saving…' : 'Update password'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
