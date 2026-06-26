import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Plus, Search, Pencil, KeyRound, Loader2 } from 'lucide-react';
import api, { getPayload } from '@/lib/api';
import { getAdminErrorMessage } from '@/lib/adminErrors';
import { CredentialsModal } from '@/components/org/CredentialsModal';

function fmtDate(dt) {
  if (!dt) return '—';
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

function nestedOrgName(admin) {
  const o = admin.organization;
  if (o && typeof o === 'object') {
    return o.name ?? o.title ?? o.organizationName ?? null;
  }
  return admin.organizationName ?? admin.organization_name ?? null;
}

export default function OrganizationAdmins() {
  const [loading, setLoading] = useState(false);
  const [statusLoadingId, setStatusLoadingId] = useState(null);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [orgFilter, setOrgFilter] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState({ organizationId: '', fullName: '', email: '', password: '' });
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [orgs, setOrgs] = useState([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm, setEditForm] = useState({ id: null, fullName: '', email: '', isActive: true });

  const [pwOpen, setPwOpen] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwForm, setPwForm] = useState({ id: null, email: '', newPassword: '' });

  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [credentialsTitle, setCredentialsTitle] = useState('Credentials');

  const orgIdToName = useMemo(() => {
    const m = new Map();
    for (const o of orgs) {
      if (o?.id != null) m.set(Number(o.id), o.name ?? o.title ?? String(o.id));
    }
    return m;
  }, [orgs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((a) => {
      const orgName = nestedOrgName(a);
      const oid = a.organizationId ?? a.organization_id;
      const mapped = oid != null ? orgIdToName.get(Number(oid)) : '';
      const hay = `${a.fullName || ''} ${a.email || ''} ${orgName || ''} ${mapped || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, search, orgIdToName]);

  const fetchAdmins = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/organization/admin/organization-admins', {
        params: orgFilter ? { organizationId: orgFilter } : undefined,
      });
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
    fetchAdmins();
  }, [orgFilter]);

  const fetchOrganizations = async () => {
    setOrgsLoading(true);
    try {
      const res = await api.get('/organization/admin/organizations');
      const payload = getPayload(res) ?? res.data;
      const list = payload?.data ?? payload?.items ?? payload ?? [];
      setOrgs(Array.isArray(list) ? list : []);
    } catch {
      // ignore in UI; dropdown will show empty
    } finally {
      setOrgsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    if (createOpen) fetchOrganizations();
  }, [createOpen]);

  const openCredentials = (title, creds) => {
    setCredentialsTitle(title);
    setCredentials(creds);
    setCredentialsOpen(true);
  };

  const createAdmin = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setError('');
    try {
      const body = {
        organizationId: Number(createForm.organizationId),
        fullName: createForm.fullName,
        email: createForm.email,
        password: createForm.password || undefined,
      };
      await api.post('/organization/admin/organization-admins', body);
      setCreateOpen(false);
      setCreateForm({ organizationId: '', fullName: '', email: '', password: '' });
      await fetchAdmins();
    } catch (e2) {
      setError(getAdminErrorMessage(e2));
    } finally {
      setCreateLoading(false);
    }
  };

  const openEdit = (admin) => {
    setEditForm({ id: admin.id, fullName: admin.fullName || '', email: admin.email || '', isActive: admin.isActive ?? true });
    setEditOpen(true);
  };

  const updateAdmin = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setError('');
    try {
      await api.patch(`/organization/admin/organization-admins/${editForm.id}`, {
        fullName: editForm.fullName,
        email: editForm.email,
        isActive: editForm.isActive,
      });
      setEditOpen(false);
      setEditForm({ id: null, fullName: '', email: '', isActive: true });
      await fetchAdmins();
    } catch (e2) {
      setError(getAdminErrorMessage(e2));
    } finally {
      setEditLoading(false);
    }
  };

  const toggleAdminStatus = async (admin, checked) => {
    setError('');
    try {
      setStatusLoadingId(admin.id);
      await api.patch(`/organization/admin/organization-admins/${admin.id}`, {
        isActive: checked,
      });
      await fetchAdmins();
    } catch (e) {
      setError(getAdminErrorMessage(e));
    } finally {
      setStatusLoadingId(null);
    }
  };

  const openChangePassword = (admin) => {
    setPwForm({ id: admin.id, email: admin.email || '', newPassword: '' });
    setPwOpen(true);
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwLoading(true);
    setError('');
    try {
      const res = await api.patch(`/organization/admin/organization-admins/${pwForm.id}/password`, {
        newPassword: pwForm.newPassword,
      });
      const payload = getPayload(res) ?? res.data;
      const creds = payload?.credentials;
      setPwOpen(false);
      setPwForm({ id: null, email: '', newPassword: '' });
      await fetchAdmins();
      if (creds?.password) openCredentials('Org admin password', creds);
    } catch (e2) {
      setError(getAdminErrorMessage(e2));
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Organization Admins</h1>
          <p className="text-brand-gold mt-1 font-medium">Global admin: create and manage org admins</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={16} className="mr-2" />
          Create Org Admin
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/20 border border-destructive/30 text-destructive text-sm font-medium">
          {error}
        </div>
      )}

      <Card className="hover:shadow-card">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-xl text-[#004d4d]">All Org Admins</CardTitle>
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <Input
              placeholder="Filter by organizationId..."
              value={orgFilter}
              onChange={(e) => setOrgFilter(e.target.value)}
              className="md:w-60"
            />
            <div className="relative w-full md:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="Search admins..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead className="bg-surface border-b border-border">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Admin</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Organization</th>
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
                      No org admins found
                    </td>
                  </tr>
                ) : (
                  filtered.map((a) => (
                    <tr key={a.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-foreground">{a.fullName || '—'}</div>
                        <div className="text-xs text-muted-foreground">{a.email || '—'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {(() => {
                          const oid = a.organizationId ?? a.organization_id;
                          const byNested = nestedOrgName(a);
                          const byMap = oid != null ? orgIdToName.get(Number(oid)) : null;
                          const label = byNested || byMap;
                          if (label) {
                            return <span className="font-medium text-foreground">{label}</span>;
                          }
                          if (oid != null && oid !== '') {
                            return <span className="text-muted-foreground tabular-nums">#{oid}</span>;
                          }
                          return <span className="text-muted-foreground">—</span>;
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={!!a.isActive}
                            disabled={statusLoadingId === a.id}
                            onCheckedChange={(checked) => toggleAdminStatus(a, checked)}
                          />
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              a.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {a.isActive ? 'Active' : 'Inactive'}
                          </span>
                          {statusLoadingId === a.id && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{fmtDate(a.createdAt)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" className="h-9" onClick={() => openEdit(a)}>
                            <Pencil size={16} className="mr-2" />
                            Edit
                          </Button>
                          <Button variant="outline" className="h-9" onClick={() => openChangePassword(a)}>
                            <KeyRound size={16} className="mr-2" />
                            Password
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
            <DialogTitle>Create Org Admin</DialogTitle>
          </DialogHeader>
          <form onSubmit={createAdmin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="organizationId">Organization ID</Label>
              <Select
                value={createForm.organizationId}
                onValueChange={(v) => setCreateForm((s) => ({ ...s, organizationId: v }))}
                disabled={orgsLoading}
              >
                <SelectTrigger id="organizationId">
                  <SelectValue placeholder={orgsLoading ? 'Loading organizations...' : 'Select organization'} />
                </SelectTrigger>
                <SelectContent>
                  {orgs.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      No organizations found
                    </SelectItem>
                  ) : (
                    orgs.map((o) => (
                      <SelectItem key={o.id} value={String(o.id)}>
                        {o.name} {o.code ? `(${o.code})` : ''} — #{o.id}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" required value={createForm.fullName} onChange={(e) => setCreateForm((s) => ({ ...s, fullName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={createForm.email} onChange={(e) => setCreateForm((s) => ({ ...s, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Temp password (optional)</Label>
              <Input
                id="password"
                value={createForm.password}
                onChange={(e) => setCreateForm((s) => ({ ...s, password: e.target.value }))}
                placeholder="TempPass123"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setCreateOpen(false)} disabled={createLoading}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={createLoading || !createForm.organizationId || createForm.organizationId === '__none'}>
                {createLoading ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Org Admin</DialogTitle>
          </DialogHeader>
          <form onSubmit={updateAdmin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editFullName">Full name</Label>
              <Input id="editFullName" required value={editForm.fullName} onChange={(e) => setEditForm((s) => ({ ...s, fullName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editEmail">Email</Label>
              <Input id="editEmail" type="email" required value={editForm.email} onChange={(e) => setEditForm((s) => ({ ...s, email: e.target.value }))} />
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

      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <form onSubmit={changePassword} className="space-y-4">
            <div className="rounded-xl border border-border bg-surface p-4 text-sm">
              <div className="text-muted-foreground">Email</div>
              <div className="font-semibold text-foreground break-all">{pwForm.email || '—'}</div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                required
                value={pwForm.newPassword}
                onChange={(e) => setPwForm((s) => ({ ...s, newPassword: e.target.value }))}
                placeholder="NewAdminPass123"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setPwOpen(false)} disabled={pwLoading}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={pwLoading}>
                {pwLoading ? 'Updating...' : 'Update'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <CredentialsModal open={credentialsOpen} onOpenChange={setCredentialsOpen} title={credentialsTitle} credentials={credentials} />
    </div>
  );
}

