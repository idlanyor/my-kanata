import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Ticket, Plus, Trash2, Copy, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { Card, Button, Pill, Input, FormField } from '../components/ui';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import NoticeModal from '../components/NoticeModal';
import { useModalFeedback } from '../hooks/useModalFeedback';

const Vouchers = () => {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [showCreate, setShowCreate] = useState(false);
  const [showBatch, setShowBatch] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { notice, showNotice, closeNotice } = useModalFeedback();
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({ code: '', value: 0, quota: 1, isPublic: false, expiredAt: '' });
  const [batchForm, setBatchForm] = useState({ count: 5, value: 0, quota: 1, isPublic: false, prefix: 'PROMO', expiredAt: '' });

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/vouchers', { params: { page, limit: 20 } });
      setVouchers(data.vouchers || []);
      setPagination(data.pagination || { page: 1, pages: 1, total: 0 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVouchers(); }, [page]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/api/vouchers', form);
      showNotice({ title: 'Berhasil', message: 'Voucher created.', tone: 'success' });
      setShowCreate(false);
      setForm({ code: '', value: 0, quota: 1, isPublic: false, expiredAt: '' });
      fetchVouchers();
    } catch (err) {
      showNotice({ title: 'Error', message: err.response?.data?.error || err.message, tone: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleBatch = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const { data } = await api.post('/api/vouchers/batch', batchForm);
      showNotice({ title: 'Berhasil', message: `${data.created} vouchers generated.`, tone: 'success' });
      setShowBatch(false);
      fetchVouchers();
    } catch (err) {
      showNotice({ title: 'Error', message: err.response?.data?.error || err.message, tone: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/api/vouchers/${deleteTarget._id}`);
      showNotice({ title: 'Deleted', message: `Voucher ${deleteTarget.code} deleted.`, tone: 'success' });
      setDeleteTarget(null);
      fetchVouchers();
    } catch (err) {
      showNotice({ title: 'Error', message: err.response?.data?.error || err.message, tone: 'error' });
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    showNotice({ title: 'Copied', message: `${code} copied to clipboard.`, tone: 'success' });
  };

  const isExpired = (v) => v.expiredAt && new Date(v.expiredAt) < new Date();
  const isUsedUp = (v) => v.usedBy?.length >= v.quota;

  return (
    <>
      <div className="space-y-4 pb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--bg-card)] p-4 rounded-lg border border-[var(--border-color)] shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/10 text-accent rounded-lg flex items-center justify-center border border-accent/20">
              <Ticket size={20} />
            </div>
            <div>
              <h1 className="heading-primary">Voucher Management</h1>
              <p className="heading-secondary">{pagination.total} vouchers</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowBatch(true)}><Plus size={14} /> Batch</Button>
            <Button variant="primary" onClick={() => setShowCreate(true)}><Plus size={14} /> Create</Button>
          </div>
        </div>

        <Card>
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-[var(--bg-main)] rounded-lg animate-pulse" />)}
            </div>
          ) : vouchers.length === 0 ? (
            <div className="p-12 text-center">
              <Ticket size={40} className="mx-auto mb-3 text-[var(--text-secondary)] opacity-30" />
              <p className="text-sm text-[var(--text-secondary)]">No vouchers yet</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-color)]">
              {vouchers.map((v) => (
                <div key={v._id} className="p-4 flex items-center gap-4 hover:bg-[var(--bg-main)]/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-sm font-bold text-[var(--text-primary)]">{v.code}</code>
                      <button onClick={() => copyCode(v.code)} className="text-[var(--text-secondary)] hover:text-accent">
                        <Copy size={12} />
                      </button>
                      {isExpired(v) && <Pill tone="danger">Expired</Pill>}
                      {isUsedUp(v) && <Pill tone="warning">Used Up</Pill>}
                      {v.isPublic && <Pill tone="neutral">Public</Pill>}
                    </div>
                    <div className="flex gap-4 mt-1 text-[10px] text-[var(--text-secondary)]">
                      <span>Value: <b>Rp {new Intl.NumberFormat('id-ID').format(v.value)}</b></span>
                      <span>Used: <b>{v.usedBy?.length || 0}/{v.quota}</b></span>
                      {v.expiredAt && <span>Expires: {new Date(v.expiredAt).toLocaleDateString('id-ID')}</span>}
                    </div>
                  </div>
                  <Button size="sm" variant="danger" onClick={() => setDeleteTarget(v)}>
                    <Trash2 size={12} />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-color)]">
              <span className="text-[10px] text-[var(--text-secondary)] font-bold">Page {pagination.page} of {pagination.pages}</span>
              <div className="flex gap-1">
                <Button size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={14} /></Button>
                <Button size="sm" disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)}><ChevronRight size={14} /></Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {showCreate && (
        <Modal title="Create Voucher" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-3">
            <FormField label="Code">
              <Input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="PROMO2026" required />
            </FormField>
            <FormField label="Value (Rp)">
              <Input type="number" value={form.value} onChange={(e) => setForm((p) => ({ ...p, value: Number(e.target.value) }))} required min={1} />
            </FormField>
            <FormField label="Quota">
              <Input type="number" value={form.quota} onChange={(e) => setForm((p) => ({ ...p, quota: Number(e.target.value) }))} min={1} />
            </FormField>
            <FormField label="Expired At">
              <Input type="date" value={form.expiredAt} onChange={(e) => setForm((p) => ({ ...p, expiredAt: e.target.value }))} />
            </FormField>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={form.isPublic} onChange={(e) => setForm((p) => ({ ...p, isPublic: e.target.checked }))} />
              Public voucher
            </label>
            <Button type="submit" variant="primary" disabled={creating} className="w-full">{creating ? 'Creating...' : 'Create Voucher'}</Button>
          </form>
        </Modal>
      )}

      {showBatch && (
        <Modal title="Batch Generate Vouchers" onClose={() => setShowBatch(false)}>
          <form onSubmit={handleBatch} className="space-y-3">
            <FormField label="Prefix">
              <Input value={batchForm.prefix} onChange={(e) => setBatchForm((p) => ({ ...p, prefix: e.target.value.toUpperCase() }))} placeholder="PROMO" />
            </FormField>
            <FormField label="Count">
              <Input type="number" value={batchForm.count} onChange={(e) => setBatchForm((p) => ({ ...p, count: Number(e.target.value) }))} min={1} max={100} />
            </FormField>
            <FormField label="Value (Rp)">
              <Input type="number" value={batchForm.value} onChange={(e) => setBatchForm((p) => ({ ...p, value: Number(e.target.value) }))} required min={1} />
            </FormField>
            <FormField label="Quota per voucher">
              <Input type="number" value={batchForm.quota} onChange={(e) => setBatchForm((p) => ({ ...p, quota: Number(e.target.value) }))} min={1} />
            </FormField>
            <FormField label="Expired At">
              <Input type="date" value={batchForm.expiredAt} onChange={(e) => setBatchForm((p) => ({ ...p, expiredAt: e.target.value }))} />
            </FormField>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={batchForm.isPublic} onChange={(e) => setBatchForm((p) => ({ ...p, isPublic: e.target.checked }))} />
              Public vouchers
            </label>
            <Button type="submit" variant="primary" disabled={creating} className="w-full">{creating ? 'Generating...' : 'Generate Batch'}</Button>
          </form>
        </Modal>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Voucher"
        message={`Delete voucher "${deleteTarget?.code}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <NoticeModal open={notice.open} title={notice.title} message={notice.message} tone={notice.tone} onClose={closeNotice} />
    </>
  );
};

export default Vouchers;
