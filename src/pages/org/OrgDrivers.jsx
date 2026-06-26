import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Plus, RefreshCw, Search } from 'lucide-react';
import { Switch } from '@/components/ui/switch.jsx';
import orgApi, { getOrgErrorMessage, getOrgPayload } from '@/lib/orgApi';
import { CredentialsModal } from '@/components/org/CredentialsModal';

function fmtDate(dt) {
  if (!dt) return '—';
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

function mapDriver(raw) {
  const vehicle = raw?.vehicle ?? raw?.vehicleDetails ?? raw?.vehicle_details ?? {};
  const dp = raw?.driverProfile ?? raw?.driver_profile ?? {};
  return {
    ...raw,
    id: raw?.id ?? raw?._id,
    fullName: raw?.fullName ?? raw?.full_name ?? raw?.name ?? raw?.driverName ?? raw?.driver_name,
    email: raw?.email,
    phone: raw?.phone,
    isActive: raw?.isActive ?? raw?.is_active ?? true,
    createdAt: raw?.createdAt ?? raw?.created_at ?? raw?.created,
    vehicleType:
      raw?.vehicleType ??
      raw?.vehicle_type ??
      dp?.vehicleType ??
      dp?.vehicle_type ??
      vehicle?.type ??
      vehicle?.vehicleType ??
      vehicle?.vehicle_type ??
      raw?.vehicle?.type,
    vehiclePlate:
      raw?.vehiclePlate ??
      raw?.vehicle_plate ??
      dp?.vehiclePlate ??
      dp?.vehicle_plate ??
      vehicle?.plate ??
      vehicle?.vehiclePlate ??
      vehicle?.vehicle_plate,
    licenseNo:
      raw?.licenseNo ??
      raw?.license_no ??
      dp?.licenseNo ??
      dp?.license_no ??
      vehicle?.licenseNo ??
      vehicle?.license_no,
  };
}

export default function OrgDrivers() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [drivers, setDrivers] = useState([]);
  const [search, setSearch] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    vehicleType: '',
    vehiclePlate: '',
    licenseNo: '',
  });

  const [resetLoadingId, setResetLoadingId] = useState(null);
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [credentialsTitle, setCredentialsTitle] = useState('Credentials');

  const filteredDrivers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter((d) => {
      const hay = `${d.fullName || ''} ${d.email || ''} ${d.phone || ''} ${d.vehicleType || ''} ${d.vehiclePlate || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [drivers, search]);

  const fetchDrivers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await orgApi.get('/organization/drivers');
      const payload = getOrgPayload(res);

      const list = payload?.data ?? payload ?? [];
          console.log("list 1",list)
      setDrivers(Array.isArray(list) ? list.map(mapDriver) : []);
    } catch (e) {
      setError(getOrgErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const openCredentials = (title, creds) => {
    setCredentialsTitle(title);
    setCredentials(creds);
    setCredentialsOpen(true);
  };

  const createDriver = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setError('');
    try {
      const res = await orgApi.post('/organization/drivers', {
        fullName: form.fullName,
        phone: form.phone || undefined,
        email: form.email || undefined,
        vehicleType: form.vehicleType || undefined,
        vehiclePlate: form.vehiclePlate || undefined,
        licenseNo: form.licenseNo || undefined,
      });




      const payload = getOrgPayload(res);

      const creds = payload?.credentials;
      setIsCreateOpen(false);
      setForm({ fullName: '', phone: '', email: '', vehicleType: '', vehiclePlate: '', licenseNo: '' });
      await fetchDrivers();
      if (creds?.password) {
        openCredentials('Driver credentials', creds);
      }
    } catch (e2) {
      setError(getOrgErrorMessage(e2));
    } finally {
      setCreateLoading(false);
    }
  };

  const resetPassword = async (driver) => {
    setResetLoadingId(driver?.id);
    setError('');
    try {
      const res = await orgApi.patch(`/organization/drivers/${driver.id}/password`, {});
      const payload = getOrgPayload(res);
      const creds = payload?.credentials;
      if (creds?.password) {
        openCredentials('Driver password reset', creds);
      }
    } catch (e) {
      setError(getOrgErrorMessage(e));
    } finally {
      setResetLoadingId(null);
    }
  };

  const [statusLoadingId, setStatusLoadingId] = useState(null);

  const updateDriverStatus = async (driver, isActive) => {
    setStatusLoadingId(driver?.id);
    setError('');
    try {
      await orgApi.patch(`/organization/drivers/${driver.id}/status`, { isActive });
      setDrivers((prev) =>
        prev.map((d) => (d.id === driver.id ? { ...d, isActive } : d))
      );
    } catch (e) {
      setError(getOrgErrorMessage(e));
    } finally {
      setStatusLoadingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Drivers</h1>
          <p className="text-muted-foreground mt-1 font-medium">Create and manage organization drivers</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus size={16} className="mr-2" />
          Create Driver
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/20 border border-destructive/30 text-destructive text-sm font-medium">
          {error}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-xl">Drivers List</CardTitle>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="Search drivers..."
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
                  <th className="text-left px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Email / Phone</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Vehicle</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Created</th>
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
                ) : filteredDrivers.length === 0 ? (
                  <tr>
                    <td className="px-6 py-6 text-muted-foreground" colSpan={6}>
                      No drivers found
                    </td>
                  </tr>
                ) : (
                  filteredDrivers.map((d) => (
                    <tr key={d.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-foreground">{d.fullName || '—'}</div>
                        <div className="text-xs text-muted-foreground">#{d.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                        <div className="text-foreground/90">{d.email || '—'}</div>
                        <div className="text-muted-foreground">{d.phone || '—'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                        <div className="text-foreground/90">{d.vehicleType || '—'}</div>
                        <div className="text-muted-foreground">{d.vehiclePlate || '—'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={!!d.isActive}
                            disabled={statusLoadingId === d.id}
                            onCheckedChange={(checked) => updateDriverStatus(d, checked)}
                          />
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              d.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {d.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{fmtDate(d.createdAt)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Button
                          variant="outline"
                          onClick={() => resetPassword(d)}
                          disabled={resetLoadingId === d.id}
                          className="h-9"
                        >
                          <RefreshCw size={16} className="mr-2" />
                          {resetLoadingId === d.id ? 'Resetting...' : 'Reset Password'}
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
            <DialogTitle>Create Driver</DialogTitle>
          </DialogHeader>

          <form onSubmit={createDriver} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                required
                value={form.fullName}
                onChange={(e) => setForm((s) => ({ ...s, fullName: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} placeholder="+923001234567" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vehicleType">Vehicle type</Label>
                <Input
                  id="vehicleType"
                  value={form.vehicleType}
                  onChange={(e) => setForm((s) => ({ ...s, vehicleType: e.target.value }))}
                  placeholder="Ambulance"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehiclePlate">Vehicle plate</Label>
                <Input
                  id="vehiclePlate"
                  value={form.vehiclePlate}
                  onChange={(e) => setForm((s) => ({ ...s, vehiclePlate: e.target.value }))}
                  placeholder="ABC-123"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="licenseNo">License no</Label>
              <Input
                id="licenseNo"
                value={form.licenseNo}
                onChange={(e) => setForm((s) => ({ ...s, licenseNo: e.target.value }))}
                placeholder="LIC-12345"
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

      <CredentialsModal
        open={credentialsOpen}
        onOpenChange={setCredentialsOpen}
        title={credentialsTitle}
        credentials={credentials}
      />
    </div>
  );
}

