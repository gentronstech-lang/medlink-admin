import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card.jsx';
import { useTheme } from '@/context/ThemeContext';
import { Wallet, TrendingUp, Clock, BarChart3, ArrowUpRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api, { getPayload } from '@/lib/api';
import { resolveCurrency } from '@/lib/currency';

const StatCard = ({ title, value, subtitle, icon: Icon, iconBg, hero }) => (
    <Card className="overflow-hidden group border border-border bg-card hover:shadow-glow transition-all duration-500 hover:scale-[1.02]">
        <CardContent className="relative p-6">
            <div className="flex items-start justify-between">
                <div className={`p-3 rounded-2xl ${iconBg} shadow-lg`}>
                    <Icon className="text-white w-7 h-7" />
                </div>
                <ArrowUpRight className={`w-5 h-5 transition-colors ${hero ? 'text-white/60 group-hover:text-white' : 'text-muted-foreground group-hover:text-primary'}`} />
            </div>
            <p className="font-semibold text-sm uppercase tracking-wider mt-4 text-muted-foreground">{title}</p>
            <h3 className="text-3xl font-bold mt-2 tracking-tight text-foreground">{value}</h3>
            {subtitle && <p className="text-sm mt-3 font-medium text-brand-gold">{subtitle}</p>}
        </CardContent>
    </Card>
);

export default function Earnings() {
    const { theme } = useTheme();
    const [reports, setReports] = useState(null);
    const [loading, setLoading] = useState(true);
    const isDark = theme === 'dark';
    const chartGrid = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
    const chartTick = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
    const chartTooltip = { borderRadius: '12px', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)', backgroundColor: isDark ? 'hsl(180 20% 8%)' : 'hsl(0,0%,100%)', color: isDark ? '#d6f2ee' : '#004d4d' };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get('/admin/earnings-reports');
                setReports(getPayload(res) ?? res.data);
            } catch (error) {
                console.error('Failed to fetch earnings', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const currency = resolveCurrency(reports?.currency);
    const revenueAnalytics = reports?.revenueAnalytics ?? [];
    const data = revenueAnalytics.map(r => ({ name: r.label ?? `M${r.month}`, amount: r.amount ?? 0 }));
    const totalRevenue = reports?.totalRevenue ?? 0;
    const commissionEarned = reports?.commissionEarned ?? 0;
    const pendingPayoutsAmount = reports?.pendingPayoutsAmount ?? 0;
    const pendingPayoutsDoctorCount = reports?.pendingPayoutsDoctorCount ?? 0;
    const lastUpdated = reports?.lastUpdated;

    const statCards = [
        {
            title: 'Total Revenue',
            value: `${currency} ${Number(totalRevenue).toLocaleString()}`,
            subtitle: reports?.trendRevenue != null ? `${reports.trendRevenue >= 0 ? '+' : ''}${reports.trendRevenue}% from last period` : null,
            icon: Wallet,
            iconBg: 'bg-primary',
            hero: true,
        },
        {
            title: 'Commission Earned',
            value: `${currency} ${Number(commissionEarned).toLocaleString()}`,
            subtitle: reports?.trendCommission != null ? `${reports.trendCommission >= 0 ? '+' : ''}${reports.trendCommission}% growth` : null,
            icon: TrendingUp,
            iconBg: 'bg-primary',
        },
        {
            title: 'Pending Payouts',
            value: `${currency} ${Number(pendingPayoutsAmount).toLocaleString()}`,
            subtitle: `${pendingPayoutsDoctorCount} doctors pending`,
            icon: Clock,
            iconBg: 'bg-brand-gold',
        },
    ];

    if (loading) {
        return (
            <div className="space-y-8 animate-fade-in">
                <div className="h-28 bg-gradient-to-r from-primary/10 to-transparent rounded-2xl animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-40 bg-surface rounded-2xl animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                    ))}
                </div>
                <div className="h-[420px] bg-surface rounded-2xl animate-pulse" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-slide-up">
            {/* Header */}
            <div className="relative overflow-hidden rounded-2xl bg-card border border-border px-6 py-7">
                <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">Earnings Reports</h1>
                        <p className="text-brand-gold mt-2 font-medium">Revenue and payout analytics at a glance</p>
                         
                    </div>
                    {lastUpdated && (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-border">
                            <Clock size={16} className="text-primary" />
                            <span className="text-sm font-medium text-muted-foreground">
                                Updated {new Date(lastUpdated).toLocaleTimeString()}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 hover:shadow-card gap-6">
                {statCards.map((card) => (
                    <StatCard key={card.title} {...card} hero={card.hero} />
                ))}
            </div>

            {/* Chart */}
            <Card className="overflow-hidden border-primary/20 hover:shadow-card hover:border-primary/30 transition-colors">
                <CardHeader className="border-b border-border">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xl flex items-center gap-2 text-[#004d4d]">
                            <BarChart3 size={22} className="text-primary" />
                            Revenue Analytics
                        </CardTitle>
                        <span className="text-xs font-semibold text-primary bg-primary/20 px-3 py-1 rounded-lg">{currency}</span>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="h-[380px] min-h-[300px] w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={300}>
                            <AreaChart data={data.length ? data : [{ name: '—', amount: 0 }]}>
                                <defs>
                                    <linearGradient id="earningsAreaGradient" x1="0" y1="0" x2="0" y2="1">
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
                                    formatter={(val) => [`${currency} ${Number(val).toLocaleString()}`, 'Revenue']}
                                />
                                <Area type="monotone" dataKey="amount" stroke="#00796b" strokeWidth={2} fill="url(#earningsAreaGradient)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
