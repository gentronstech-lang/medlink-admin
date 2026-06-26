import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Users, UserCog, Building2 } from 'lucide-react';
import orgApi, { getOrgErrorMessage, getOrgPayload } from '@/lib/orgApi';
import { useOrgAuth } from '@/context/OrgAuthContext';

export default function OrgDashboard() {
  const { admin } = useOrgAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [driversCount, setDriversCount] = useState(0);
  const [adminsCount, setAdminsCount] = useState(0);

  const orgName = useMemo(
    () => admin?.organization?.name || admin?.organizationName || admin?.organization?.code || 'Organization',
    [admin]
  );

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [driversRes, adminsRes] = await Promise.all([
          orgApi.get('/organization/drivers'),
          orgApi.get('/organization/admins'),
        ]);
        const driversPayload = getOrgPayload(driversRes);
        const adminsPayload = getOrgPayload(adminsRes);

        const drivers = driversPayload?.data ?? driversPayload ?? [];
        const admins = adminsPayload?.data ?? adminsPayload ?? [];

        if (alive) {
          setDriversCount(Array.isArray(drivers) ? drivers.length : 0);
          setAdminsCount(Array.isArray(admins) ? admins.length : 0);
        }
      } catch (e) {
        if (alive) setError(getOrgErrorMessage(e));
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Organization Dashboard</h1>
        <p className="text-muted-foreground mt-1 font-medium">Overview of your organization</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/20 border border-destructive/30 text-destructive text-sm font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Organization</CardTitle>
            <Building2 className="text-primary" size={18} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{orgName}</div>
            <div className="text-sm text-muted-foreground mt-1">Signed in as {admin?.email || '—'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Drivers</CardTitle>
            <Users className="text-primary" size={18} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{loading ? '—' : driversCount}</div>
            <div className="text-sm text-muted-foreground mt-1">Total drivers</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Admins</CardTitle>
            <UserCog className="text-primary" size={18} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{loading ? '—' : adminsCount}</div>
            <div className="text-sm text-muted-foreground mt-1">Total organization admins</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

