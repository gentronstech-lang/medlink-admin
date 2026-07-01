import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Phone, Trash2, Edit2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
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

const EMPTY_NUMBER = { title: '', phone: '' };
const EMPTY_INSTRUCTION = { title: '', content: '' };

export default function EmergencyContentTab() {
    const [numbers, setNumbers] = useState([]);
    const [instructions, setInstructions] = useState([]);
    const [loading, setLoading] = useState(true);

    const [numberModalOpen, setNumberModalOpen] = useState(false);
    const [numberMode, setNumberMode] = useState('add');
    const [selectedNumber, setSelectedNumber] = useState(null);
    const [numberForm, setNumberForm] = useState(EMPTY_NUMBER);
    const [numberSaving, setNumberSaving] = useState(false);

    const [instructionModalOpen, setInstructionModalOpen] = useState(false);
    const [instructionMode, setInstructionMode] = useState('add');
    const [selectedInstruction, setSelectedInstruction] = useState(null);
    const [instructionForm, setInstructionForm] = useState(EMPTY_INSTRUCTION);
    const [instructionSaving, setInstructionSaving] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [numbersRes, instructionsRes] = await Promise.all([
                api.get('/health-hub/emergency-numbers'),
                api.get('/health-hub/quick-instructions'),
            ]);
            const numbersData = getPayload(numbersRes);
            const instructionsData = getPayload(instructionsRes);
            setNumbers(Array.isArray(numbersData) ? numbersData : []);
            setInstructions(Array.isArray(instructionsData) ? instructionsData : []);
        } catch (error) {
            console.error('Failed to load emergency content', error);
            toast.error(getAdminErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const sortedNumbers = useMemo(
        () => [...numbers].sort((a, b) => (a.title || '').localeCompare(b.title || '')),
        [numbers]
    );

    const openAddNumber = () => {
        setNumberMode('add');
        setSelectedNumber(null);
        setNumberForm(EMPTY_NUMBER);
        setNumberModalOpen(true);
    };

    const openEditNumber = (item) => {
        setNumberMode('edit');
        setSelectedNumber(item);
        setNumberForm({ title: item.title || '', phone: item.phone || '' });
        setNumberModalOpen(true);
    };

    const saveNumber = async (e) => {
        e.preventDefault();
        try {
            setNumberSaving(true);
            const body = {
                title: numberForm.title.trim(),
                phone: numberForm.phone.trim(),
            };
            if (numberMode === 'add') {
                await api.post('/health-hub/emergency-numbers', body);
                toast.success('Emergency number added');
            } else if (selectedNumber?.id) {
                await api.patch(`/health-hub/emergency-numbers/${selectedNumber.id}`, body);
                toast.success('Emergency number updated');
            }
            setNumberModalOpen(false);
            fetchData();
        } catch (error) {
            console.error('Failed to save emergency number', error);
            toast.error(getAdminErrorMessage(error));
        } finally {
            setNumberSaving(false);
        }
    };

    const deleteNumber = async (item) => {
        if (!window.confirm(`Delete "${item.title}"?`)) return;
        try {
            await api.delete(`/health-hub/emergency-numbers/${item.id}`);
            toast.success('Emergency number deleted');
            fetchData();
        } catch (error) {
            console.error('Failed to delete emergency number', error);
            toast.error(getAdminErrorMessage(error));
        }
    };

    const openAddInstruction = () => {
        setInstructionMode('add');
        setSelectedInstruction(null);
        setInstructionForm(EMPTY_INSTRUCTION);
        setInstructionModalOpen(true);
    };

    const openEditInstruction = (item) => {
        setInstructionMode('edit');
        setSelectedInstruction(item);
        setInstructionForm({
            title: item.title || '',
            content: item.content || '',
        });
        setInstructionModalOpen(true);
    };

    const saveInstruction = async (e) => {
        e.preventDefault();
        try {
            setInstructionSaving(true);
            const body = {
                title: instructionForm.title.trim(),
                content: instructionForm.content.trim(),
            };
            if (instructionMode === 'add') {
                await api.post('/health-hub/quick-instructions', body);
                toast.success('Quick instruction added');
            } else if (selectedInstruction?.id) {
                await api.patch(`/health-hub/quick-instructions/${selectedInstruction.id}`, body);
                toast.success('Quick instruction updated');
            }
            setInstructionModalOpen(false);
            fetchData();
        } catch (error) {
            console.error('Failed to save quick instruction', error);
            toast.error(getAdminErrorMessage(error));
        } finally {
            setInstructionSaving(false);
        }
    };

    const deleteInstruction = async (item) => {
        if (!window.confirm(`Delete "${item.title}"?`)) return;
        try {
            await api.delete(`/health-hub/quick-instructions/${item.id}`);
            toast.success('Quick instruction deleted');
            fetchData();
        } catch (error) {
            console.error('Failed to delete quick instruction', error);
            toast.error(getAdminErrorMessage(error));
        }
    };

    return (
        <div className="space-y-8">
            <p className="text-sm text-muted-foreground max-w-2xl">
                Manage emergency phone numbers and quick instructions shown in the mobile app Emergency tab.
            </p>

            <Card className="hover:shadow-card">
                <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
                    <div>
                        <CardTitle className="text-lg">Emergency numbers</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            Hotlines patients can call directly from the app.
                        </p>
                    </div>
                    <Button onClick={openAddNumber} className="gap-2 shrink-0">
                        <Plus size={18} />
                        Add number
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto border-t border-border">
                        <table className="w-full min-w-[560px]">
                            <thead className="bg-surface">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                        Service
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                        Phone
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-muted-foreground uppercase tracking-widest">
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
                                ) : sortedNumbers.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                                            No emergency numbers yet
                                        </td>
                                    </tr>
                                ) : (
                                    sortedNumbers.map((item) => (
                                        <tr key={item.id} className="hover:bg-accent/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                                                        <Phone size={16} />
                                                    </div>
                                                    <span className="font-medium text-foreground">{item.title}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-sm text-foreground">
                                                {item.phone}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditNumber(item)}
                                                        className="text-muted-foreground hover:text-primary transition-colors p-2 rounded-lg hover:bg-accent"
                                                        title="Edit"
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteNumber(item)}
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
                </CardContent>
            </Card>

            <Card className="hover:shadow-card">
                <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
                    <div>
                        <CardTitle className="text-lg">Quick instructions</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            Step-by-step guidance shown below emergency numbers.
                        </p>
                    </div>
                    <Button onClick={openAddInstruction} className="gap-2 shrink-0">
                        <Plus size={18} />
                        Add instruction
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto border-t border-border">
                        <table className="w-full min-w-[640px]">
                            <thead className="bg-surface">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                        Title
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                        Content
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-muted-foreground uppercase tracking-widest">
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
                                ) : instructions.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                                            No quick instructions yet
                                        </td>
                                    </tr>
                                ) : (
                                    instructions.map((item) => (
                                        <tr key={item.id} className="hover:bg-accent/50 transition-colors">
                                            <td className="px-6 py-4 align-top">
                                                <div className="flex items-start gap-3">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                        <BookOpen size={16} />
                                                    </div>
                                                    <span className="font-medium text-foreground">{item.title}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                                                    {item.content}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 text-right align-top">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditInstruction(item)}
                                                        className="text-muted-foreground hover:text-primary transition-colors p-2 rounded-lg hover:bg-accent"
                                                        title="Edit"
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteInstruction(item)}
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
                </CardContent>
            </Card>

            <Dialog open={numberModalOpen} onOpenChange={setNumberModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {numberMode === 'add' ? 'Add emergency number' : 'Edit emergency number'}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={saveNumber} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="en-title">Service name</Label>
                            <Input
                                id="en-title"
                                required
                                placeholder="e.g. Ambulance"
                                value={numberForm.title}
                                onChange={(e) =>
                                    setNumberForm((prev) => ({ ...prev, title: e.target.value }))
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="en-phone">Phone number</Label>
                            <Input
                                id="en-phone"
                                required
                                placeholder="e.g. 115"
                                value={numberForm.phone}
                                onChange={(e) =>
                                    setNumberForm((prev) => ({ ...prev, phone: e.target.value }))
                                }
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setNumberModalOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={numberSaving}>
                                {numberSaving ? 'Saving...' : numberMode === 'add' ? 'Create' : 'Save'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={instructionModalOpen} onOpenChange={setInstructionModalOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {instructionMode === 'add'
                                ? 'Add quick instruction'
                                : 'Edit quick instruction'}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={saveInstruction} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="qi-title">Title</Label>
                            <Input
                                id="qi-title"
                                required
                                value={instructionForm.title}
                                onChange={(e) =>
                                    setInstructionForm((prev) => ({
                                        ...prev,
                                        title: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="qi-content">Content</Label>
                            <Textarea
                                id="qi-content"
                                required
                                rows={8}
                                value={instructionForm.content}
                                onChange={(e) =>
                                    setInstructionForm((prev) => ({
                                        ...prev,
                                        content: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setInstructionModalOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={instructionSaving}>
                                {instructionSaving
                                    ? 'Saving...'
                                    : instructionMode === 'add'
                                      ? 'Create'
                                      : 'Save'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
