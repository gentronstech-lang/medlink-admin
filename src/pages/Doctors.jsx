import React, { useEffect, useRef, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Search, MoreVertical, ShieldCheck, Ban, CheckCircle, Eye, Calendar, MapPin, Plus, Trash2, Building2, FileText, ExternalLink } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select.jsx';
import api, { getPayload } from "@/lib/api";
import { toast } from '@/lib/toast';
import { resolveImageUrl } from "@/lib/images";
import { APP_CURRENCY_DISPLAY, formatAmount } from '@/lib/currency';
import { formatWallClockRange } from '@/lib/wall-clock-time';
import doctorAvatar from "@/assets/doctor-avatar.png";

const DAY_NAMES_JS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_OPTIONS_CREATE = DAY_NAMES_JS.map((name, dayOfWeek) => ({ dayOfWeek, name }));

/** 15-minute steps; values are HH:mm for the API */
const TIME_SLOT_MINUTES = 15;
const TIME_SELECT_OPTIONS = (() => {
    const out = [];
    for (let total = 0; total < 24 * 60; total += TIME_SLOT_MINUTES) {
        const h = Math.floor(total / 60);
        const min = total % 60;
        const value = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
        const d = new Date(2000, 0, 1, h, min);
        out.push({
            value,
            label: d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
        });
    }
    return out;
})();

function nearestTimeSlotValue(v) {
    if (typeof v !== 'string') return '09:00';
    const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
    if (!m) return '09:00';
    let hh = Number(m[1]);
    let mm = Number(m[2]);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return '09:00';
    hh = Math.min(23, Math.max(0, hh));
    mm = Math.min(59, Math.max(0, mm));
    const mins = hh * 60 + mm;
    let best = TIME_SELECT_OPTIONS[0]?.value ?? '09:00';
    let bestDist = Infinity;
    for (const o of TIME_SELECT_OPTIONS) {
        const [oh, om] = o.value.split(':').map(Number);
        const omins = oh * 60 + om;
        const dist = Math.abs(omins - mins);
        if (dist < bestDist) {
            bestDist = dist;
            best = o.value;
        }
    }
    return best;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
let mapsPlacesLoaderPromise = null;

function loadGooglePlacesLibrary() {
    if (typeof window === 'undefined') return Promise.reject(new Error('window not available'));
    if (!GOOGLE_MAPS_API_KEY) return Promise.reject(new Error('Missing VITE_GOOGLE_MAPS_API_KEY'));
    if (window.google?.maps?.places) return Promise.resolve(window.google);
    if (mapsPlacesLoaderPromise) return mapsPlacesLoaderPromise;

    mapsPlacesLoaderPromise = new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-google-maps-places="true"]');
        if (existing) {
            existing.addEventListener('load', () => resolve(window.google));
            existing.addEventListener('error', () => reject(new Error('Google Maps script failed to load')));
            return;
        }
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.dataset.googleMapsPlaces = 'true';
        script.onload = () => resolve(window.google);
        script.onerror = () => reject(new Error('Google Maps script failed to load'));
        document.head.appendChild(script);
    });

    return mapsPlacesLoaderPromise;
}

function isClinicOrHospitalPrediction(prediction) {
    if (!prediction || typeof prediction !== 'object') return false;
    const types = Array.isArray(prediction.types) ? prediction.types.map((t) => String(t).toLowerCase()) : [];
    const text = `${prediction.description ?? ''} ${prediction.structured_formatting?.main_text ?? ''}`.toLowerCase();
    const keywordHit =
        text.includes('clinic') ||
        text.includes('hospital') ||
        text.includes('medical center') ||
        text.includes('health center') ||
        text.includes('healthcare');
    const typeHit = types.some((t) =>
        ['hospital', 'health', 'doctor', 'pharmacy', 'establishment'].includes(t)
    );
    return keywordHit || typeHit;
}

function emptyDoctorCreateForm() {
    return {
        fullName: '',
        email: '',
        password: '',
        phone: '',
        bio: '',
        specialtyIds: [],
        experienceInYears: '',
        clinicName: '',
        clinicAddress: '',
        perSessionRate: '',
        profilePhotoUrl: '',
        licenseDocumentUrl: '',
        isVerified: true,
        isApproved: true,
    };
}

function apiErr(err) {
    const d = err.response?.data;
    const inner = d?.data ?? d;
    return inner?.message ?? d?.message ?? err.message ?? 'Request failed';
}
const DAY_NAMES_ISO = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function dayLabelFromApi(dayOfWeek) {
    if (dayOfWeek == null || dayOfWeek === '') return '—';
    const n = Number(dayOfWeek);
    if (Number.isInteger(n) && n >= 1 && n <= 7) return DAY_NAMES_ISO[n - 1];
    if (Number.isInteger(n) && n >= 0 && n <= 6) return DAY_NAMES_JS[n];
    return `Day ${dayOfWeek}`;
}

/** API may send availability on the user root as an array, or nested legacy object map */
function normalizeEarningsSummary(raw) {
    const e = raw && typeof raw === 'object' ? raw : {};
    const num = (v) => {
        const x = Number(v);
        return Number.isFinite(x) ? x : 0;
    };
    return {
        earningsCount: num(e.earningsCount ?? e.earnings_count),
        netAfterPaidPayouts: num(e.netAfterPaidPayouts ?? e.net_after_paid_payouts),
        pendingPayoutsTotal: num(e.pendingPayoutsTotal ?? e.pending_payouts_total),
        totalEarnings: num(e.totalEarnings ?? e.total_earnings),
        totalPaidOut: num(e.totalPaidOut ?? e.total_paid_out),
    };
}

function normalizeAvailabilityRows(raw) {
    if (Array.isArray(raw)) {
        return raw
            .filter((e) => e && e.isActive !== false)
            .map((e, i) => {
                const day = dayLabelFromApi(e.dayOfWeek);
                const range = formatWallClockRange(e.startTime, e.endTime);
                const shift = e.shift ? String(e.shift).replace(/_/g, ' ') : '';
                const right = [shift, range].filter(Boolean).join(' · ') || '—';
                return { key: e.id ?? `slot-${i}`, day, right };
            });
    }
    if (raw && typeof raw === 'object') {
        return Object.entries(raw).map(([day, slots]) => ({
            key: day,
            day,
            right: Array.isArray(slots) ? slots.join(', ') : String(slots),
        }));
    }
    return [];
}

function isPdfAsset(path) {
    if (!path || typeof path !== 'string') return false;
    return /\.pdf($|\?)/i.test(path);
}

const DOCTOR_TABS = [
    { id: 'pending', label: 'Pending Review' },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'deactivated', label: 'Self Deactivated' },
];

// Map User + doctorProfile from API to display format
function mapDoctor(doc) {
    const fullName = doc.fullName ?? doc.full_name ?? '';
    const nameParts = fullName.split(" ");
    const dp = doc.doctorProfile ?? doc.doctor_profile ?? {};
    const specialties = doc.doctorSpecialties ?? doc.doctor_specialties ?? [];
    const org = doc.organization ?? dp.organization ?? {};
    const specialtyName = specialties[0]?.specialty?.name ?? dp.specialty ?? '';
    const availabilityRaw = doc.availability ?? dp.availability;
    const earningsSummary = normalizeEarningsSummary(doc.earningsSummary);
    const registrationStatus =
        dp.registrationStatus ??
        dp.registration_status ??
        (dp.isApproved ?? dp.is_approved ? 'APPROVED' : 'PENDING');
    return {
        ...doc,
        id: doc.id,
        first_name: nameParts[0] ?? '',
        last_name: nameParts.slice(1).join(" ") ?? '',
        fullName,
        email: doc.email,
        phone: doc.phone,
        isActive: doc.isActive ?? doc.is_active ?? true,
        isDeleted: doc.isDeleted ?? doc.is_deleted ?? false,
        profilePhotoUrl: doc.profilePhotoUrl ?? doc.profile_image_url,
        specialty: specialtyName,
        hospital_name:
            org.name ??
            doc.organizationName ??
            doc.organization_name ??
            dp.clinicName ??
            dp.clinic_name ??
            dp.hospitalName ??
            dp.hospital_name ??
            '',
        clinicAddress: dp.clinicAddress ?? dp.clinic_address ?? '',
        licenseDocumentUrl:
            dp.licenseDocumentUrl ??
            dp.license_document_url ??
            doc.licenseDocumentUrl ??
            doc.license_document_url ??
            null,
        licenseNo: dp.licenseNo ?? dp.license_no ?? null,
        isApproved: dp.isApproved ?? dp.is_approved ?? false,
        isAvailable: dp.isAvailable ?? dp.is_available ?? true,
        registrationStatus,
        rating: dp.rating ?? 0,
        experienceYears:
            dp.yearsExperience ??
            dp.experienceYears ??
            dp.experience_years ??
            0,
        consultationFee: dp.consultationFee ?? dp.consultation_fee ?? 0,
        availability: availabilityRaw ?? {},
        availabilityRows: normalizeAvailabilityRows(availabilityRaw),
        earningsSummary,
    };
}

export default function Doctors() {
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('pending');
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [payouts, setPayouts] = useState([]);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
    const [payoutDoctor, setPayoutDoctor] = useState(null);
    const [isCreateDoctorOpen, setIsCreateDoctorOpen] = useState(false);
    const [doctorCreateForm, setDoctorCreateForm] = useState(emptyDoctorCreateForm);
    const [availabilityRows, setAvailabilityRows] = useState([
        { key: 'init', dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
    ]);
    const [specialtiesList, setSpecialtiesList] = useState([]);
    const [createDoctorSubmitting, setCreateDoctorSubmitting] = useState(false);
    const [uploadingDoctorAsset, setUploadingDoctorAsset] = useState(null);
    const [passwordDoctor, setPasswordDoctor] = useState(null);
    const [doctorNewPassword, setDoctorNewPassword] = useState('');
    const [doctorPasswordSubmitting, setDoctorPasswordSubmitting] = useState(false);
    const [clinicAddressSuggestions, setClinicAddressSuggestions] = useState([]);
    const [clinicAddressLoading, setClinicAddressLoading] = useState(false);
    const [placesReady, setPlacesReady] = useState(false);
    const [clinicAddressFocused, setClinicAddressFocused] = useState(false);
    const addressDebounceRef = useRef(null);
    const autocompleteServiceRef = useRef(null);
    const placesServiceRef = useRef(null);

    const fetchDoctors = async () => {
        try {
            setLoading(true);
            const res = await api.get("/admin/doctors", {
                params: {
                    page,
                    limit: 20,
                    search: search || undefined,
                    tab: activeTab,
                },
            });
            const data = getPayload(res) ?? res.data;
            const items = data?.items ?? (Array.isArray(data) ? data : []) ?? [];
            setDoctors(items.map(mapDoctor));
        } catch (error) {
            console.error("Failed to fetch doctors", error);
            toast.error(apiErr(error) || 'Failed to load doctors');
            setDoctors([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchPayouts = async () => {
        try {
            const res = await api.get("/admin/payouts", { params: { page: 1, limit: 100 } });
            const data = getPayload(res) ?? res.data;
            setPayouts(data?.items ?? (Array.isArray(data) ? data : []) ?? []);
        } catch (error) {
            console.error("Failed to fetch payouts", error);
        }
    };

    useEffect(() => {
        fetchDoctors();
    }, [page, search, activeTab]);

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        setPage(1);
    };

    useEffect(() => {
        fetchPayouts();
    }, []);

    const pendingEarnings = {};
    payouts.filter(p => (p.status === 'PENDING' || p.status === 'pending')).forEach(p => {
        const did = p.doctorId ?? p.doctor_id ?? p.userId;
        if (did) {
            pendingEarnings[did] = (pendingEarnings[did] || 0) + (p.amount ?? 0);
        }
    });

    const payoutHistory = {};
    payouts.filter(p => p.status === 'COMPLETED' || p.status === 'completed').forEach(p => {
        const did = p.doctorId ?? p.doctor_id ?? p.userId;
        if (did) {
            if (!payoutHistory[did]) payoutHistory[did] = [];
            payoutHistory[did].push({
                id: p.id,
                date: p.paidAt ?? p.createdAt ?? p.updatedAt ?? '',
                amount: p.amount ?? 0
            });
        }
    });

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (activeDropdown && !event.target.closest('.dropdown-container')) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeDropdown]);

    const openDetailsModal = async (doctor) => {
        try {
            setLoading(true);
            const res = await api.get(`/admin/doctors/${doctor.id}`);
            const doc = getPayload(res) ?? res.data;
            setSelectedDoctor(mapDoctor(doc));
            setIsModalOpen(true);
            setActiveDropdown(null);
        } catch (error) {
            console.error("Failed to fetch doctor details", error);
        } finally {
            setLoading(false);
        }
    };

    const closeDetailsModal = () => {
        setSelectedDoctor(null);
        setIsModalOpen(false);
    };

    const toggleDropdown = (doctorId) => {
        setActiveDropdown(activeDropdown === doctorId ? null : doctorId);
    };

    const handleStatusChange = async (doctorId, updates, successMessage) => {
            try {
                await api.patch(`/admin/doctors/${doctorId}`, updates);
                fetchDoctors();
                if (successMessage) toast.success(successMessage);
            } catch (error) {
                console.error("Failed to update doctor", error);
                toast.error('Error updating doctor');
            }
    };

    const handlePendingAction = (doctor, action) => {
        if (action === 'approve') {
            handleStatusChange(
                doctor.id,
                { isApproved: true, isAvailable: true, isActive: true },
                `${doctor.fullName || doctor.first_name} approved successfully`,
            );
            return;
        }
        if (action === 'reject') {
            if (!window.confirm(`Reject ${doctor.fullName || doctor.first_name}? They will move to the rejected list.`)) {
                return;
            }
            handleStatusChange(
                doctor.id,
                { isApproved: false, isAvailable: false },
                `${doctor.fullName || doctor.first_name} rejected`,
            );
        }
    };

    const handleToggleDoctorActive = (doctor, checked) => {
        handleStatusChange(
            doctor.id,
            { isActive: checked },
            checked ? 'Doctor account enabled' : 'Doctor account disabled',
        );
    };

    const renderStatusCell = (doctor) => {
        if (activeTab === 'pending') {
            return (
                <Select onValueChange={(value) => handlePendingAction(doctor, value)}>
                    <SelectTrigger className="w-[150px] h-9 bg-background">
                        <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="approve">Approve</SelectItem>
                        <SelectItem value="reject">Reject</SelectItem>
                    </SelectContent>
                </Select>
            );
        }

        if (activeTab === 'approved') {
            const active = doctor.isActive !== false;
            return (
                <div className="flex items-center gap-2">
                    <Switch
                        checked={active}
                        onCheckedChange={(checked) => handleToggleDoctorActive(doctor, checked)}
                    />
                    <span className={`text-xs font-semibold ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                        {active ? 'Active' : 'Disabled'}
                    </span>
                </div>
            );
        }

        if (activeTab === 'rejected') {
            return (
                <span className="inline-flex w-fit items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-destructive/10 text-destructive">
                    Rejected
                </span>
            );
        }

        return (
            <span className="inline-flex w-fit items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted text-muted-foreground">
                Deactivated
            </span>
        );
    };

    const emptyTabMessage = {
        pending: 'No doctors waiting for review.',
        approved: 'No approved doctors yet.',
        rejected: 'No rejected doctors.',
        deactivated: 'No self-deactivated doctor accounts.',
    };

    const renderLicensePreview = (doctor, compact = false) => {
        const url = doctor.licenseDocumentUrl;
        if (!url) {
            return (
                <span className="text-xs text-muted-foreground italic">Not uploaded</span>
            );
        }
        const resolved = resolveImageUrl(url);
        if (compact) {
            return (
                <a
                    href={resolved}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                >
                    <FileText size={14} />
                    View license
                    <ExternalLink size={12} />
                </a>
            );
        }
        if (isPdfAsset(url)) {
            return (
                <a
                    href={resolved}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-primary hover:bg-muted/50 transition-colors"
                >
                    <FileText size={18} />
                    Open medical license (PDF)
                    <ExternalLink size={14} />
                </a>
            );
        }
        return (
            <a
                href={resolved}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl border border-border overflow-hidden bg-surface hover:opacity-95 transition-opacity max-w-md"
            >
                <img
                    src={resolved}
                    alt="Medical license"
                    className="w-full max-h-80 object-contain bg-muted/30"
                />
            </a>
        );
    };

    const openPayoutModal = (doctor) => {
        setPayoutDoctor(doctor);
        setIsPayoutModalOpen(true);
        setActiveDropdown(null);
    };

    const closePayoutModal = () => {
        setPayoutDoctor(null);
        setIsPayoutModalOpen(false);
    };

    const handleProcessPayout = async () => {
        if (!payoutDoctor) return;
        const payout = payouts.find(p =>
            (p.doctorId ?? p.doctor_id ?? p.userId) === payoutDoctor.id &&
            (p.status === 'PENDING' || p.status === 'pending')
        );
        if (!payout) {
            toast.error('No pending payout found for this doctor');
            return;
        }
        try {
            await api.patch(`/admin/payouts/${payout.id}/status`, {
                status: 'PROCESSING',
                provider: 'Bank',
                providerRef: `ref-${Date.now()}`
            });
            fetchPayouts();
            fetchDoctors();
            closePayoutModal();
        } catch (error) {
            console.error("Failed to process payout", error);
            toast.error('Error processing payout');
        }
    };

    const [isReviewsModalOpen, setIsReviewsModalOpen] = useState(false);
    const [currentReviewDoctor, setCurrentReviewDoctor] = useState(null);

    const openReviewsModal = (doctor) => {
        setCurrentReviewDoctor(doctor);
        setIsReviewsModalOpen(true);
    };

    const closeReviewsModal = () => {
        setIsReviewsModalOpen(false);
        setCurrentReviewDoctor(null);
    };

    useEffect(() => {
        if (!isCreateDoctorOpen) return;
        loadGooglePlacesLibrary()
            .then(() => {
                if (!window.google?.maps?.places) return;
                autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
                placesServiceRef.current = new window.google.maps.places.PlacesService(document.createElement('div'));
                setPlacesReady(true);
            })
            .catch((err) => {
                setPlacesReady(false);
                console.error('Google Places init failed', err);
                toast.error('Google Maps address suggestions unavailable.');
            });
    }, [isCreateDoctorOpen]);

    useEffect(() => {
        const input = doctorCreateForm.clinicAddress?.trim();
        if (!isCreateDoctorOpen || !clinicAddressFocused || !placesReady || !input) {
            setClinicAddressLoading(false);
            setClinicAddressSuggestions([]);
            return;
        }

        if (addressDebounceRef.current) {
            clearTimeout(addressDebounceRef.current);
        }
        setClinicAddressLoading(true);

        addressDebounceRef.current = setTimeout(() => {
            const svc = autocompleteServiceRef.current;
            if (!svc) {
                setClinicAddressLoading(false);
                return;
            }
            svc.getPlacePredictions({ input, types: ['establishment'] }, (predictions, status) => {
                const ok = status === window.google?.maps?.places?.PlacesServiceStatus?.OK;
                const list = ok && Array.isArray(predictions) ? predictions.filter(isClinicOrHospitalPrediction) : [];
                setClinicAddressSuggestions(list);
                setClinicAddressLoading(false);
            });
        }, 250);

        return () => {
            if (addressDebounceRef.current) {
                clearTimeout(addressDebounceRef.current);
            }
        };
    }, [doctorCreateForm.clinicAddress, clinicAddressFocused, isCreateDoctorOpen, placesReady]);

    const selectClinicAddress = (prediction) => {
        if (!prediction?.place_id) return;
        const fallbackName = prediction.structured_formatting?.main_text || prediction.terms?.[0]?.value || '';
        const fallbackAddress = prediction.description || '';
        setDoctorCreateForm((s) => ({
            ...s,
            clinicAddress: fallbackAddress,
            clinicName: fallbackName,
        }));
        setClinicAddressSuggestions([]);
        setClinicAddressFocused(false);

        const service = placesServiceRef.current;
        if (!service) return;
        service.getDetails(
            { placeId: prediction.place_id, fields: ['name', 'formatted_address'] },
            (place, status) => {
                const ok = status === window.google?.maps?.places?.PlacesServiceStatus?.OK;
                if (!ok || !place) return;
                setDoctorCreateForm((s) => ({
                    ...s,
                    clinicAddress: place.formatted_address || fallbackAddress,
                    clinicName: place.name || fallbackName,
                }));
            }
        );
    };

    const uploadDoctorCreateImage = async (file, field) => {
        if (!file) return;
        try {
            setUploadingDoctorAsset(field);
            const fd = new FormData();
            fd.append('file', file);
            const res = await api.post('/upload/image', fd);
            const payload = getPayload(res) ?? res.data ?? {};
            const url = payload.url ?? payload.data?.url;
            if (url) {
                setDoctorCreateForm((prev) => ({ ...prev, [field]: url }));
            } else {
                console.error('Upload image: URL missing in response', payload);
                toast.error('Image uploaded but URL missing in response.');
            }
        } catch (err) {
            console.error('Doctor create image upload failed', err);
            toast.error(apiErr(err));
        } finally {
            setUploadingDoctorAsset(null);
        }
    };

    const openCreateDoctorModal = async () => {
        setDoctorCreateForm(emptyDoctorCreateForm());
        setAvailabilityRows([{ key: `k-${Date.now()}`, dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }]);
        setUploadingDoctorAsset(null);
        setClinicAddressSuggestions([]);
        setClinicAddressLoading(false);
        setClinicAddressFocused(false);
        setIsCreateDoctorOpen(true);
        setActiveDropdown(null);
        try {
            const res = await api.get('/admin/specialties');
            const data = getPayload(res) ?? res.data;
            const list = Array.isArray(data) ? data : (data?.items ?? []);
            setSpecialtiesList(list.map((s) => ({ id: s.id, name: s.name ?? `Specialty ${s.id}` })));
        } catch (e) {
            console.error('Failed to load specialties', e);
            setSpecialtiesList([]);
        }
    };

    const closeCreateDoctorModal = () => {
        setIsCreateDoctorOpen(false);
        setDoctorCreateForm(emptyDoctorCreateForm());
        setAvailabilityRows([{ key: `k-${Date.now()}`, dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }]);
        setUploadingDoctorAsset(null);
        setClinicAddressSuggestions([]);
        setClinicAddressLoading(false);
        setClinicAddressFocused(false);
    };

    const addAvailabilityRow = () => {
        setAvailabilityRows((rows) => {
            const last = rows[rows.length - 1];
            const prevDay = Number(last?.dayOfWeek ?? 0);
            const nextDay = (prevDay + 1) % 7;
            return [
                ...rows,
                {
                    key: `k-${Date.now()}-${rows.length}`,
                    dayOfWeek: nextDay,
                    startTime: nearestTimeSlotValue(last?.startTime ?? '09:00'),
                    endTime: nearestTimeSlotValue(last?.endTime ?? '17:00'),
                },
            ];
        });
    };

    const removeAvailabilityRow = (key) => {
        setAvailabilityRows((rows) => (rows.length <= 1 ? rows : rows.filter((r) => r.key !== key)));
    };

    const updateAvailabilityRow = (key, patch) => {
        setAvailabilityRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    };

    const handleCreateDoctor = async (e) => {
        e.preventDefault();
        const f = doctorCreateForm;
        if (!f.fullName?.trim() || !f.password || f.password.length < 6) {
            toast.error('Full name and password (min 6 characters) are required.');
            return;
        }
        if (!f.phone?.trim()) {
            toast.error('Phone is required.');
            return;
        }
        const body = {
            fullName: f.fullName.trim(),
            password: f.password,
            phone: f.phone.trim(),
            isVerified: f.isVerified,
            isApproved: f.isApproved,
        };
        if (f.email?.trim()) body.email = f.email.trim();
        if (f.bio?.trim()) body.bio = f.bio.trim();
        if (f.specialtyIds.length) {
            body.specialtyIds = f.specialtyIds;
            const spec = specialtiesList.find((s) => s.id === f.specialtyIds[0]);
            if (spec?.name?.trim()) body.specialization = spec.name.trim();
        }
        const exp = Number(f.experienceInYears);
        if (f.experienceInYears !== '' && !Number.isNaN(exp)) body.experienceInYears = exp;
        if (f.clinicName?.trim()) body.clinicName = f.clinicName.trim();
        if (f.clinicAddress?.trim()) body.clinicAddress = f.clinicAddress.trim();
        const rate = Number(f.perSessionRate);
        if (f.perSessionRate !== '' && !Number.isNaN(rate)) body.perSessionRate = rate;
        const slots = availabilityRows
            .filter((r) => r.startTime && r.endTime)
            .map((r) => ({
                dayOfWeek: Number(r.dayOfWeek),
                startTime: nearestTimeSlotValue(r.startTime),
                endTime: nearestTimeSlotValue(r.endTime),
            }));
        if (slots.length) body.availability = slots;
        if (f.profilePhotoUrl?.trim()) {
            body.profilePhotoUrl = resolveImageUrl(f.profilePhotoUrl.trim());
        }
        if (f.licenseDocumentUrl?.trim()) {
            body.licenseDocumentUrl = resolveImageUrl(f.licenseDocumentUrl.trim());
        }

        try {
            setCreateDoctorSubmitting(true);
            await api.post('/admin/doctors', body);
            closeCreateDoctorModal();
            // Reset any active search so newly created doctor is visible in list.
            setSearch('');
            fetchDoctors();
        } catch (err) {
            console.error('Create doctor failed', err);
            toast.error(apiErr(err));
        } finally {
            setCreateDoctorSubmitting(false);
        }
    };

    const openDoctorPasswordModal = (doctor) => {
        setPasswordDoctor(doctor);
        setDoctorNewPassword('');
        setActiveDropdown(null);
    };

    const closeDoctorPasswordModal = () => {
        setPasswordDoctor(null);
        setDoctorNewPassword('');
    };

    const handleResetDoctorPassword = async (e) => {
        e.preventDefault();
        if (!passwordDoctor || !doctorNewPassword || doctorNewPassword.length < 6) {
            toast.error('New password must be at least 6 characters.');
            return;
        }
        try {
            setDoctorPasswordSubmitting(true);
            const res = await api.patch(`/admin/doctors/${passwordDoctor.id}/password`, {
                newPassword: doctorNewPassword,
            });
            const msg = getPayload(res)?.message ?? res?.data?.message ?? 'Password updated';
            toast.success(typeof msg === 'string' ? msg : 'Password updated');
            closeDoctorPasswordModal();
        } catch (err) {
            console.error('Reset doctor password failed', err);
            toast.error(apiErr(err));
        } finally {
            setDoctorPasswordSubmitting(false);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight">Manage Doctors</h1>
                <p className="text-brand-gold mt-1 font-medium">View and manage doctor accounts</p>
                 
            </div>

            <Card className="hover:shadow-card">
                <CardHeader className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <CardTitle className="text-xl text-[#004d4d]">Doctors</CardTitle>
                        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto md:items-center">
                            <div className="relative w-full md:w-72">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                <Input
                                    type="text"
                                    placeholder="Search doctors..."
                                    className="pl-10"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <Button type="button" onClick={openCreateDoctorModal} className="shrink-0 gap-2">
                                <Plus className="w-4 h-4" />
                                Add doctor
                            </Button>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 border-b border-border pb-1">
                        {DOCTOR_TABS.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => handleTabChange(tab.id)}
                                className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors border-b-2 -mb-px ${
                                    activeTab === tab.id
                                        ? 'border-primary text-primary bg-primary/5'
                                        : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[980px]">
                            <thead className="bg-surface border-b border-border">
                                <tr>
                                    <th className="text-left px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Doctor</th>
                                    <th className="text-left px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Specialization</th>
                                    {/* <th className="text-left px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Rating</th> */}
                                    <th className="text-left px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Hospital</th>
                                    <th className="text-left px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Earnings</th>
                                    {activeTab === 'pending' && (
                                        <th className="text-left px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Medical License</th>
                                    )}
                                    <th className="text-left px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                                    <th className="text-right px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {doctors.map((doctor, index) => (
                                    <tr key={doctor.id} className="hover:bg-accent/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden shrink-0">
                                                    {doctor.profilePhotoUrl && !doctor.profilePhotoUrl.includes("localhost") ? (
                                                        <img
                                                            src={resolveImageUrl(doctor.profilePhotoUrl)}
                                                            alt={doctor.first_name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <img
                                                            src={doctorAvatar}
                                                            alt={doctor.first_name || "Doctor avatar"}
                                                            className="h-full w-full origin-top scale-[1.08] object-cover object-top"
                                                        />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-foreground">{doctor.first_name} {doctor.last_name}</div>
                                                    <div className="text-xs text-muted-foreground">{doctor.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-text-secondary text-sm">{doctor.specialty || '—'}</td>
                                        {/* <td className="px-6 py-4 whitespace-nowrap text-muted-foreground text-sm">
                                            <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => openReviewsModal(doctor)}>
                                                <Star size={14} className="fill-amber-400 text-amber-400" />
                                                <span className="font-medium text-foreground">{doctor.rating || '—'}</span>
                                            </div>
                                        </td> */}
                                        <td className="px-6 py-4 whitespace-nowrap text-text-secondary text-sm">{doctor.hospital_name || '—'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-text-secondary text-sm">
                                            {APP_CURRENCY_DISPLAY}{' '}
                                            {formatAmount(doctor.earningsSummary?.totalEarnings)}
                                        </td>
                                        {activeTab === 'pending' && (
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {renderLicensePreview(doctor, true)}
                                            </td>
                                        )}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {renderStatusCell(doctor)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-3">
                                                {/* <button onClick={() => handleStatusChange(doctor.id, { isApproved: true })} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Approve">
                                                    <CheckCircle size={18} />
                                                </button>
                                                <button onClick={() => handleStatusChange(doctor.id, { isApproved: false })} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors" title="Suspend">
                                                    <Ban size={18} />
                                                </button> */}
                                                <button onClick={() => openDetailsModal(doctor)} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors" title="View Details">
                                                    <Eye size={18} />
                                                </button>
                                                <div className="relative dropdown-container">
                                                    <button onClick={() => toggleDropdown(doctor.id)} className={`p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors ${activeDropdown === doctor.id ? 'bg-accent text-foreground' : ''}`}>
                                                        <MoreVertical size={18} />
                                                    </button>
                                                    {activeDropdown === doctor.id && (
                                                        <div className={`absolute right-0 w-48 bg-popover rounded-xl shadow-soft-lg z-50 border border-border py-1 backdrop-blur-xl
                                                            ${index >= doctors.length - 2 ? 'bottom-full mb-2 origin-bottom-right' : 'mt-2 origin-top-right'}`}>
                                                            <button
                                                                type="button"
                                                                onClick={() => openPayoutModal(doctor)}
                                                                className="w-full text-left px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted flex items-center gap-2 rounded-lg mx-1 transition-colors"
                                                            >
                                                                Process Payout
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => openDoctorPasswordModal(doctor)}
                                                                className="w-full text-left px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted flex items-center gap-2 rounded-lg mx-1 transition-colors"
                                                            >
                                                                Reset password
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {!loading && doctors.length === 0 && (
                                    <tr>
                                        <td colSpan={activeTab === 'pending' ? 7 : 6} className="px-6 py-10 text-center text-sm text-muted-foreground">
                                            {emptyTabMessage[activeTab] ?? 'No doctors found.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeDetailsModal()}>
                <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
                    {selectedDoctor && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Doctor Details</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-20 h-20 rounded-2xl bg-muted overflow-hidden border border-border">
                                        {selectedDoctor.profilePhotoUrl ? (
                                            <img src={resolveImageUrl(selectedDoctor.profilePhotoUrl)} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-2xl text-primary font-bold">
                                                {selectedDoctor.first_name?.[0] || '?'}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-foreground">{selectedDoctor.first_name} {selectedDoctor.last_name}</h3>
                                        <p className="text-muted-foreground">{selectedDoctor.specialty || '—'}</p>
                                        {/* <div className="flex items-center gap-1.5 mt-1">
                                            <Star size={16} className="fill-amber-400 text-amber-400" />
                                            <span className="font-semibold text-foreground">{selectedDoctor.rating || '—'}</span>
                                        </div> */}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-start gap-2 text-muted-foreground">
                                        <Building2 size={18} className="shrink-0 mt-0.5" />
                                        <div>
                                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80 block">
                                                Hospital
                                            </span>
                                            <span className="text-foreground font-medium">
                                                {selectedDoctor.hospital_name || '—'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <MapPin size={18} />
                                        <span>{selectedDoctor.clinicAddress || '—'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <ShieldCheck size={18} />
                                        <span>Experience: {selectedDoctor.experienceYears ?? 0} Years</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <span className="font-semibold text-primary">{APP_CURRENCY_DISPLAY}</span>
                                        <span>Price per Session: {selectedDoctor.consultationFee ?? 0}</span>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2 text-foreground">
                                        <FileText size={18} />
                                        Medical License
                                    </h4>
                                    {selectedDoctor.licenseNo ? (
                                        <p className="text-sm text-muted-foreground mb-2">
                                            License no: <span className="text-foreground font-medium">{selectedDoctor.licenseNo}</span>
                                        </p>
                                    ) : null}
                                    {renderLicensePreview(selectedDoctor)}
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-2 text-foreground">Earnings summary</h4>
                                    <div className="bg-surface p-4 rounded-xl text-sm border border-border space-y-2">
                                        <div className="flex justify-between gap-4">
                                            <span className="text-muted-foreground">Total earnings</span>
                                            <span className="font-medium text-foreground">
                                                {APP_CURRENCY_DISPLAY}{' '}
                                                {formatAmount(selectedDoctor.earningsSummary?.totalEarnings)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between gap-4">
                                            <span className="text-muted-foreground">Pending payouts</span>
                                            <span className="font-medium text-foreground">
                                                {APP_CURRENCY_DISPLAY}{' '}
                                                {formatAmount(selectedDoctor.earningsSummary?.pendingPayoutsTotal)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between gap-4">
                                            <span className="text-muted-foreground">Total paid out</span>
                                            <span className="font-medium text-foreground">
                                                {APP_CURRENCY_DISPLAY}{' '}
                                                {formatAmount(selectedDoctor.earningsSummary?.totalPaidOut)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between gap-4 pt-1 border-t border-border">
                                            <span className="text-muted-foreground">Net (after paid payouts)</span>
                                            <span className="font-semibold text-primary">
                                                {APP_CURRENCY_DISPLAY}{' '}
                                                {formatAmount(selectedDoctor.earningsSummary?.netAfterPaidPayouts)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground pt-1">
                                            {selectedDoctor.earningsSummary?.earningsCount ?? 0} earning record{(selectedDoctor.earningsSummary?.earningsCount ?? 0) === 1 ? '' : 's'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2 text-foreground"><Calendar size={18} /> Availability</h4>
                                    <div className="bg-surface p-4 rounded-xl text-sm border border-border">
                                        {selectedDoctor.availabilityRows?.length > 0 ? (
                                            selectedDoctor.availabilityRows.map((row) => (
                                                <div key={row.key} className="flex justify-between gap-4 py-1.5">
                                                    <span className="font-medium text-foreground shrink-0">{row.day}</span>
                                                    <span className="text-muted-foreground text-right">{row.right}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-muted-foreground italic">No availability set</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        </div>
                    </>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={isPayoutModalOpen} onOpenChange={(open) => !open && closePayoutModal()}>
                <DialogContent className="max-w-md">
                {payoutDoctor && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Process Monthly Payout</DialogTitle>
                        </DialogHeader>
                        <div className="bg-primary/10 p-6 rounded-xl mb-6 text-center border border-primary/20">
                            <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                                Pending Earnings for {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </p>
                            <div className="text-4xl font-bold text-primary">
                                {APP_CURRENCY_DISPLAY}{' '}
                                {(pendingEarnings[payoutDoctor.id] ?? 0).toLocaleString()}
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm py-2 border-b border-border">
                                <span className="text-muted-foreground">Doctor Name:</span>
                                <span className="font-medium text-foreground">Dr. {payoutDoctor.first_name} {payoutDoctor.last_name}</span>
                            </div>
                        </div>
                        <div className="mt-8 pt-6 border-t border-border">
                            <h3 className="text-sm font-bold text-foreground mb-3">Payout History</h3>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                {(payoutHistory[payoutDoctor.id] ?? []).length > 0 ? (
                                    payoutHistory[payoutDoctor.id].map((record) => (
                                        <div key={record.id} className="flex justify-between items-center text-sm p-2 bg-surface rounded-lg">
                                            <span className="text-muted-foreground">{record.date ? new Date(record.date).toLocaleDateString() : '—'}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-foreground">
                                                    {APP_CURRENCY_DISPLAY}{' '}
                                                    {Number(record.amount).toLocaleString()}
                                                </span>
                                                <CheckCircle size={14} className="text-primary" />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-muted-foreground italic text-center py-2">No previous payouts found.</p>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-8">
                            <Button variant="outline" onClick={closePayoutModal}>Cancel</Button>
                            <Button
                                onClick={handleProcessPayout}
                                disabled={!(pendingEarnings[payoutDoctor.id] > 0)}>
                                {pendingEarnings[payoutDoctor.id] > 0 ? 'Process Payout' : 'No Earnings Due'}
                            </Button>
                        </div>
                    </>
                )}
                </DialogContent>
            </Dialog>

            <Dialog open={isReviewsModalOpen} onOpenChange={(open) => !open && closeReviewsModal()}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Patient Reviews</DialogTitle>
                        <p className="text-muted-foreground text-sm mt-1">for Dr. {currentReviewDoctor?.first_name} {currentReviewDoctor?.last_name}</p>
                    </DialogHeader>
                    <div className="text-center py-10 text-muted-foreground bg-muted rounded-lg">
                        No reviews found for this doctor.
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isCreateDoctorOpen} onOpenChange={(open) => !open && closeCreateDoctorModal()}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Create doctor</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateDoctor} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2 space-y-2">
                                <Label htmlFor="d-fullName">Full name *</Label>
                                <Input
                                    id="d-fullName"
                                    value={doctorCreateForm.fullName}
                                    onChange={(e) => setDoctorCreateForm((s) => ({ ...s, fullName: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="d-phone">Phone *</Label>
                                <Input
                                    id="d-phone"
                                    value={doctorCreateForm.phone}
                                    onChange={(e) => setDoctorCreateForm((s) => ({ ...s, phone: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="d-email">Email</Label>
                                <Input
                                    id="d-email"
                                    type="email"
                                    value={doctorCreateForm.email}
                                    onChange={(e) => setDoctorCreateForm((s) => ({ ...s, email: e.target.value }))}
                                />
                            </div>
                            <div className="sm:col-span-2 space-y-2">
                                <Label htmlFor="d-password">Password * (min 6)</Label>
                                <Input
                                    id="d-password"
                                    type="password"
                                    autoComplete="new-password"
                                    value={doctorCreateForm.password}
                                    onChange={(e) => setDoctorCreateForm((s) => ({ ...s, password: e.target.value }))}
                                    required
                                    minLength={6}
                                />
                            </div>
                            <div className="sm:col-span-2 space-y-2">
                                <Label htmlFor="d-bio">Bio</Label>
                                <Textarea
                                    id="d-bio"
                                    rows={3}
                                    value={doctorCreateForm.bio}
                                    onChange={(e) => setDoctorCreateForm((s) => ({ ...s, bio: e.target.value }))}
                                    placeholder="Qualifications, experience summary…"
                                />
                            </div>
                            <div className="sm:col-span-2 space-y-2">
                                <Label htmlFor="d-specialty">Specialization</Label>
                                <Select
                                    value={
                                        doctorCreateForm.specialtyIds[0] != null
                                            ? String(doctorCreateForm.specialtyIds[0])
                                            : '__none__'
                                    }
                                    onValueChange={(v) =>
                                        setDoctorCreateForm((s) => ({
                                            ...s,
                                            specialtyIds: v === '__none__' ? [] : [Number(v)],
                                        }))
                                    }
                                >
                                    <SelectTrigger id="d-specialty">
                                        <SelectValue
                                            placeholder={
                                                specialtiesList.length === 0
                                                    ? 'No specialties — add them under Specialties'
                                                    : 'Select specialization'
                                            }
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">None</SelectItem>
                                        {specialtiesList.map((s) => (
                                            <SelectItem key={s.id} value={String(s.id)}>
                                                {s.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {specialtiesList.length === 0 && (
                                    <p className="text-muted-foreground text-xs">
                                        Load specialties from the Specialties page first, or add new ones there.
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="d-exp">Experience (years)</Label>
                                <Input
                                    id="d-exp"
                                    type="number"
                                    min={0}
                                    value={doctorCreateForm.experienceInYears}
                                    onChange={(e) => setDoctorCreateForm((s) => ({ ...s, experienceInYears: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="d-rate">Per session rate ({APP_CURRENCY_DISPLAY})</Label>
                                <Input
                                    id="d-rate"
                                    type="number"
                                    min={0}
                                    value={doctorCreateForm.perSessionRate}
                                    onChange={(e) => setDoctorCreateForm((s) => ({ ...s, perSessionRate: e.target.value }))}
                                />
                            </div>
                            <div className="sm:col-span-2 space-y-2">
                                <Label htmlFor="d-address">Clinic address</Label>
                                <div className="relative">
                                    <Input
                                        id="d-address"
                                        value={doctorCreateForm.clinicAddress}
                                        onFocus={() => setClinicAddressFocused(true)}
                                        onBlur={() => {
                                            setTimeout(() => setClinicAddressFocused(false), 150);
                                        }}
                                        onChange={(e) => setDoctorCreateForm((s) => ({ ...s, clinicAddress: e.target.value }))}
                                        placeholder={placesReady ? 'Search clinic address...' : 'Enter clinic address'}
                                    />
                                    {clinicAddressFocused && (clinicAddressLoading || clinicAddressSuggestions.length > 0) && (
                                        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-border bg-popover p-1 shadow-soft-lg">
                                            {clinicAddressLoading && (
                                                <p className="px-3 py-2 text-xs text-muted-foreground">Searching address...</p>
                                            )}
                                            {!clinicAddressLoading &&
                                                clinicAddressSuggestions.map((pred) => (
                                                    <button
                                                        key={pred.place_id}
                                                        type="button"
                                                        className="w-full rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onClick={() => selectClinicAddress(pred)}
                                                    >
                                                        {pred.description}
                                                    </button>
                                                ))}
                                            {!clinicAddressLoading &&
                                                clinicAddressSuggestions.length === 0 &&
                                                doctorCreateForm.clinicAddress?.trim() && (
                                                    <p className="px-3 py-2 text-xs text-muted-foreground">
                                                        No clinic/hospital suggestions found.
                                                    </p>
                                                )}
                                        </div>
                                    )}
                                </div>
                                {!GOOGLE_MAPS_API_KEY && (
                                    <p className="text-xs text-muted-foreground">
                                        Add `VITE_GOOGLE_MAPS_API_KEY` in `.env` to enable suggestions.
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="d-clinic">Clinic name</Label>
                                <Input
                                    id="d-clinic"
                                    value={doctorCreateForm.clinicName}
                                    onChange={(e) => setDoctorCreateForm((s) => ({ ...s, clinicName: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="d-photo">Profile photo</Label>
                                <Input
                                    id="d-photo"
                                    type="file"
                                    accept="image/*"
                                    disabled={uploadingDoctorAsset === 'profilePhotoUrl'}
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        e.target.value = '';
                                        if (file) uploadDoctorCreateImage(file, 'profilePhotoUrl');
                                    }}
                                />
                                {uploadingDoctorAsset === 'profilePhotoUrl' && (
                                    <p className="text-xs text-muted-foreground">Uploading…</p>
                                )}
                                {doctorCreateForm.profilePhotoUrl && uploadingDoctorAsset !== 'profilePhotoUrl' && (
                                    <div className="mt-2">
                                        <div className="h-24 w-24 rounded-lg overflow-hidden bg-muted border border-border">
                                            <img
                                                src={resolveImageUrl(doctorCreateForm.profilePhotoUrl)}
                                                alt="Profile preview"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="d-license">License document</Label>
                                <Input
                                    id="d-license"
                                    type="file"
                                    accept="image/*"
                                    disabled={uploadingDoctorAsset === 'licenseDocumentUrl'}
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        e.target.value = '';
                                        if (file) uploadDoctorCreateImage(file, 'licenseDocumentUrl');
                                    }}
                                />
                                {uploadingDoctorAsset === 'licenseDocumentUrl' && (
                                    <p className="text-xs text-muted-foreground">Uploading…</p>
                                )}
                                {doctorCreateForm.licenseDocumentUrl && uploadingDoctorAsset !== 'licenseDocumentUrl' && (
                                    <div className="mt-2">
                                        <div className="h-24 w-24 rounded-lg overflow-hidden bg-muted border border-border">
                                            <img
                                                src={resolveImageUrl(doctorCreateForm.licenseDocumentUrl)}
                                                alt="License preview"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Availability (day 0 = Sunday … 6 = Saturday)</Label>
                                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addAvailabilityRow}>
                                    <Plus className="w-3.5 h-3.5" />
                                    Add slot
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {availabilityRows.map((row) => (
                                    <div key={row.key} className="flex flex-wrap items-end gap-2 p-3 rounded-xl border border-border bg-surface/50">
                                        <div className="flex-1 min-w-[140px] space-y-1">
                                            <Label className="text-xs">Day</Label>
                                            <Select
                                                value={String(row.dayOfWeek)}
                                                onValueChange={(v) => updateAvailabilityRow(row.key, { dayOfWeek: Number(v) })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {DAY_OPTIONS_CREATE.map((d) => (
                                                        <SelectItem key={d.dayOfWeek} value={String(d.dayOfWeek)}>
                                                            {d.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="min-w-[8.5rem] flex-1 space-y-1">
                                            <Label className="text-xs">Start</Label>
                                            <Select
                                                value={nearestTimeSlotValue(row.startTime)}
                                                onValueChange={(v) =>
                                                    updateAvailabilityRow(row.key, { startTime: v })
                                                }
                                            >
                                                <SelectTrigger className="h-10">
                                                    <SelectValue placeholder="Start" />
                                                </SelectTrigger>
                                                <SelectContent className="max-h-60">
                                                    {TIME_SELECT_OPTIONS.map((t) => (
                                                        <SelectItem key={t.value} value={t.value}>
                                                            {t.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="min-w-[8.5rem] flex-1 space-y-1">
                                            <Label className="text-xs">End</Label>
                                            <Select
                                                value={nearestTimeSlotValue(row.endTime)}
                                                onValueChange={(v) =>
                                                    updateAvailabilityRow(row.key, { endTime: v })
                                                }
                                            >
                                                <SelectTrigger className="h-10">
                                                    <SelectValue placeholder="End" />
                                                </SelectTrigger>
                                                <SelectContent className="max-h-60">
                                                    {TIME_SELECT_OPTIONS.map((t) => (
                                                        <SelectItem key={`e-${t.value}`} value={t.value}>
                                                            {t.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive shrink-0"
                                            onClick={() => removeAvailabilityRow(row.key)}
                                            title="Remove row"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                                <Label htmlFor="d-verified">Verified</Label>
                                <Switch
                                    id="d-verified"
                                    checked={doctorCreateForm.isVerified}
                                    onCheckedChange={(checked) => setDoctorCreateForm((s) => ({ ...s, isVerified: checked }))}
                                />
                            </div>
                            <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                                <Label htmlFor="d-approved">Approved</Label>
                                <Switch
                                    id="d-approved"
                                    checked={doctorCreateForm.isApproved}
                                    onCheckedChange={(checked) => setDoctorCreateForm((s) => ({ ...s, isApproved: checked }))}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={closeCreateDoctorModal}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createDoctorSubmitting}>
                                {createDoctorSubmitting ? 'Creating…' : 'Create doctor'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={!!passwordDoctor} onOpenChange={(open) => !open && closeDoctorPasswordModal()}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Reset password</DialogTitle>
                        <p className="text-sm text-muted-foreground pt-1">
                            {passwordDoctor
                                ? `${passwordDoctor.first_name} ${passwordDoctor.last_name}`.trim() || passwordDoctor.fullName
                                : ''}
                        </p>
                    </DialogHeader>
                    <form onSubmit={handleResetDoctorPassword} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="d-new-pw">New password *</Label>
                            <Input
                                id="d-new-pw"
                                type="password"
                                autoComplete="new-password"
                                value={doctorNewPassword}
                                onChange={(e) => setDoctorNewPassword(e.target.value)}
                                minLength={6}
                                required
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={closeDoctorPasswordModal}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={doctorPasswordSubmitting}>
                                {doctorPasswordSubmitting ? 'Saving…' : 'Update password'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
