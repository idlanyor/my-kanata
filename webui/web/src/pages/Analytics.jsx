import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { BarChart3, TrendingUp, Download } from 'lucide-react';
import { Card, Button, Pill } from '../components/ui';

const Analytics = () => {
  const [revenue, setRevenue] = useState([]);
  const [breakdown, setBreakdown] = useState([]);
  const [dailyStats, setDailyStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [revenueRes, dailyRes] = await Promise.all([
          api.get('/api/stats/revenue', { params: { months: 6 } }),
          api.get('/api/stats/daily', { params: { days: 30 } })
        ]);
        setRevenue(revenueRes.data.monthlyRevenue || []);
        setBreakdown(revenueRes.data.planBreakdown || []);
        setDailyStats(dailyRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const exportCSV = () => {
    const headers = ['Month', 'Revenue', 'Transactions'];
    const rows = revenue.map((r) => [r._id, r.total, r.count]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'revenue-analytics.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const maxRevenue = Math.max(...revenue.map((r) => r.total), 1);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-20 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]" />
        <div className="h-64 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--bg-card)] p-4 rounded-lg border border-[var(--border-color)] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent/10 text-accent rounded-lg flex items-center justify-center border border-accent/20">
            <BarChart3 size={20} />
          </div>
          <div>
            <h1 className="heading-primary">Revenue Analytics</h1>
            <p className="heading-secondary">Financial overview & trends</p>
          </div>
        </div>
        <Button onClick={exportCSV}><Download size={14} /> Export CSV</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-2">
          <h2 className="heading-primary mb-4 flex items-center gap-2">
            <TrendingUp size={16} /> Monthly Revenue
          </h2>
          {revenue.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] text-center py-8">No revenue data</p>
          ) : (
            <div className="space-y-2">
              {revenue.map((r) => (
                <div key={r._id} className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] w-16 shrink-0">{r._id}</span>
                  <div className="flex-1 h-6 bg-[var(--bg-main)] rounded-md overflow-hidden border border-[var(--border-color)]">
                    <div
                      className="h-full bg-accent/20 rounded-md flex items-center px-2"
                      style={{ width: `${Math.max(2, (r.total / maxRevenue) * 100)}%` }}
                    >
                      <span className="text-[10px] font-bold text-accent whitespace-nowrap">
                        Rp {new Intl.NumberFormat('id-ID').format(r.total)}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-[var(--text-secondary)] w-8 text-right">{r.count}tx</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="heading-primary mb-4">Revenue by Plan</h2>
          {breakdown.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] text-center py-8">No data</p>
          ) : (
            <div className="space-y-3">
              {breakdown.map((b, i) => (
                <div key={i} className="p-3 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)]">
                  <p className="text-xs font-bold text-[var(--text-primary)] truncate">{b._id || 'Unknown'}</p>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-[var(--text-secondary)]">{b.count} transactions</span>
                    <span className="text-[10px] font-bold text-accent">Rp {new Intl.NumberFormat('id-ID').format(b.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="heading-primary mb-4">Daily Stats (Last 30 Days)</h2>
        {dailyStats.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)] text-center py-8">No data collected yet</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {dailyStats.map((d) => {
                const maxU = Math.max(...dailyStats.map((s) => s.newUsers || 0), 1);
                const h = Math.max(4, ((d.newUsers || 0) / maxU) * 60);
                return (
                  <div key={d.date} className="flex flex-col items-center gap-1 group relative" title={`${d.date}: ${d.newUsers} new users, ${d.commands} commands, Rp ${d.revenue}`}>
                    <div className="w-3 bg-accent/30 rounded-t" style={{ height: `${h}px` }} />
                    <span className="text-[8px] text-[var(--text-secondary)] -rotate-45 origin-top-left w-8">{d.date.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Analytics;
