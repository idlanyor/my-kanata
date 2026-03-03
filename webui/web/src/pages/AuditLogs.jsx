import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { Shield, Search, Filter, ChevronLeft, ChevronRight, Clock, User, Activity } from 'lucide-react';
import { Card, Button, Pill, Input } from '../components/ui';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [actions, setActions] = useState([]);
  const [filters, setFilters] = useState({ search: '', action: '', from: '', to: '' });
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filters.search) params.search = filters.search;
      if (filters.action) params.action = filters.action;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;

      const { data } = await api.get('/api/stats/audit-logs', { params });
      setLogs(data.logs || []);
      setPagination(data.pagination || { page: 1, pages: 1, total: 0 });
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    api.get('/api/stats/audit-actions').then(({ data }) => setActions(data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
  };

  const actionTone = (action) => {
    if (action?.includes('DELETE') || action?.includes('STOP') || action?.includes('KICK')) return 'danger';
    if (action?.includes('CREATE') || action?.includes('START') || action?.includes('ADD')) return 'success';
    if (action?.includes('UPDATE') || action?.includes('CHANGE')) return 'warning';
    return 'neutral';
  };

  return (
    <div className="space-y-4 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--bg-card)] p-4 rounded-lg border border-[var(--border-color)] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent/10 text-accent rounded-lg flex items-center justify-center border border-accent/20">
            <Shield size={20} />
          </div>
          <div>
            <h1 className="heading-primary">Audit Logs</h1>
            <p className="heading-secondary">{pagination.total} total entries</p>
          </div>
        </div>
      </div>

      <Card className="p-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <Input
              value={filters.search}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              placeholder="Search by action or admin..."
              className="pl-9"
            />
          </div>
          <select
            value={filters.action}
            onChange={(e) => { setFilters((p) => ({ ...p, action: e.target.value })); setPage(1); }}
            className="px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-xs outline-none focus:ring-1 focus:ring-accent/50"
          >
            <option value="">All Actions</option>
            {actions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <Input
            type="date"
            value={filters.from}
            onChange={(e) => { setFilters((p) => ({ ...p, from: e.target.value })); setPage(1); }}
            className="w-36"
          />
          <Input
            type="date"
            value={filters.to}
            onChange={(e) => { setFilters((p) => ({ ...p, to: e.target.value })); setPage(1); }}
            className="w-36"
          />
          <Button type="submit" variant="primary">
            <Filter size={14} /> Filter
          </Button>
        </form>
      </Card>

      <Card>
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 bg-[var(--bg-main)] rounded-lg animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <Shield size={40} className="mx-auto mb-3 text-[var(--text-secondary)] opacity-30" />
            <p className="text-sm text-[var(--text-secondary)]">No audit logs found</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-color)]">
            {logs.map((log) => (
              <div key={log._id} className="p-4 hover:bg-[var(--bg-main)]/50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--bg-main)] flex items-center justify-center text-[var(--text-secondary)] shrink-0 border border-[var(--border-color)]">
                    <Activity size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Pill tone={actionTone(log.action)}>{log.action}</Pill>
                      <span className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1">
                        <User size={10} />
                        {log.adminJid?.split('@')[0] || 'unknown'}
                      </span>
                    </div>
                    {log.details && (
                      <p className="text-[11px] text-[var(--text-secondary)] mt-1 truncate max-w-lg">
                        {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[var(--text-secondary)] opacity-60">
                      <span className="flex items-center gap-1"><Clock size={10} />{new Date(log.createdAt).toLocaleString('id-ID')}</span>
                      {log.ip && <span>{log.ip}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-color)]">
            <span className="text-[10px] text-[var(--text-secondary)] font-bold">
              Page {pagination.page} of {pagination.pages}
            </span>
            <div className="flex gap-1">
              <Button
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={14} />
              </Button>
              <Button
                size="sm"
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AuditLogs;
