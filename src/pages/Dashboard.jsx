import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card.jsx';
import { useTheme } from '@/context/ThemeContext';
import { Users, UserPlus, Calendar, DollarSign, ArrowUp, ArrowDown, TrendingUp, Activity } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import api, { getPayload } from '@/lib/api';
import { resolveCurrency } from '@/lib/currency';
import { resolveImageUrl } from '@/lib/images';

const statConfig = [
    { key: 'totalDoctors', title: 'Total Doctors', icon: UserPlus, trendKey: 'trendDoctors', iconBg: 'bg-primary', isAccent: true },
    { key: 'totalPatients', title: 'Total Patients', icon: Users, trendKey: 'trendPatients', iconBg: 'bg-primary', isAccent: true },
    { key: 'appointments', title: 'Appointments', icon: Calendar, trendKey: 'trendAppointments', iconBg: 'bg-primary', isAccent: true },
    { key: 'totalEarnings', title: 'Total Earnings', icon: DollarSign, trendKey: 'trendEarnings', iconBg: 'bg-primary', isCurrency: true, isAccent: true },
];

const StatCard = ({ title, value, change, icon: Icon, trend, currency, iconBg }) => (
    <Card className="overflow-hidden group border border-border bg-card hover:shadow-card ">
        <CardContent className="relative p-6">
            <div className="flex items-start justify-between">
                <div className={`p-3 rounded-2xl ${iconBg} shadow-lg`}>
                    <Icon className="text-primary-foreground w-7 h-7" />
                </div>
                {change != null && change !== 0 && (
                    <div className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-xl ${trend === 'up' ? 'text-primary bg-primary/20' : 'text-brand-gold bg-brand-gold/20'}`}>
                        {trend === 'up' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                        {trend === 'up' ? '+' : ''}{change}%
                    </div>
                )}
            </div>
            <div className="mt-6">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{title}</h3>
                <h4 className="text-3xl font-bold text-foreground mt-2 tracking-tight">
                    {typeof value === 'number' && currency ? `${currency} ${value.toLocaleString()}` : value}
                </h4>
            </div>
        </CardContent>
    </Card>
);

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

export default function Dashboard() {
    const { theme } = useTheme();
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const isDark = theme === 'dark';
    const chartGrid = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
    const chartTick = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
    const chartTooltip = { borderRadius: '12px', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)', backgroundColor: isDark ? 'hsl(180 20% 8%)' : 'hsl(0,0%,100%)', color: isDark ? '#d6f2ee' : '#004d4d' };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get('/admin/dashboard');
                setDashboard(getPayload(res) ?? res.data);
            } catch (error) {
                console.error('Failed to fetch dashboard', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const summary = dashboard?.summary ?? {};
    const currency = resolveCurrency(summary.currency ?? dashboard?.currency);
    const earningsOverview = dashboard?.earningsOverview ?? [];
    const data = earningsOverview.map(e => ({ name: e.label ?? e.month, earnings: e.amount ?? 0 }));
    const recentAppointments = dashboard?.recentAppointments ?? [];
    const lastUpdated = dashboard?.lastUpdated;

    if (loading) {
        return (
            <div className="space-y-8 animate-fade-in">
                <div className="h-32 bg-gradient-to-r from-primary/20 to-transparent rounded-2xl animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-40 bg-surface rounded-2xl animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 h-80 bg-surface rounded-2xl animate-pulse" />
                    <div className="h-80 bg-surface rounded-2xl animate-pulse" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-slide-up">
            {/* Welcome Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-8 shadow-card">
                <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                            {getGreeting()}, Admin
                        </h1>
                        <p className="text-brand-gold mt-2 font-medium">
                            Here's what's happening with your platform today.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-border">
                        <Activity size={18} className="text-primary" />
                        <span className="text-sm font-medium text-muted-foreground">
                            Updated {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : '—'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 hover:shadow-card">
                {statConfig.map((config) => (
                    <StatCard
                        key={config.key}
                        title={config.title}
                        value={summary[config.key] ?? 0}
                        change={summary[config.trendKey]}
                        icon={config.icon}
                        trend={(summary[config.trendKey] ?? 0) >= 0 ? 'up' : 'down'}
                        currency={config.isCurrency ? currency : undefined}
                        iconBg={config.iconBg}
                    />
                ))}
            </div>

            {/* Charts & Appointments */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Earnings Chart */}
                <Card className="lg:col-span-2 overflow-hidden border-primary/20 hover:shadow-card hover:border-primary/30 transition-colors">
                    <CardHeader className="border-b border-border">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <TrendingUp size={22} className="text-primary" />
                                Earnings Overview
                            </CardTitle>
                            <span className="text-xs font-semibold text-primary bg-primary/20 px-3 py-1 rounded-lg">
                                {currency}
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="h-[320px] min-h-[280px] w-full min-w-0">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
                                <AreaChart data={data.length ? data : [{ name: '—', earnings: 0 }]}>
                                    <defs>
                                        <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#26a69a" stopOpacity={0.4} />
                                            <stop offset="100%" stopColor="#26a69a" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGrid} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: chartTick, fontSize: 12 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: chartTick, fontSize: 12 }} />
                                    <Tooltip
                                        cursor={{ stroke: 'rgba(38, 166, 154, 0.3)' }}
                                        contentStyle={chartTooltip}
                                        formatter={(val) => [`${currency} ${Number(val).toLocaleString()}`, 'Earnings']}
                                    />
                                    <Area type="monotone" dataKey="earnings" stroke="#00796b" strokeWidth={2} fill="url(#earningsGradient)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Appointments */}
                <Card className="overflow-hidden border-primary/20 hover:shadow-card transition-colors">
                    <CardHeader className="border-b border-border">
                        <CardTitle className="text-xl flex items-center gap-2 text-[#004d4d]">
                            <Calendar size={20} className="text-primary" />
                            Recent Appointments
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-border max-h-[360px] overflow-y-auto">
                            {recentAppointments.length > 0 ? (
                                recentAppointments.map((apt, i) => (
                                    <div
                                        key={apt.id}
                                        className="flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors"
                                        style={{ animationDelay: `${i * 50}ms` }}
                                    >
                                        <div className="relative">
                                            <div className="w-12 h-12 rounded-xl bg-card flex items-center justify-center text-primary font-bold overflow-hidden shrink-0 border border-border">
                                                {apt.patientPhoto ? (
                                                    <img src={resolveImageUrl(apt.patientPhoto)} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    (apt.patientName || '?')[0]
                                                )}
                                            </div>
                                            <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-primary border-2 border-card" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold text-foreground truncate">{apt.patientName || 'Patient'}</h4>
                                            <p className="text-xs text-muted-foreground truncate mt-0.5">{apt.doctorName || apt.appointmentType || 'Appointment'}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="text-xs font-semibold text-primary block">{apt.time || '—'}</span>
                                            <span className="text-[10px] text-muted-foreground">{apt.date || '—'}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center mb-4">
                                        <Calendar size={28} className="text-muted-foreground" />
                                    </div>
                                    <p className="text-sm text-muted-foreground font-medium">No recent appointments</p>
                                    <p className="text-xs text-muted-foreground mt-1">New appointments will appear here</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
