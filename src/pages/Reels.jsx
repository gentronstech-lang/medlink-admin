import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Switch } from '@/components/ui/switch.jsx';
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
import {
    Clapperboard,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    Loader2,
    Pencil,
    Plus,
    RefreshCw,
    Trash2,
} from 'lucide-react';
import api, { getPayload } from '@/lib/api';
import { getAdminErrorMessage } from '@/lib/adminErrors';
import { resolveImageUrl } from '@/lib/images';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
/** Must match medlink-be REEL_MAX_FILE_SIZE_MB (default 200). */
const REEL_MAX_VIDEO_BYTES = 200 * 1024 * 1024;

function formatFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
}

/** YouTube watch / shorts / youtu.be — video id for embed preview */
function getYoutubeVideoId(raw) {
    const url = String(raw || '').trim();
    if (!url) return null;
    try {
        const withScheme = /^https?:\/\//i.test(url) ? url : `https://${url}`;
        const u = new URL(withScheme);
        const host = u.hostname.replace(/^www\./i, '');
        if (host === 'youtu.be') {
            const id = u.pathname.replace(/^\//, '').split('/')[0];
            return /^[\w-]{6,}$/.test(id) ? id : null;
        }
        if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
            const v = u.searchParams.get('v');
            if (v && /^[\w-]{6,}$/.test(v)) return v;
            const shorts = u.pathname.match(/\/shorts\/([\w-]+)/);
            if (shorts?.[1] && /^[\w-]{6,}$/.test(shorts[1])) return shorts[1];
            const embed = u.pathname.match(/\/embed\/([\w-]+)/);
            if (embed?.[1]) return embed[1];
        }
    } catch {
        /* invalid URL */
    }
    return null;
}

/** Native video element only for direct files / relative URLs — not YouTube pages */
function canHtml5VideoPreview(url) {
    const s = String(url || '').trim();
    if (!s) return false;
    if (getYoutubeVideoId(s)) return false;
    const lower = s.toLowerCase();
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) return false;
    if (lower.startsWith('http') && /\.(mp4|webm|ogg|m4v|mov)(\?|#|$)/i.test(lower)) return true;
    if (!/^https?:\/\//i.test(lower)) return true;
    return /\.(mp4|webm|ogg|m4v|mov)(\?|#|$)/i.test(lower);
}

function fmtDate(dt) {
    if (!dt) return '—';
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString();
}

function normalizeListPayload(res) {
    const data = getPayload(res) ?? res.data;
    const items = Array.isArray(data?.items) ? data.items : [];
    const total = Number(data?.total);
    const page = data?.page != null ? Number(data.page) : 1;
    let limit = data?.limit != null ? Number(data.limit) : DEFAULT_LIMIT;
    if (!Number.isFinite(limit) || limit < 1) limit = DEFAULT_LIMIT;
    limit = Math.min(limit, MAX_LIMIT);
    return {
        items,
        total: Number.isFinite(total) ? total : items.length,
        page: Number.isFinite(page) ? page : 1,
        limit,
    };
}

const emptyForm = () => ({
    title: '',
    videoUrl: '',
    description: '',
    thumbnailUrl: '',
    category: '',
    isPublished: false,
    sortOrder: '',
});

function buildCreateBody(form) {
    const body = {
        title: form.title.trim(),
        videoUrl: resolveImageUrl(form.videoUrl.trim()),
    };
    if (form.description.trim()) body.description = form.description.trim();
    if (form.thumbnailUrl.trim()) body.thumbnailUrl = resolveImageUrl(form.thumbnailUrl.trim());
    if (form.category.trim()) body.category = form.category.trim();
    body.isPublished = !!form.isPublished;
    const so = String(form.sortOrder).trim();
    if (so !== '' && !Number.isNaN(Number(so))) body.sortOrder = Number(so);
    return body;
}

function buildPatchBody(form) {
    const body = {
        title: form.title.trim(),
        videoUrl: resolveImageUrl(form.videoUrl.trim()),
        description: form.description.trim() ? form.description.trim() : null,
        thumbnailUrl: form.thumbnailUrl.trim()
            ? resolveImageUrl(form.thumbnailUrl.trim())
            : null,
        category: form.category.trim() ? form.category.trim() : null,
        isPublished: !!form.isPublished,
    };
    const so = String(form.sortOrder).trim();
    if (so !== '' && !Number.isNaN(Number(so))) {
        body.sortOrder = Number(so);
    }
    return body;
}

function fmtCount(v) {
    if (v == null || v === '') return '—';
    const n = Number(v);
    return Number.isFinite(n) ? n.toLocaleString() : String(v);
}

function reelToForm(reel) {
    if (!reel) return emptyForm();
    return {
        title: reel.title ?? '',
        videoUrl: reel.videoUrl ?? reel.video_url ?? '',
        description: reel.description ?? '',
        thumbnailUrl: reel.thumbnailUrl ?? reel.thumbnail_url ?? '',
        category: reel.category ?? '',
        isPublished: !!(reel.isPublished ?? reel.is_published),
        sortOrder:
            reel.sortOrder != null && reel.sortOrder !== ''
                ? String(reel.sortOrder)
                : '',
    };
}

export default function Reels() {
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(DEFAULT_LIMIT);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [loadingOne, setLoadingOne] = useState(false);
    const [uploadingVideo, setUploadingVideo] = useState(false);
    const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

    const requestLimit = Math.min(limit, MAX_LIMIT);
    const totalPages = Math.max(1, Math.ceil(total / requestLimit) || 1);

    const fetchList = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/admin/reels', {
                params: { page, limit: requestLimit },
            });
            const { items: list, total: t } = normalizeListPayload(res);
            setItems(list);
            setTotal(t);
        } catch (e) {
            setError(getAdminErrorMessage(e));
            setItems([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [page, requestLimit]);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    const openCreate = () => {
        setModalMode('create');
        setEditingId(null);
        setForm(emptyForm());
        setModalOpen(true);
    };

    const openEdit = async (row) => {
        setModalMode('edit');
        setEditingId(row.id);
        setForm(reelToForm(row));
        setModalOpen(true);
        setLoadingOne(true);
        try {
            const res = await api.get(`/admin/reels/${row.id}`);
            const one = getPayload(res) ?? res.data;
            if (one && typeof one === 'object' && one.id != null) {
                setForm(reelToForm(one));
            }
        } catch (e) {
            toast.error(getAdminErrorMessage(e));
        } finally {
            setLoadingOne(false);
        }
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingId(null);
        setForm(emptyForm());
        setUploadingVideo(false);
        setUploadingThumbnail(false);
    };

    const uploadReelVideo = async (file) => {
        if (!file) return;

        const allowedExt = /\.(mp4|mov|webm|m4v)$/i;
        if (!allowedExt.test(file.name || '')) {
            toast.error('Only mp4, mov, webm, or m4v videos are supported.');
            return;
        }
        if (file.size > REEL_MAX_VIDEO_BYTES) {
            toast.error(
                `Video is ${formatFileSize(file.size)}. Maximum allowed is ${formatFileSize(REEL_MAX_VIDEO_BYTES)}.`
            );
            return;
        }

        try {
            setUploadingVideo(true);

            // Small JSON request only — video goes direct to S3 (bypasses nginx ~1MB API limit).
            const presignRes = await api.post('/common/reels/upload-url', {
                fileName: file.name,
                contentType: file.type || 'video/mp4',
                fileSize: file.size,
            });
            const presign = getPayload(presignRes) ?? presignRes.data ?? {};
            const uploadUrl = presign.uploadUrl;
            const publicUrl = presign.url;
            if (!uploadUrl || !publicUrl) {
                toast.error('Upload could not start (missing presigned URL).');
                return;
            }

            const putRes = await fetch(uploadUrl, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': file.type || 'video/mp4',
                },
            });
            if (!putRes.ok) {
                throw new Error(`S3 upload failed (${putRes.status})`);
            }

            setForm((f) => ({ ...f, videoUrl: String(publicUrl) }));
            toast.success('Video uploaded');
        } catch (err) {
            const msg = getAdminErrorMessage(err);
            if (msg === 'Network Error' || err?.message === 'Failed to fetch') {
                toast.error(
                    'Upload blocked by server or S3 CORS. Deploy latest backend and set S3 bucket CORS for admin domain, or raise nginx client_max_body_size on API server.'
                );
            } else {
                toast.error(msg);
            }
        } finally {
            setUploadingVideo(false);
        }
    };

    const uploadReelThumbnail = async (file) => {
        if (!file) return;
        try {
            setUploadingThumbnail(true);
            const fd = new FormData();
            fd.append('file', file);
            const res = await api.post('/upload/image', fd);
            const payload = getPayload(res) ?? res.data ?? {};
            const url = payload.url ?? payload.data?.url;
            if (!url) {
                toast.error('Image uploaded but thumbnail URL missing in response.');
                return;
            }
            setForm((f) => ({ ...f, thumbnailUrl: String(url) }));
            toast.success('Thumbnail uploaded');
        } catch (err) {
            toast.error(getAdminErrorMessage(err));
        } finally {
            setUploadingThumbnail(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim() || !form.videoUrl.trim()) {
            toast.error('Add a title and a video: paste a link or upload a file.');
            return;
        }
        setSaving(true);
        try {
            if (modalMode === 'create') {
                await api.post('/admin/reels', buildCreateBody(form));
                toast.success('Reel created');
            } else {
                await api.patch(`/admin/reels/${editingId}`, buildPatchBody(form));
                toast.success('Reel updated');
            }
            closeModal();
            await fetchList();
        } catch (err) {
            toast.error(getAdminErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this reel?')) return;
        try {
            await api.delete(`/admin/reels/${id}`);
            toast.success('Reel deleted');
            await fetchList();
        } catch (err) {
            toast.error(getAdminErrorMessage(err));
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
                        <Clapperboard className="h-8 w-8 text-primary shrink-0" />
                        Reels
                    </h1>
                    <p className="text-brand-gold mt-1 font-medium">
                        Short videos — list uses server ordering. List API only supports{' '}
                        <code className="text-xs text-primary/90">page</code> and{' '}
                        <code className="text-xs text-primary/90">limit</code> (max 100).
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={fetchList} disabled={loading}>
                        <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
                        Refresh
                    </Button>
                    <Button type="button" onClick={openCreate}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add reel
                    </Button>
                </div>
            </div>

            <Card className="border-border overflow-hidden hover:shadow-card">
                <CardHeader className="border-b border-border py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="text-lg shrink-0 text-[#004d4d]">All reels</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                        <span className="whitespace-nowrap">Per page</span>
                        <Select
                            value={String(limit)}
                            onValueChange={(v) => {
                                setLimit(Number(v));
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-[100px] h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {[10, 20, 50, 100].map((n) => (
                                    <SelectItem key={n} value={String(n)}>
                                        {n}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {error && (
                        <div className="p-4 text-sm text-destructive bg-destructive/10 border-b border-destructive/20">
                            {error}
                        </div>
                    )}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm font-medium">Loading reels…</p>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="py-16 text-center px-4">
                            <Clapperboard className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
                            <p className="text-muted-foreground font-medium">
                                {total === 0
                                    ? 'No reels yet. Create one to get started.'
                                    : 'No reels on this page.'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                                        <th className="px-4 py-3 font-semibold w-20">Thumb</th>
                                        <th className="px-4 py-3 font-semibold">Title</th>
                                        <th className="px-4 py-3 font-semibold">Category</th>
                                        <th className="px-4 py-3 font-semibold">Order</th>
                                        <th className="px-4 py-3 font-semibold text-right tabular-nums">Views</th>
                                        <th className="px-4 py-3 font-semibold text-right tabular-nums">Likes</th>
                                        <th className="px-4 py-3 font-semibold">Published</th>
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
                                            <td className="px-4 py-2 align-middle">
                                                <div className="h-14 w-20 rounded-lg bg-muted overflow-hidden border border-border shrink-0">
                                                    {row.thumbnailUrl || row.thumbnail_url ? (
                                                        <img
                                                            src={row.thumbnailUrl ?? row.thumbnail_url}
                                                            alt=""
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                                                            <Clapperboard className="h-6 w-6 opacity-40" />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 align-top max-w-[220px]">
                                                <p className="font-semibold text-foreground line-clamp-2">
                                                    {row.title ?? '—'}
                                                </p>
                                                <a
                                                    href={row.videoUrl ?? row.video_url ?? '#'}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                                                >
                                                    Video <ExternalLink className="h-3 w-3" />
                                                </a>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground align-top">
                                                {row.category ?? '—'}
                                            </td>
                                            <td className="px-4 py-3 tabular-nums align-top">
                                                {row.sortOrder ?? row.sort_order ?? '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right tabular-nums text-muted-foreground align-top">
                                                {fmtCount(row.viewCount ?? row.view_count)}
                                            </td>
                                            <td className="px-4 py-3 text-right tabular-nums text-muted-foreground align-top">
                                                {fmtCount(row.likeCount ?? row.like_count)}
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <span
                                                    className={cn(
                                                        'inline-flex px-2 py-0.5 rounded-md text-xs font-semibold',
                                                        row.isPublished ?? row.is_published
                                                            ? 'bg-primary/15 text-primary'
                                                            : 'bg-muted text-muted-foreground'
                                                    )}
                                                >
                                                    {row.isPublished ?? row.is_published ? 'Yes' : 'No'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap align-top">
                                                {fmtDate(row.createdAt ?? row.created_at)}
                                            </td>
                                            <td className="px-4 py-3 text-right align-top">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-9 w-9"
                                                        onClick={() => openEdit(row)}
                                                        aria-label="Edit"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-9 w-9 text-destructive hover:text-destructive"
                                                        onClick={() => handleDelete(row.id)}
                                                        aria-label="Delete"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
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
                                Page {page} of {totalPages} · {total} total
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={page <= 1}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                    Previous
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage((p) => p + 1)}
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={modalOpen} onOpenChange={(o) => !o && closeModal()}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {modalMode === 'create' ? 'Create reel' : 'Edit reel'}
                        </DialogTitle>
                    </DialogHeader>
                    {loadingOne ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="reel-title">Title</Label>
                                <Input
                                    id="reel-title"
                                    value={form.title}
                                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                                    placeholder="Reel title"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reel-video-url">Video link</Label>
                                <Input
                                    id="reel-video-url"
                                    type="text"
                                    inputMode="url"
                                    autoComplete="off"
                                    value={form.videoUrl}
                                    onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))}
                                    placeholder="https://www.youtube.com/shorts/… or https://…/video.mp4"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Paste any public video URL (YouTube, Shorts, direct MP4, etc.),{' '}
                                    <span className="font-medium text-foreground/80">or</span> upload a file
                                    below — you only need one. Upload replaces this field with your file’s URL.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reel-video-file">Upload video file</Label>
                                <Input
                                    id="reel-video-file"
                                    type="file"
                                    accept="video/*"
                                    disabled={uploadingVideo}
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        e.target.value = '';
                                        if (file) uploadReelVideo(file);
                                    }}
                                />
                                <p className="text-xs text-muted-foreground">
                                    MP4, MOV, WEBM, or M4V up to{' '}
                                    {formatFileSize(REEL_MAX_VIDEO_BYTES)}. Uploads to{' '}
                                    <code className="text-[11px]">/common/reels/upload</code> — or paste a
                                    video link instead.
                                </p>
                                {uploadingVideo && (
                                    <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        Uploading video...
                                    </p>
                                )}
                                {!uploadingVideo && form.videoUrl.trim() && (() => {
                                    const trimmed = form.videoUrl.trim();
                                    const ytId = getYoutubeVideoId(trimmed);
                                    return (
                                        <div className="rounded-xl border border-border bg-surface/40 p-2 space-y-2">
                                            {ytId ? (
                                                <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
                                                    <iframe
                                                        title="Video preview"
                                                        src={`https://www.youtube.com/embed/${ytId}`}
                                                        className="h-full w-full min-h-[200px]"
                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                                        allowFullScreen
                                                    />
                                                </div>
                                            ) : canHtml5VideoPreview(trimmed) ? (
                                                <video
                                                    src={resolveImageUrl(trimmed)}
                                                    controls
                                                    preload="metadata"
                                                    className="w-full max-h-56 rounded-lg bg-black/60"
                                                />
                                            ) : (
                                                <p className="text-xs text-muted-foreground px-1 py-2">
                                                    Preview isn’t available in the browser for this URL; it will
                                                    still be saved.{' '}
                                                    <a
                                                        href={trimmed}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary underline font-medium"
                                                    >
                                                        Open video
                                                    </a>
                                                </p>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reel-thumb-file">Upload thumbnail image</Label>
                                <Input
                                    id="reel-thumb-file"
                                    type="file"
                                    accept="image/*"
                                    disabled={uploadingThumbnail}
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        e.target.value = '';
                                        if (file) uploadReelThumbnail(file);
                                    }}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Select image from local system. File uploads to <code>/upload/image</code> and URL is auto-filled above.
                                </p>
                                {uploadingThumbnail && (
                                    <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        Uploading thumbnail...
                                    </p>
                                )}
                                {!uploadingThumbnail && form.thumbnailUrl && (
                                    <div className="rounded-xl border border-border bg-surface/40 p-2">
                                        <img
                                            src={resolveImageUrl(form.thumbnailUrl)}
                                            alt="Thumbnail preview"
                                            className="w-full max-h-56 rounded-lg object-cover"
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reel-desc">Description</Label>
                                <Textarea
                                    id="reel-desc"
                                    rows={3}
                                    value={form.description}
                                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                    placeholder="Optional"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="reel-cat">Category</Label>
                                    <Input
                                        id="reel-cat"
                                        value={form.category}
                                        onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                                        placeholder="Optional"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="reel-order">Sort order</Label>
                                    <Input
                                        id="reel-order"
                                        type="number"
                                        value={form.sortOrder}
                                        onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                                <div>
                                    <Label htmlFor="reel-published" className="text-base">
                                        Published
                                    </Label>
                                    <p className="text-xs text-muted-foreground">Visible to users when on</p>
                                </div>
                                <Switch
                                    id="reel-published"
                                    checked={form.isPublished}
                                    onCheckedChange={(c) => setForm((f) => ({ ...f, isPublished: c }))}
                                />
                            </div>
                            <DialogFooter className="gap-2 sm:gap-0 pt-2">
                                <Button type="button" variant="outline" onClick={closeModal} disabled={saving}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={saving || uploadingVideo || uploadingThumbnail} className="gap-2">
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                    {modalMode === 'create' ? 'Create' : 'Save'}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
