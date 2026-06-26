import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Plus, KeyRound, Search } from 'lucide-react';
import orgApi, { getOrgErrorMessage, getOrgPayload } from '@/lib/orgApi';
import { CredentialsModal } from '@/components/org/CredentialsModal';

function fmtDate(dt) {
  if (!dt) return '—';
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

export default function OrgAdmins() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [admins, setAdmins] = useState([]);
  const [search, setSearch] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState({ fullName: '', email: '' });

  const [isChangePwOpen, setIsChangePwOpen] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwForm, setPwForm] = useState({ id: null, fullName: '', email: '', newPassword: '' });

  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [credentialsTitle, setCredentialsTitle] = useState('Credentials');

  const filteredAdmins = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return admins;
    return admins.filter((a) => {
      const hay = `${a.fullName || ''} ${a.email || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [admins, search]);

  const fetchAdmins = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await orgApi.get('/organization/admins');
      const payload = getOrgPayload(res);
      const list = payload?.data ?? payload ?? [];
      setAdmins(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(getOrgErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

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
      const res = await orgApi.post('/organization/admins', {
        fullName: createForm.fullName,
        email: createForm.email,
      });
      const payload = getOrgPayload(res);
      const creds = payload?.credentials;
      setIsCreateOpen(false);
      setCreateForm({ fullName: '', email: '' });
      await fetchAdmins();
      if (creds?.password) openCredentials('Org admin credentials', creds);
    } catch (e2) {
      setError(getOrgErrorMessage(e2));
    } finally {
      setCreateLoading(false);
    }
  };

  const openChangePassword = (admin) => {
    setPwForm({ id: admin.id, fullName: admin.fullName || '', email: admin.email || '', newPassword: '' });
    setIsChangePwOpen(true);
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwLoading(true);
    setError('');
    try {
      await orgApi.patch(`/organization/admins/${pwForm.id}/password`, { newPassword: pwForm.newPassword });
      setIsChangePwOpen(false);
      setPwForm({ id: null, fullName: '', email: '', newPassword: '' });
      // Backend doesn't always return creds for this endpoint in spec; show a reminder only.
      await fetchAdmins();
    } catch (e2) {
      setError(getOrgErrorMessage(e2));
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Organization Admins</h1>
          <p className="text-muted-foreground mt-1 font-medium">Manage admins who can access this org panel</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus size={16} className="mr-2" />
          Create Admin
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/20 border border-destructive/30 text-destructive text-sm font-medium">
          {error}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-xl">Admins List</CardTitle>
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
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-surface border-b border-border">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Name</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Email</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Password Changed</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Last Login</th>
                  <th className="text-right px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td className="px-6 py-6 text-muted-foreground" colSpan={6}>
                      Loading...
                    </td>
                  </tr>
                ) : filteredAdmins.length === 0 ? (
                  <tr>
                    <td className="px-6 py-6 text-muted-foreground" colSpan={6}>
                      No admins found
                    </td>
                  </tr>
                ) : (
                  filteredAdmins.map((a) => (
                    <tr key={a.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-foreground">{a.fullName || '—'}</div>
                        <div className="text-xs text-muted-foreground">#{a.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{a.email || '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            a.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {a.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{fmtDate(a.passwordChangedAt)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{fmtDate(a.lastLoginAt)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Button variant="outline" className="h-9" onClick={() => openChangePassword(a)}>
                          <KeyRound size={16} className="mr-2" />
                          Change Password
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Organization Admin</DialogTitle>
          </DialogHeader>

          <form onSubmit={createAdmin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                required
                value={createForm.fullName}
                onChange={(e) => setCreateForm((s) => ({ ...s, fullName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={createForm.email}
                onChange={(e) => setCreateForm((s) => ({ ...s, email: e.target.value }))}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsCreateOpen(false)} disabled={createLoading}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={createLoading}>
                {createLoading ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isChangePwOpen} onOpenChange={setIsChangePwOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>

          <form onSubmit={changePassword} className="space-y-4">
            <div className="rounded-xl border border-border bg-surface p-4 text-sm">
              <div className="font-semibold text-foreground">{pwForm.fullName || '—'}</div>
              <div className="text-muted-foreground mt-0.5 break-all">{pwForm.email || '—'}</div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                required
                value={pwForm.newPassword}
                onChange={(e) => setPwForm((s) => ({ ...s, newPassword: e.target.value }))}
                placeholder="NewPass123"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsChangePwOpen(false)} disabled={pwLoading}>
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

