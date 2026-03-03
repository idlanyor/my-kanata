import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  RefreshCw,
  Play,
  RotateCcw,
  Ban,
  Calendar,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Server as ServerIcon
} from 'lucide-react';
import { clsx } from 'clsx';
import Modal from '../components/Modal';
import NoticeModal from '../components/NoticeModal';
import ConfirmModal from '../components/ConfirmModal';
import { useModalFeedback } from '../hooks/useModalFeedback';
import { Button, Card, CardFooter, Input, Table, TableWrap, TBody, Td, THead, Th } from '../components/ui';

const Servers = () => {
  const { hasPermission } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const { notice, showNotice, closeNotice, confirmState, openConfirm, closeConfirm, executeConfirm } = useModalFeedback();
  const [expiryModal, setExpiryModal] = useState({ open: false, id: '', value: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get(`/api/data/servers?page=${page}&search=${search}`);
      setData(res.data);
      setPagination(res.pagination);
    } catch (err) {
      showNotice({ title: 'Fetch Gagal', message: err.response?.data?.error || err.message, tone: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, search]);

  const requirePermission = (permission) => {
    if (hasPermission(permission)) return true;
    showNotice({ title: 'Akses Ditolak', message: 'Kamu tidak punya izin untuk aksi ini.', tone: 'error' });
    return false;
  };

  const handleSync = () => {
    if (!requirePermission('servers.sync')) return;
    openConfirm({
      title: 'Sync Servers',
      message: 'Sync servers dari panel Pterodactyl sekarang?',
      confirmLabel: 'Sync',
      onConfirm: async () => {
        const { data: res } = await api.post('/api/servers/sync');
        await fetchData();
        showNotice({ title: 'Sync Selesai', message: `Berhasil menambahkan ${res.addedCount} server baru.`, tone: 'success' });
      }
    });
  };

  const openExpiryModal = (id, currentVal) => {
    if (!requirePermission('servers.update')) return;
    const currentDate = new Date(currentVal).toISOString().split('T')[0];
    setExpiryModal({ open: true, id, value: currentDate });
  };

  const submitExpiry = async () => {
    const parsedDate = new Date(expiryModal.value);
    if (Number.isNaN(parsedDate.getTime())) {
      showNotice({ title: 'Tanggal Invalid', message: 'Format tanggal harus YYYY-MM-DD.', tone: 'error' });
      return;
    }

    try {
      await api.patch(`/api/servers/${expiryModal.id}`, {
        expiredAt: parsedDate.toISOString(),
        status: 'active'
      });
      setExpiryModal({ open: false, id: '', value: '' });
      await fetchData();
      showNotice({ title: 'Berhasil', message: 'Tanggal expired berhasil diperbarui.', tone: 'success' });
    } catch (err) {
      showNotice({ title: 'Update Gagal', message: err.response?.data?.error || err.message, tone: 'error' });
    }
  };

  const toggleSuspend = async (id) => {
    if (!requirePermission('servers.suspend')) return;
    try {
      await api.post(`/api/servers/${id}/suspend-toggle`);
      await fetchData();
      showNotice({ title: 'Berhasil', message: 'Status suspend berhasil diubah.', tone: 'success' });
    } catch (err) {
      showNotice({ title: 'Aksi Gagal', message: err.response?.data?.error || err.message, tone: 'error' });
    }
  };

  const controlPower = async (identifier, signal) => {
    if (!requirePermission('servers.power')) return;
    try {
      await api.post(`/api/servers/${identifier}/power`, { signal });
      showNotice({ title: 'Signal Terkirim', message: `Signal ${signal} berhasil dikirim ke server.`, tone: 'success' });
    } catch (err) {
      showNotice({ title: 'Control Gagal', message: err.response?.data?.error || err.message, tone: 'error' });
    }
  };

  const deleteItem = (id) => {
    if (!requirePermission('servers.delete')) return;
    openConfirm({
      title: 'Hapus Server',
      message: 'Hapus server ini dari database?',
      confirmLabel: 'Hapus',
      onConfirm: async () => {
        await api.delete(`/api/servers/${id}`);
        await fetchData();
        showNotice({ title: 'Berhasil', message: 'Server berhasil dihapus.', tone: 'success' });
      }
    });
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--bg-card)] p-4 rounded-lg border border-[var(--border-color)] shadow-sm">
          <div>
            <h1 className="heading-primary">Server Management</h1>
            <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider opacity-60">Manage Pterodactyl Instances</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSync} variant="success" disabled={!hasPermission('servers.sync')}>
              <RefreshCw size={14} /> Sync Panel
            </Button>
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] opacity-50" size={14} />
              <Input
                type="text"
                placeholder="Search..."
                className="pl-9 pr-4 w-48 lg:w-64"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>
        </div>

        <Card className="overflow-hidden">
          <TableWrap>
            <Table>
              <THead>
                <tr className="bg-[var(--bg-main)]/50 border-b border-[var(--border-color)]">
                  <Th>Customer</Th>
                  <Th>Technical</Th>
                  <Th>Status</Th>
                  <Th>Expiration</Th>
                  <Th>Price</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </THead>
              <TBody>
                {loading ? (
                  <tr><Td colSpan="6" className="py-12 text-center text-[var(--text-secondary)] font-bold italic opacity-50">Loading servers...</Td></tr>
                ) : data.length === 0 ? (
                  <tr><Td colSpan="6" className="py-12 text-center text-[var(--text-secondary)] font-bold italic opacity-50">No servers found.</Td></tr>
                ) : data.map((srv) => {
                  const expiryDate = new Date(srv.expiredAt);
                  const now = new Date();
                  const diffDays = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
                  const isExpired = diffDays < 0;

                  return (
                    <tr key={srv._id} className="hover:bg-accent/[0.02] transition-colors group">
                      <Td>
                        <div className="font-bold text-[var(--text-primary)] text-sm">{srv.userName || srv.userId.split('@')[0]}</div>
                        <div className="text-[10px] text-[var(--text-secondary)] font-medium opacity-60">{srv.userId}</div>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <ServerIcon size={12} className="text-accent" />
                          <span className="font-bold text-xs text-[var(--text-primary)]">{srv.planName}</span>
                        </div>
                        <div className="text-[10px] text-[var(--text-secondary)] mt-1">
                          {srv.product?.name ? `Product: ${srv.product.name}` : `Service: ${srv.serviceType || 'pterodactyl'}`} • {srv.billingCycle || 'monthly'}
                        </div>
                        <code className="text-[9px] font-bold bg-[var(--bg-main)] px-1.5 py-0.5 rounded text-[var(--text-secondary)] border border-[var(--border-color)] mt-1 inline-block">{srv.identifier}</code>
                      </Td>
                      <Td>
                        <span className={clsx('badge', srv.status === 'active' ? 'badge-success' : (srv.status === 'suspended' ? 'badge-danger' : 'badge-warning'))}>
                          {srv.status}
                        </span>
                      </Td>
                      <Td>
                        <div className={clsx('font-bold text-xs', diffDays <= 3 ? 'text-red-500' : (diffDays <= 7 ? 'text-amber-500' : 'text-[var(--text-primary)]'))}>
                          {expiryDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                        <div className="text-[10px] font-bold text-[var(--text-secondary)] opacity-50">
                          {isExpired ? 'EXPIRED' : `${diffDays} DAYS LEFT`}
                        </div>
                      </Td>
                      <Td className="font-black text-sm text-[var(--text-primary)]">Rp {new Intl.NumberFormat('id-ID').format(srv.price)}</Td>
                      <Td className="text-right">
                        <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          {hasPermission('servers.power') && <IconButton onClick={() => controlPower(srv.identifier, 'start')} className="hover:text-emerald-500 hover:bg-emerald-500/10 hover:border-emerald-500/20" title="Start"><Play size={16} /></IconButton>}
                          {hasPermission('servers.power') && <IconButton onClick={() => controlPower(srv.identifier, 'restart')} className="hover:text-sky-500 hover:bg-sky-500/10 hover:border-sky-500/20" title="Restart"><RotateCcw size={16} /></IconButton>}
                          {hasPermission('servers.suspend') && <IconButton onClick={() => toggleSuspend(srv._id)} className="hover:text-amber-500 hover:bg-amber-500/10 hover:border-amber-500/20" title="Suspend"><Ban size={16} /></IconButton>}
                          {hasPermission('servers.update') && <IconButton onClick={() => openExpiryModal(srv._id, srv.expiredAt)} className="hover:text-indigo-500 hover:bg-indigo-500/10 hover:border-indigo-500/20" title="Set Expiry"><Calendar size={16} /></IconButton>}
                          {hasPermission('servers.delete') && <IconButton onClick={() => deleteItem(srv._id)} className="hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/20" title="Delete"><Trash2 size={16} /></IconButton>}
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </TBody>
            </Table>
          </TableWrap>

          <CardFooter className="px-6 py-3 flex items-center justify-between">
            <p className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60 uppercase tracking-widest">Page {pagination.page} / {pagination.pages}</p>
            <div className="flex gap-2">
              <Button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="p-1.5"><ChevronLeft size={16} /></Button>
              <Button disabled={page === pagination.pages} onClick={() => setPage((p) => p + 1)} className="p-1.5"><ChevronRight size={16} /></Button>
            </div>
          </CardFooter>
        </Card>
      </div>

      <NoticeModal open={notice.open} title={notice.title} message={notice.message} tone={notice.tone} onClose={closeNotice} />

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        loading={confirmState.loading}
        onCancel={closeConfirm}
        onConfirm={executeConfirm}
      />

      <Modal open={expiryModal.open} onClose={() => setExpiryModal({ open: false, id: '', value: '' })} widthClass="max-w-md">
        <div className="space-y-4">
          <h3 className="text-sm font-black text-[var(--text-primary)]">Set Tanggal Expired</h3>
          <Input type="date" value={expiryModal.value} onChange={(e) => setExpiryModal((prev) => ({ ...prev, value: e.target.value }))} />
          <div className="flex justify-end gap-2">
            <Button onClick={() => setExpiryModal({ open: false, id: '', value: '' })}>Batal</Button>
            <Button variant="primary" onClick={submitExpiry}>Simpan</Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

const IconButton = ({ className, ...props }) => (
  <button
    className={clsx('p-1.5 text-[var(--text-secondary)] rounded border border-transparent transition-all', className)}
    {...props}
  />
);

export default Servers;
