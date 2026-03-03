import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Users, Server, UsersRound, Coins, ArrowRight, Activity, Clock, Banknote, Shield, Wifi, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, Card, Pill } from '../components/ui';
import { useSocket } from '../context/SocketContext';

const StatCard = ({ title, value, icon: Icon, color, bg, darkBg, darkColor }) => (
  <Card className="p-4 flex items-center gap-4 hover:bg-accent/[0.01]">
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bg} ${color} ${darkBg} ${darkColor} border border-current/10`}>
      <Icon size={20} />
    </div>
    <div>
      <h3 className="heading-secondary">{title}</h3>
      <p className="text-lg font-bold text-[var(--text-primary)] mt-0.5">{value}</p>
    </div>
  </Card>
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState(null);
  const [botHealth, setBotHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [realtime, setRealtime] = useState({ updatedAt: '' });
  const [loadSeries, setLoadSeries] = useState([]);
  const socket = useSocket();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, activityRes, healthRes] = await Promise.all([
          api.get('/api/stats/dashboard'),
          api.get('/api/stats/activity', { params: { limit: 10 } }).catch(() => ({ data: null })),
          api.get('/api/bot/health').catch(() => ({ data: null }))
        ]);
        setStats(statsRes.data);
        setActivity(activityRes.data);
        setBotHealth(healthRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onMetrics = (payload) => {
      setRealtime(payload || { updatedAt: '' });
      setLoadSeries((prev) => {
        const next = [...prev, Number(payload?.load1 || 0)];
        return next.slice(-20);
      });
    };

    const onBotHealth = (data) => {
      setBotHealth((prev) => ({ ...prev, ...data }));
    };

    socket.on('ui:vps-metrics', onMetrics);
    socket.on('ui:bot-health', onBotHealth);
    return () => {
      socket.off('ui:vps-metrics', onMetrics);
      socket.off('ui:bot-health', onBotHealth);
    };
  }, [socket]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-40 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]" />
          <div className="h-40 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={stats?.summary.users} icon={Users} color="text-blue-600" bg="bg-blue-50" darkBg="dark:bg-blue-500/10" darkColor="dark:text-blue-400" />
        <StatCard title="Active Servers" value={stats?.summary.servers} icon={Server} color="text-amber-600" bg="bg-amber-50" darkBg="dark:bg-amber-500/10" darkColor="dark:text-amber-400" />
        <StatCard title="Total Groups" value={stats?.summary.groups} icon={UsersRound} color="text-emerald-600" bg="bg-emerald-50" darkBg="dark:bg-emerald-500/10" darkColor="dark:text-emerald-400" />
        <StatCard title="Revenue" value={`Rp ${new Intl.NumberFormat('id-ID').format(stats?.summary.revenue || 0)}`} icon={Coins} color="text-violet-600" bg="bg-violet-50" darkBg="dark:bg-violet-500/10" darkColor="dark:text-violet-400" />
      </div>

      {/* Bot Health + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="heading-primary">Bot Status</h2>
            <Pill tone={botHealth?.wsConnected ? 'success' : 'danger'}>
              {botHealth?.wsConnected ? 'Connected' : 'Offline'}
            </Pill>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MiniStat
              icon={botHealth?.wsConnected ? Wifi : WifiOff}
              label="Status"
              value={botHealth?.status || 'unknown'}
            />
            <MiniStat
              icon={Clock}
              label="Uptime"
              value={botHealth?.uptime ? formatUptime(botHealth.uptime) : '-'}
            />
            <MiniStat
              icon={Activity}
              label="Commands Today"
              value={stats?.todayCounters?.commands || 0}
            />
            <MiniStat
              icon={Activity}
              label="Messages Today"
              value={stats?.todayCounters?.messages || 0}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <QuickLink to="/runtime" label="Live Console" />
            <QuickLink to="/send-message" label="Send Message" />
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="heading-primary mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <QuickLink to="/runtime" label="Bot Runtime" />
            <QuickLink to="/settings" label="System Settings" />
            <QuickLink to="/analytics" label="Revenue Analytics" />
            <QuickLink to="/audit-logs" label="Audit Logs" />
            <QuickLink to="/vouchers" label="Voucher Manager" />
            <QuickLink to="/broadcast" label="Broadcast" />
          </div>
        </Card>
      </div>

      {/* Daily Stats Chart */}
      {stats?.dailyStats?.length > 0 && (
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="heading-primary">Weekly Trend</h2>
            <Link to="/analytics" className="text-[10px] text-accent font-bold hover:underline">View All</Link>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {stats.dailyStats.map((d) => {
              const maxNew = Math.max(...stats.dailyStats.map((s) => s.newUsers || 0), 1);
              const h = Math.max(8, ((d.newUsers || 0) / maxNew) * 60);
              return (
                <div key={d.date} className="flex flex-col items-center gap-1" title={`${d.date}: ${d.newUsers} new users, ${d.commands} cmds`}>
                  <div className="w-full bg-accent/20 rounded-t transition-all" style={{ height: `${h}px` }} />
                  <span className="text-[8px] text-[var(--text-secondary)] font-bold">{d.date.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Activity Feed + VPS Realtime */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Feed */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="heading-primary flex items-center gap-2"><Shield size={14} /> Recent Activity</h2>
            <Link to="/audit-logs" className="text-[10px] text-accent font-bold hover:underline">View All</Link>
          </div>
          {activity?.recentLogs?.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {activity.recentLogs.slice(0, 8).map((log) => (
                <div key={log._id} className="p-2 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-accent">{log.action}</span>
                    <span className="text-[9px] text-[var(--text-secondary)]">{timeAgo(log.createdAt)}</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-secondary)]">{log.adminJid?.split('@')[0] || '?'}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-[var(--text-secondary)] text-center py-4">No recent activity</p>
          )}

          {activity?.recentTransactions?.length > 0 && (
            <>
              <div className="flex items-center justify-between mt-4 mb-2">
                <h3 className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1"><Banknote size={12} /> Recent Transactions</h3>
              </div>
              <div className="space-y-1.5">
                {activity.recentTransactions.slice(0, 5).map((tx) => (
                  <div key={tx._id} className="flex items-center justify-between p-2 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)]">
                    <div>
                      <span className="text-[10px] font-bold text-[var(--text-primary)]">Rp {new Intl.NumberFormat('id-ID').format(tx.amount)}</span>
                      <span className="text-[9px] text-[var(--text-secondary)] ml-2">{tx.description || tx.type}</span>
                    </div>
                    <Pill tone={tx.status === 'success' ? 'success' : tx.status === 'failed' ? 'danger' : 'warning'}>
                      {tx.status}
                    </Pill>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* VPS Realtime */}
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="heading-primary">VPS Realtime</h2>
            <span className="text-[10px] font-bold text-[var(--text-secondary)]">
              {socket?.connected ? 'WS Connected' : 'WS Disconnected'}
            </span>
          </div>
          {!realtime.updatedAt ? (
            <p className="text-[11px] text-[var(--text-secondary)]">Belum ada data realtime VPS.</p>
          ) : (
            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-3">
              <p className="text-xs font-bold text-[var(--text-primary)]">{realtime.hostname || '-'}</p>
              <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{realtime.platform || '-'}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3 text-[10px] font-semibold text-[var(--text-secondary)]">
                <span>CPU Core: {realtime.cpuCount || '-'}</span>
                <span>Load 1m: {Number(realtime.load1 || 0).toFixed(2)}</span>
                <span>Load 5m: {Number(realtime.load5 || 0).toFixed(2)}</span>
                <span>RAM Used: {formatBytes(realtime.memoryUsedBytes)}</span>
                <span>RAM Total: {formatBytes(realtime.memoryTotalBytes)}</span>
                <span>Disk Used: {formatBytes(realtime.diskUsedBytes)}</span>
                <span>Disk Total: {formatBytes(realtime.diskTotalBytes)}</span>
                <span>Uptime: {formatUptimeSec(realtime.uptimeSec)}</span>
              </div>
              <div className="mt-3 space-y-2">
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] mb-1">Load (1m) Trend</p>
                  <Sparkline data={loadSeries} />
                </div>
                <MetricBar label="RAM" used={Number(realtime.memoryUsedBytes || 0)} total={Number(realtime.memoryTotalBytes || 0)} toneClass="bg-sky-500" />
                <MetricBar label="Disk" used={Number(realtime.diskUsedBytes || 0)} total={Number(realtime.diskTotalBytes || 0)} toneClass="bg-amber-500" />
              </div>
            </div>
          )}
          <p className="mt-3 text-[10px] text-[var(--text-secondary)]">Last update: {realtime.updatedAt ? new Date(realtime.updatedAt).toLocaleString('id-ID') : '-'}</p>
        </Card>
      </div>
    </div>
  );
};

// Helpers
const formatBytes = (value = 0) => {
  const b = Number(value || 0);
  if (b <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let n = b;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i += 1; }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const formatUptimeSec = (sec = 0) => {
  const total = Math.floor(Number(sec || 0));
  if (total <= 0) return '-';
  const d = Math.floor(total / 86400);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (d > 0) return `${d}d ${h % 24}h`;
  return `${h}h ${m}m`;
};

const formatUptime = (start) => {
  const ms = Date.now() - new Date(start).getTime();
  if (ms <= 0) return '-';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  return `${hours}h ${minutes}m`;
};

const timeAgo = (dateStr) => {
  const ms = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const MiniStat = ({ icon: Icon, label, value }) => (
  <div className="p-3 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)]">
    <div className="flex items-center gap-2 mb-1">
      <Icon size={12} className="text-[var(--text-secondary)]" />
      <span className="text-[9px] font-black uppercase tracking-wider text-[var(--text-secondary)]">{label}</span>
    </div>
    <p className="text-sm font-bold text-[var(--text-primary)]">{value}</p>
  </div>
);

const QuickLink = ({ to, label }) => (
  <Link to={to} className="p-3 bg-[var(--bg-main)] hover:bg-[var(--border-color)] rounded-lg flex items-center justify-between group transition-all border border-[var(--border-color)]">
    <span className="text-xs font-bold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors uppercase tracking-wider">{label}</span>
    <ArrowRight size={16} className="text-[var(--text-secondary)] group-hover:translate-x-1 transition-transform" />
  </Link>
);

const Sparkline = ({ data = [] }) => {
  const width = 280;
  const height = 48;
  const values = data.length ? data : [0];
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="rounded border border-[var(--border-color)] bg-[var(--bg-card)] p-1">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-12">
        <polyline fill="none" stroke="var(--color-accent)" strokeWidth="2" points={points} />
      </svg>
    </div>
  );
};

const MetricBar = ({ label, used = 0, total = 0, toneClass = 'bg-sky-500' }) => {
  const pct = total > 0 ? Math.min(100, Math.max(0, (used / total) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] font-bold text-[var(--text-secondary)] mb-1">
        <span>{label}</span>
        <span>{pct.toFixed(1)}%</span>
      </div>
      <div className="h-2 rounded bg-[var(--border-color)] overflow-hidden">
        <div className={`h-full ${toneClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

export default Dashboard;
