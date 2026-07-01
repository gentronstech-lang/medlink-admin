import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Trash2, Edit2, Bandage } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea.jsx';
import api, { getPayload } from '@/lib/api';
import { toast } from '@/lib/toast';
import { getAdminErrorMessage } from '@/lib/adminErrors';

const EMPTY_FORM = {
    title: '',
    content: '',
    category: '',
};

export default function FirstAidContentTab() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [saving, setSaving] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [selectedItem, setSelectedItem] = useState(null);
    const [formData, setFormData] = useState(EMPTY_FORM);

    const fetchItems = async () => {
        try {
            setLoading(true);
            const res = await api.get('/health-hub/first-aid');
            const data = getPayload(res);
            setItems(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to load first aid guides', error);
            toast.error(getAdminErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, []);

    const filteredItems = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return items;
        return items.filter(
            (item) =>
                item.title?.toLowerCase().includes(q) ||
                item.category?.toLowerCase().includes(q)
        );
    }, [items, searchQuery]);

    const openAddModal = () => {
        setModalMode('add');
        setSelectedItem(null);
        setFormData(EMPTY_FORM);
        setIsModalOpen(true);
    };

    const openEditModal = (item) => {
        setModalMode('edit');
        setSelectedItem(item);
        setFormData({
            title: item.title || '',
            content: item.content || '',
            category: item.category || '',
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            const body = {
                title: formData.title.trim(),
                content: formData.content.trim(),
                category: formData.category.trim() || undefined,
            };

            if (modalMode === 'add') {
                await api.post('/health-hub/first-aid', body);
                toast.success('First aid guide created');
            } else if (selectedItem?.id) {
                await api.patch(`/health-hub/first-aid/${selectedItem.id}`, body);
                toast.success('First aid guide updated');
            }

            setIsModalOpen(false);
            fetchItems();
        } catch (error) {
            console.error('Failed to save first aid guide', error);
            toast.error(getAdminErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (item) => {
        if (!window.confirm(`Delete "${item.title}"?`)) return;
        try {
            await api.delete(`/health-hub/first-aid/${item.id}`);
            toast.success('First aid guide deleted');
            fetchItems();
        } catch (error) {
            console.error('Failed to delete first aid guide', error);
            toast.error(getAdminErrorMessage(error));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground max-w-xl">
                    Manage first aid guides shown in the mobile app Health Hub. English content is auto-translated for French users.
                </p>
                <Button onClick={openAddModal} className="gap-2 shrink-0">
                    <Plus size={18} />
                    Add guide
                </Button>
            </div>

            <Card className="hover:shadow-card">
                <CardContent className="p-4">
                    <div className="relative w-full md:w-96">
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            size={18}
                        />
                        <Input
                            type="text"
                            placeholder="Search by title or category..."
                            className="pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-card">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px]">
                        <thead className="bg-surface border-b border-border">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                    Guide
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                    Category
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                                        Loading...
                                    </td>
                                </tr>
                            ) : filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                                        No first aid guides found
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-accent/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-start gap-3">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                    <Bandage size={18} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-foreground">{item.title}</p>
                                                    <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                                                        {item.content}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {item.category ? (
                                                <span className="inline-flex px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-primary/20 text-primary">
                                                    {item.category}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => openEditModal(item)}
                                                    className="text-muted-foreground hover:text-primary transition-colors p-2 rounded-lg hover:bg-accent"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(item)}
                                                    className="text-muted-foreground hover:text-destructive transition-colors p-2 rounded-lg hover:bg-destructive/10"
                                                    title="Delete"
                                                >
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

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {modalMode === 'add' ? 'Add first aid guide' : 'Edit first aid guide'}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="fa-title">Title</Label>
                            <Input
                                id="fa-title"
                                required
                                value={formData.title}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="fa-category">Category</Label>
                            <Input
                                id="fa-category"
                                placeholder="e.g. Burns, CPR"
                                value={formData.category}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, category: e.target.value }))
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="fa-content">Instructions</Label>
                            <Textarea
                                id="fa-content"
                                required
                                rows={8}
                                value={formData.content}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, content: e.target.value }))
                                }
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsModalOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={saving}>
                                {saving ? 'Saving...' : modalMode === 'add' ? 'Create' : 'Save changes'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
