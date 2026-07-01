import React, { useState, useEffect } from 'react';
import { Search, Plus, Eye, FileText, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import api, { getPayload } from '@/lib/api';
import { toast } from '@/lib/toast';
import { resolveImageUrl } from '@/lib/images';

const CATEGORIES = ["General", "Healthy Lifestyle", "Mental Health", "Prevention", "First Aid", "Pediatrics"];

function ArticleForm({
    formData,
    setFormData,
    isUploadingCover,
    uploadCoverImage,
    onSubmit,
    submitLabel,
    onCancel,
}) {
    const previewUrl = formData.coverImageUrl ? resolveImageUrl(formData.coverImageUrl) : '';

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <p className="text-xs text-muted-foreground">
                Enter content in English only. The mobile app translates labels for French users automatically.
            </p>
            <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                    id="title"
                    required
                    value={formData.title}
                    onChange={(e) =>
                        setFormData(prev => ({ ...prev, title: e.target.value }))
                    }
                />
            </div>
            <div className="space-y-2">
                <Label>Category</Label>
                <Select
                    value={formData.category}
                    onValueChange={(v) =>
                        setFormData(prev => ({ ...prev, category: v }))
                    }
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {CATEGORIES.map(c => (
                            <SelectItem key={c} value={c}>
                                {c}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="coverImageFile">Cover Image</Label>
                <Input
                    id="coverImageFile"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadCoverImage(file);
                    }}
                />
                {isUploadingCover && (
                    <p className="text-xs text-muted-foreground mt-1">
                        Uploading image...
                    </p>
                )}
                {previewUrl && !isUploadingCover && (
                    <div className="mt-2">
                        <span className="text-xs text-muted-foreground">Preview</span>
                        <div className="mt-1 h-32 w-full rounded-lg overflow-hidden bg-muted border border-border">
                            <img
                                src={previewUrl}
                                alt="Cover preview"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <p className="mt-1 text-[10px] text-muted-foreground break-all">
                            Stored as: {formData.coverImageUrl}
                        </p>
                    </div>
                )}
            </div>
            <div className="space-y-2">
                <Label htmlFor="contentHtml">Content (HTML)</Label>
                <Textarea
                    id="contentHtml"
                    rows={6}
                    value={formData.contentHtml}
                    onChange={(e) =>
                        setFormData(prev => ({ ...prev, contentHtml: e.target.value }))
                    }
                />
            </div>
            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="isPublished"
                    checked={formData.isPublished}
                    onChange={(e) =>
                        setFormData(prev => ({ ...prev, isPublished: e.target.checked }))
                    }
                />
                <Label htmlFor="isPublished" className="font-normal">
                    Published
                </Label>
            </div>
            <div className="flex gap-3 pt-4">
                <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={onCancel}
                >
                    Cancel
                </Button>
                <Button type="submit" className="w-full">
                    {submitLabel}
                </Button>
            </div>
        </form>
    );
}

export default function HealthArticlesTab() {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        category: 'General',
        coverImageUrl: '',
        contentHtml: '',
        isPublished: false
    });
    const [isUploadingCover, setIsUploadingCover] = useState(false);
    const [statusUpdatingId, setStatusUpdatingId] = useState(null);

    const hasValidCoverImage = (url) => {
        if (!url) return false;
        return !url.includes('localhost');
    };

    const fetchArticles = async () => {
        try {
            setLoading(true);
            const res = await api.get("/admin/health-articles", { params: { page, limit: 20 } });
            const data = getPayload(res) ?? res.data;
            const list = data?.items ?? (Array.isArray(data) ? data : []) ?? [];
            setArticles(list.map(art => ({
                id: art.id ?? art._id,
                title: art.title,
                category: art.category ?? 'General',
                coverImageUrl: art.coverImageUrl ?? art.cover_image_url ?? art.image_url,
                contentHtml: art.contentHtml ?? art.content_html ?? art.content ?? '',
                isPublished: art.isPublished ?? art.is_published ?? false,
                createdAt: art.createdAt ?? art.created_at,
            })));
        } catch (error) {
            console.error("Failed to fetch articles", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchArticles();
    }, [page]);

    const resetForm = () => {
        setFormData({
            title: '',
            category: 'General',
            coverImageUrl: '',
            contentHtml: '',
            isPublished: false
        });
    };

    const filteredArticles = articles.filter(article =>
        article.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAddClick = () => {
        resetForm();
        setSelectedArticle(null);
        setIsAddModalOpen(true);
    };

    const handleEditClick = (article) => {
        setSelectedArticle(article);
        setFormData({
            title: article.title,
            category: article.category ?? 'General',
            coverImageUrl: article.coverImageUrl ?? '',
            contentHtml: article.contentHtml ?? '',
            isPublished: article.isPublished ?? false
        });
        setIsEditModalOpen(true);
    };

    const handleViewClick = (article) => {
        setSelectedArticle(article);
        setIsViewModalOpen(true);
    };

    const handleDeleteClick = (article) => {
        setSelectedArticle(article);
        setIsDeleteModalOpen(true);
    };

    const uploadCoverImage = async (file) => {
        if (!file) return;
        try {
            setIsUploadingCover(true);
            const fd = new FormData();
            fd.append('file', file);
            const res = await api.post('/upload/image', fd);
            const payload = getPayload(res) ?? res.data ?? {};
            const url = payload.url ?? payload.data?.url;
            if (url) {
                setFormData(prev => ({ ...prev, coverImageUrl: url }));
            } else {
                console.error('Upload image: URL missing in response', payload);
                toast.error('Image uploaded but URL missing in response.');
            }
        } catch (error) {
            console.error('Failed to upload cover image', error);
            toast.error('Error uploading image. Please try again.');
        } finally {
            setIsUploadingCover(false);
        }
    };

    const handleSaveAdd = async (e) => {
        e.preventDefault();
        try {
            const normalizedCoverImageUrl = formData.coverImageUrl
                ? resolveImageUrl(formData.coverImageUrl)
                : undefined;
            const body = {
                title: formData.title,
                category: formData.category,
                coverImageUrl: normalizedCoverImageUrl,
                contentHtml: formData.contentHtml,
                isPublished: formData.isPublished,
            };

            // if (formData.isPublished) {
            //     body.publishedAt = new Date().toISOString();
            // }

            await api.post("/admin/health-articles", body);
            fetchArticles();
            setIsAddModalOpen(false);
            resetForm();
        } catch (error) {
            console.error("Failed to create article", error);
            toast.error('Error creating article');
        }
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        if (!selectedArticle) return;
        try {
            const normalizedCoverImageUrl = formData.coverImageUrl
                ? resolveImageUrl(formData.coverImageUrl)
                : undefined;
            const body = {
                title: formData.title,
                category: formData.category,
                coverImageUrl: normalizedCoverImageUrl,
                contentHtml: formData.contentHtml,
                isPublished: formData.isPublished,
            };

            // Only set publishedAt when transitioning to published
            if (formData.isPublished && !selectedArticle.isPublished) {
                body.publishedAt = new Date().toISOString();
            }

            await api.patch(`/admin/health-articles/${selectedArticle.id}`, body);
            fetchArticles();
            setIsEditModalOpen(false);
        } catch (error) {
            console.error("Failed to update article", error);
            toast.error('Error updating article');
        }
    };

    const confirmDelete = async () => {
        if (!selectedArticle) return;
        try {
            await api.delete(`/admin/health-articles/${selectedArticle.id}`);
            fetchArticles();
            setIsDeleteModalOpen(false);
        } catch (error) {
            console.error("Failed to delete article", error);
            toast.error('Error deleting article');
        }
    };

    const updatePublishedStatus = async (article, isPublished) => {
        try {
            setStatusUpdatingId(article.id);
            await api.patch(`/admin/health-articles/${article.id}/status`, { isPublished });
            setArticles(prev =>
                prev.map(a =>
                    a.id === article.id ? { ...a, isPublished } : a
                )
            );
        } catch (error) {
            console.error("Failed to update article status", error);
            toast.error('Error updating article status');
        } finally {
            setStatusUpdatingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end items-center">
                <Button onClick={handleAddClick} className="gap-2">
                    <Plus size={20} /> Add Article
                </Button>
            </div>

            <Card className="hover:shadow-card">
                <CardContent className="p-4">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
                        <Input
                            type="text"
                            placeholder="Search by title..."
                            className="pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="bg-card rounded-xl hover:shadow-card border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-surface">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">Article</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">Category</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">Date</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-muted-foreground uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
                            ) : filteredArticles.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No articles found</td></tr>
                            ) : (
                                filteredArticles.map((article) => (
                                    <tr key={article.id} className="hover:bg-accent/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                                                    <img
                                                        src={
                                                            hasValidCoverImage(article.coverImageUrl)
                                                                ? resolveImageUrl(article.coverImageUrl)
                                                                : '/no-image.png'
                                                        }
                                                        alt=""
                                                        className="h-full w-full object-cover"
                                                    />
                                                </div>
                                                <div className="max-w-[200px] truncate font-medium text-foreground" title={article.title}>
                                                    {article.title}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-primary/20 text-primary">
                                                {article.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-lg ${article.isPublished ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                                    {article.isPublished ? 'Published' : 'Draft'}
                                                </span>
                                                <Switch
                                                    checked={!!article.isPublished}
                                                    disabled={statusUpdatingId === article.id}
                                                    onCheckedChange={(checked) => updatePublishedStatus(article, checked)}
                                                    aria-label={article.isPublished ? 'Unpublish article' : 'Publish article'}
                                                />
                                                {statusUpdatingId === article.id && (
                                                    <span className="text-xs text-muted-foreground">Updating...</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                            {article.createdAt ? new Date(article.createdAt).toLocaleDateString() : '—'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => handleViewClick(article)} className="text-muted-foreground hover:text-primary transition-colors p-2 rounded-lg hover:bg-accent" title="View">
                                                    <Eye size={18} />
                                                </button>
                                                <button onClick={() => handleEditClick(article)} className="text-muted-foreground hover:text-primary transition-colors p-2 rounded-lg hover:bg-accent" title="Edit">
                                                    <FileText size={18} />
                                                </button>
                                                <button onClick={() => handleDeleteClick(article)} className="text-muted-foreground hover:text-destructive transition-colors p-2 rounded-lg hover:bg-destructive/10" title="Delete">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Dialog open={isAddModalOpen} onOpenChange={(open) => !open && setIsAddModalOpen(false)}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Add New Article</DialogTitle>
                    </DialogHeader>
                    <ArticleForm
                        formData={formData}
                        setFormData={setFormData}
                        isUploadingCover={isUploadingCover}
                        uploadCoverImage={uploadCoverImage}
                        onSubmit={handleSaveAdd}
                        submitLabel="Create Article"
                        onCancel={() => setIsAddModalOpen(false)}
                    />
                </DialogContent>
            </Dialog>
            <Dialog open={isEditModalOpen} onOpenChange={(open) => !open && setIsEditModalOpen(false)}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Article</DialogTitle>
                    </DialogHeader>
                    <ArticleForm
                        formData={formData}
                        setFormData={setFormData}
                        isUploadingCover={isUploadingCover}
                        uploadCoverImage={uploadCoverImage}
                        onSubmit={handleSaveEdit}
                        submitLabel="Save Changes"
                        onCancel={() => setIsEditModalOpen(false)}
                    />
                </DialogContent>
            </Dialog>
            <Dialog open={isViewModalOpen} onOpenChange={(open) => !open && setIsViewModalOpen(false)}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Article Details</DialogTitle>
                    </DialogHeader>
                {selectedArticle && (
                    <div className="space-y-6">
                        <div className="h-48 w-full rounded-xl overflow-hidden bg-muted">
                            <img
                                src={
                                    hasValidCoverImage(selectedArticle.coverImageUrl)
                                        ? resolveImageUrl(selectedArticle.coverImageUrl)
                                        : '/no-image.png'
                                }
                                alt=""
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-foreground mb-2">{selectedArticle.title}</h3>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-lg mb-4 ${selectedArticle.isPublished ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                {selectedArticle.isPublished ? 'Published' : 'Draft'}
                            </span>
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-lg ml-2 bg-primary/20 text-primary">{selectedArticle.category}</span>
                            <div className="mt-4 prose prose-sm prose-invert max-w-none prose-p:text-muted-foreground prose-headings:text-foreground prose-strong:text-foreground prose-li:text-muted-foreground" dangerouslySetInnerHTML={{ __html: selectedArticle.contentHtml || 'No content.' }} />
                        </div>
                        <div className="flex justify-end pt-4 border-t border-border">
                            <Button onClick={() => setIsViewModalOpen(false)} variant="outline">Close</Button>
                        </div>
                    </div>
                )}
                </DialogContent>
            </Dialog>
            <Dialog open={isDeleteModalOpen} onOpenChange={(open) => !open && setIsDeleteModalOpen(false)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Article</DialogTitle>
                    </DialogHeader>
                <div className="space-y-4">
                    <p className="text-muted-foreground">
                        Are you sure you want to delete <span className="font-bold text-foreground">"{selectedArticle?.title}"</span>?
                        This action cannot be undone.
                    </p>
                    <div className="flex gap-3 justify-end pt-4">
                        <Button onClick={() => setIsDeleteModalOpen(false)} variant="outline">Cancel</Button>
                        <Button onClick={confirmDelete} variant="destructive">Delete</Button>
                    </div>
                </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
