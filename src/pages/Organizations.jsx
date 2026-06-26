import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Plus, Search, Pencil, Loader2 } from 'lucide-react';
import api, { getPayload } from '@/lib/api';
import { getAdminErrorMessage } from '@/lib/adminErrors';

function fmtDate(dt) {
  if (!dt) return '—';
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

export default function Organizations() {
  const [loading, setLoading] = useState(false);
  const [statusLoadingId, setStatusLoadingId] = useState(null);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', code: '' });

  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm, setEditForm] = useState({ id: null, name: '', code: '', isActive: true });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((o) => `${o.name || ''} ${o.code || ''}`.toLowerCase().includes(q));
  }, [items, search]);

  const fetchOrganizations = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/organization/admin/organizations');
      const payload = getPayload(res) ?? res.data;
      const list = payload?.data ?? payload?.items ?? payload ?? [];
      setItems(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(getAdminErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const createOrg = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setError('');
    try {
      await api.post('/organization/admin/organizations', {
        name: createForm.name,
        code: createForm.code,
      });
      setCreateOpen(false);
      setCreateForm({ name: '', code: '' });
      await fetchOrganizations();
    } catch (e2) {
      setError(getAdminErrorMessage(e2));
    } finally {
      setCreateLoading(false);
    }
  };

  const openEdit = (org) => {
    setEditForm({
      id: org.id,
      name: org.name ?? '',
      code: org.code ?? '',
      isActive: org.isActive ?? true,
    });
    setEditOpen(true);
  };

  const updateOrg = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setError('');
    try {
      await api.patch(`/organization/admin/organizations/${editForm.id}`, {
        name: editForm.name,
        code: editForm.code,
        isActive: editForm.isActive,
      });
      setEditOpen(false);
      setEditForm({ id: null, name: '', code: '', isActive: true });
      await fetchOrganizations();
    } catch (e2) {
      setError(getAdminErrorMessage(e2));
    } finally {
      setEditLoading(false);
    }
  };

  const toggleOrgStatus = async (org, shouldActivate) => {
    setError('');
    try {
      setStatusLoadingId(org.id);
      const endpoint = shouldActivate ? 'activate' : 'deactivate';
      await api.post(`/organization/admin/organizations/${org.id}/${endpoint}`);
      await fetchOrganizations();
    } catch (e) {
      setError(getAdminErrorMessage(e));
    } finally {
      setStatusLoadingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Organizations</h1>
          <p className="text-brand-gold mt-1 font-medium">Global admin: create and manage organizations</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={16} className="mr-2" />
          Create Organization
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/20 border border-destructive/30 text-destructive text-sm font-medium">
          {error}
        </div>
      )}

      <Card className="hover:shadow-card">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-xl text-[#004d4d]">All Organizations</CardTitle>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="Search organizations..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-surface border-b border-border">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Name</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Code</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Created</th>
                  <th className="text-right px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td className="px-6 py-6 text-muted-foreground" colSpan={5}>
                      Loading...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td className="px-6 py-6 text-muted-foreground" colSpan={5}>
                      No organizations found
                    </td>
                  </tr>
                ) : (
                  filtered.map((org) => (
                    <tr key={org.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-foreground">{org.name || '—'}</div>
                        <div className="text-xs text-muted-foreground">#{org.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{org.code || '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={!!org.isActive}
                            disabled={statusLoadingId === org.id}
                            onCheckedChange={(checked) => toggleOrgStatus(org, checked)}
                          />
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              org.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {org.isActive ? 'Active' : 'Inactive'}
                          </span>
                          {statusLoadingId === org.id && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{fmtDate(org.createdAt)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" className="h-9" onClick={() => openEdit(org)}>
                            <Pencil size={16} className="mr-2" />
                            Edit
                          </Button>
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Organization</DialogTitle>
          </DialogHeader>

          <form onSubmit={createOrg} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" required value={createForm.name} onChange={(e) => setCreateForm((s) => ({ ...s, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input id="code" required value={createForm.code} onChange={(e) => setCreateForm((s) => ({ ...s, code: e.target.value }))} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setCreateOpen(false)} disabled={createLoading}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={createLoading}>
                {createLoading ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
          </DialogHeader>

          <form onSubmit={updateOrg} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Name</Label>
              <Input id="editName" required value={editForm.name} onChange={(e) => setEditForm((s) => ({ ...s, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editCode">Code</Label>
              <Input id="editCode" required value={editForm.code} onChange={(e) => setEditForm((s) => ({ ...s, code: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="editIsActive"
                checked={!!editForm.isActive}
                onChange={(e) => setEditForm((s) => ({ ...s, isActive: e.target.checked }))}
              />
              <Label htmlFor="editIsActive" className="font-normal">
                Active
              </Label>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setEditOpen(false)} disabled={editLoading}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={editLoading}>
                {editLoading ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

