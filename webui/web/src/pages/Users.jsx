import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Users as UsersIcon,
  Search,
  UserCircle,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Mail,
  Link2,
  UserPlus,
  BadgeDollarSign,
  BadgeInfo
} from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '../components/Modal';
import NoticeModal from '../components/NoticeModal';
import ConfirmModal from '../components/ConfirmModal';
import { useModalFeedback } from '../hooks/useModalFeedback';
import { Button, Card, CardFooter, FormField, Input, Pill, Table, TableWrap, TBody, Td, THead, Th } from '../components/ui';

const emptyActionForm = { jid: '', email: '', amount: '', name: '' };

const Users = () => {
  const { user, hasPermission } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [working, setWorking] = useState(false);
  const [form, setForm] = useState(emptyActionForm);
  const {
    notice,
    showNotice,
    closeNotice,
    confirmState,
    openConfirm,
    closeConfirm,
    executeConfirm
  } = useModalFeedback();
  const [actionModal, setActionModal] = useState({
    open: false,
    mode: 'register',
    payload: emptyActionForm,
    targetName: ''
  });
  const [profileModal, setProfileModal] = useState({ open: false, loading: false, data: null });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get(`/api/data/users?page=${page}&search=${search}`);
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

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const fillFromUser = (target) => {
    if (!target) return;
    setForm((prev) => ({
      ...prev,
      jid: target.jid || prev.jid,
      email: target.emailCloud || prev.email,
      name: target.name || prev.name
    }));
  };

  const requirePermission = (permission) => {
    if (hasPermission(permission)) return true;
    showNotice({ title: 'Akses Ditolak', message: 'Kamu tidak memiliki izin untuk aksi ini.', tone: 'error' });
    return false;
  };

  const deleteUser = (target) => {
    if (!requirePermission('users.delete')) return;
    openConfirm({
      title: 'Hapus User',
      message: `Hapus user ${target.name || target.jid} dari database?`,
      confirmLabel: 'Hapus',
      onConfirm: async () => {
        await api.delete(`/api/data/users/${target._id}`);
        await fetchData();
        showNotice({ title: 'Berhasil', message: 'User berhasil dihapus.', tone: 'success' });
      }
    });
  };

  const updateRole = (target) => {
    if (!requirePermission('users.update')) return;
    const normalizedRole = target.role === 'user' ? 'viewer' : target.role;
    if (normalizedRole === 'owner' && user?.role !== 'owner') {
      return showNotice({ title: 'Aksi Ditolak', message: 'Hanya owner yang bisa mengubah role owner.', tone: 'error' });
    }
    const roles = user?.role === 'owner' ? ['viewer', 'admin', 'owner'] : ['viewer', 'admin'];
    const nextRole = roles[(roles.indexOf(normalizedRole) + 1) % roles.length];

    openConfirm({
      title: 'Ubah Role',
      message: `Ubah role ${target.name || target.jid} menjadi ${nextRole.toUpperCase()}?`,
      confirmLabel: 'Ubah',
      onConfirm: async () => {
        await api.patch(`/api/data/users/${target._id}`, { role: nextRole });
        await fetchData();
        showNotice({ title: 'Role Diperbarui', message: `Role user sekarang ${nextRole.toUpperCase()}.`, tone: 'success' });
      }
    });
  };

  const openActionModal = (mode, target = null) => {
    const source = target || form;
    setActionModal({
      open: true,
      mode,
      targetName: target?.name || target?.jid || '',
      payload: {
        jid: source.jid || '',
        email: source.emailCloud || source.email || '',
        amount: mode === 'addbal' ? form.amount || '10000' : form.amount || '',
        name: source.name || ''
      }
    });
  };

  const closeActionModal = () => {
    setActionModal((prev) => ({ ...prev, open: false }));
  };

  const setActionField = (key, value) => {
    setActionModal((prev) => ({ ...prev, payload: { ...prev.payload, [key]: value } }));
  };

  const callUserTool = async (endpoint, payload, successMessage) => {
    setWorking(true);
    try {
      const { data: res } = await api.post(endpoint, payload);
      await fetchData();
      closeActionModal();

      if (res?.credentials) {
        const creds = res.credentials;
        showNotice({
          title: 'Registrasi Berhasil',
          message:
            `URL: ${creds.panelUrl || '-'}\n` +
            `Username: ${creds.username}\n` +
            `Email: ${creds.email}\n` +
            `Password: ${creds.password}`,
          tone: 'success'
        });
      } else {
        showNotice({ title: 'Berhasil', message: successMessage || res?.message || 'Success', tone: 'success' });
      }
      return res;
    } catch (err) {
      showNotice({ title: 'Aksi Gagal', message: err.response?.data?.error || err.message, tone: 'error' });
      return null;
    } finally {
      setWorking(false);
    }
  };

  const submitActionModal = async () => {
    if (!requirePermission('users.update')) return;
    const { mode, payload } = actionModal;

    if (mode === 'register') {
      const jid = payload.jid.trim();
      const email = payload.email.trim().toLowerCase();
      const name = payload.name.trim();
      if (!jid || !email) {
        return showNotice({ title: 'Input Belum Lengkap', message: 'JID dan email wajib diisi.', tone: 'error' });
      }
      await callUserTool('/api/users/register', { jid, email, name }, 'Register user berhasil.');
      return;
    }

    if (mode === 'bind') {
      const jid = payload.jid.trim();
      const email = payload.email.trim().toLowerCase();
      if (!jid || !email) {
        return showNotice({ title: 'Input Belum Lengkap', message: 'JID dan email wajib diisi.', tone: 'error' });
      }
      await callUserTool('/api/users/bind', { jid, email }, 'Bind user berhasil.');
      return;
    }

    if (mode === 'addbal') {
      const email = payload.email.trim().toLowerCase();
      const amount = Number(payload.amount);
      if (!email || !Number.isFinite(amount) || amount <= 0) {
        return showNotice({ title: 'Input Invalid', message: 'Email valid dan amount > 0 wajib diisi.', tone: 'error' });
      }
      await callUserTool(
        '/api/users/add-balance',
        { email, amount },
        `Topup Rp ${new Intl.NumberFormat('id-ID').format(amount)} berhasil.`
      );
    }
  };

  const runProfile = async (target) => {
    setProfileModal({ open: true, loading: true, data: null });
    try {
      const { data: res } = await api.get(`/api/users/${target._id}/profile`);
      setProfileModal({ open: true, loading: false, data: res });
    } catch (err) {
      setProfileModal({ open: false, loading: false, data: null });
      showNotice({ title: 'Profile Gagal', message: err.response?.data?.error || err.message, tone: 'error' });
    }
  };

  const actionModeTitle = {
    register: 'Register User Panel',
    bind: 'Bind User ke Panel',
    addbal: 'Tambah Saldo User'
  };

  return (
    <>
      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 bg-[var(--bg-card)] p-3 sm:p-4 rounded-lg border border-[var(--border-color)] shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/10 text-accent rounded-lg flex items-center justify-center border border-accent/20">
              <UsersIcon size={20} />
            </div>
            <div>
              <h1 className="heading-primary">User Management</h1>
              <p className="heading-secondary">Total {pagination.total} Registered Users</p>
            </div>
          </div>

          <div className="relative group min-w-0 md:min-w-[280px] w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] opacity-50" size={14} />
            <input
              type="text"
              placeholder="Search JID or Name..."
              className="w-full pl-9 pr-4 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg outline-none focus:ring-1 focus:ring-accent/50 text-xs transition-all"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        <Card className="p-3 sm:p-4 space-y-3">
          <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-70">User Tools (.register / .bind / .addbal)</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <FormField><Input type="text" placeholder="JID / nomor WA" value={form.jid} onChange={(e) => setField('jid', e.target.value)} /></FormField>
            <FormField><Input type="email" placeholder="Email panel" value={form.email} onChange={(e) => setField('email', e.target.value)} /></FormField>
            <FormField><Input type="text" placeholder="Nama (opsional)" value={form.name} onChange={(e) => setField('name', e.target.value)} /></FormField>
            <FormField><Input type="number" min="1" placeholder="Amount topup" value={form.amount} onChange={(e) => setField('amount', e.target.value)} /></FormField>
          </div>
          <div className="grid grid-cols-2 md:flex gap-2">
            <Button variant="primary" disabled={working || !hasPermission('users.update')} onClick={() => openActionModal('register')} className="justify-center">
              <UserPlus size={14} /> Register
            </Button>
            <Button disabled={working || !hasPermission('users.update')} onClick={() => openActionModal('bind')} className="justify-center">
              <Link2 size={14} /> Bind
            </Button>
            <Button disabled={working || !hasPermission('users.update')} onClick={() => openActionModal('addbal')} className="justify-center">
              <BadgeDollarSign size={14} /> AddBal
            </Button>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <TableWrap>
            <Table className="min-w-[980px]">
              <THead>
                <tr className="bg-[var(--bg-main)]/50 border-b border-[var(--border-color)]">
                  <Th>User Profile</Th>
                  <Th>WhatsApp JID</Th>
                  <Th>Role</Th>
                  <Th>Balance</Th>
                  <Th>Cloud Email</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </THead>
              <TBody>
                <AnimatePresence mode="popLayout">
                  {loading ? (
                    <tr><Td colSpan="6" className="py-12 text-center text-[var(--text-secondary)] font-bold italic opacity-50">Loading users...</Td></tr>
                  ) : data.length === 0 ? (
                    <tr><Td colSpan="6" className="py-12 text-center text-[var(--text-secondary)] font-bold italic opacity-50">No users found.</Td></tr>
                  ) : data.map((row) => (
                    <motion.tr
                      key={row._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-accent/[0.02] transition-colors group"
                    >
                      <Td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] flex items-center justify-center text-accent font-bold text-xs uppercase">
                            {row.name ? row.name.charAt(0) : <UserCircle size={16} />}
                          </div>
                          <div className="font-bold text-[var(--text-primary)] text-sm">{row.name || 'Anonymous'}</div>
                        </div>
                      </Td>
                      <Td>
                        <code className="text-[10px] font-bold bg-[var(--bg-main)] px-1.5 py-0.5 rounded text-[var(--text-secondary)] border border-[var(--border-color)]">{row.jid}</code>
                      </Td>
                      <Td>
                        <Pill
                          onClick={() => hasPermission('users.update') && updateRole(row)}
                          className={clsx(
                            'transition-transform',
                            hasPermission('users.update') ? 'cursor-pointer hover:scale-105' : 'opacity-70 cursor-default',
                            row.role === 'owner' ? 'badge-danger' : (row.role === 'admin' ? 'badge-warning' : 'badge-success')
                          )}
                        >
                          {row.role === 'user' ? 'viewer' : row.role}
                        </Pill>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-1.5 text-xs font-black text-[var(--text-primary)]">
                          <Wallet size={12} className="text-emerald-500" />
                          Rp {new Intl.NumberFormat('id-ID').format(row.balance || 0)}
                        </div>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-2 text-[10px] font-medium text-[var(--text-secondary)]">
                          {row.emailCloud ? <><Mail size={12} /> {row.emailCloud}</> : <span className="opacity-30 italic">Not set</span>}
                        </div>
                      </Td>
                      <Td className="text-right">
                        <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { fillFromUser(row); runProfile(row); }} className="p-1.5 text-[var(--text-secondary)] hover:text-blue-500 hover:bg-blue-500/10 rounded border border-transparent hover:border-blue-500/20 transition-all" title="Profile">
                            <BadgeInfo size={14} />
                          </button>
                          {hasPermission('users.update') && (
                            <>
                              <button onClick={() => { fillFromUser(row); openActionModal('register', row); }} className="p-1.5 text-[var(--text-secondary)] hover:text-emerald-500 hover:bg-emerald-500/10 rounded border border-transparent hover:border-emerald-500/20 transition-all" title="Register">
                                <UserPlus size={14} />
                              </button>
                              <button onClick={() => { fillFromUser(row); openActionModal('bind', row); }} className="p-1.5 text-[var(--text-secondary)] hover:text-cyan-500 hover:bg-cyan-500/10 rounded border border-transparent hover:border-cyan-500/20 transition-all" title="Bind">
                                <Link2 size={14} />
                              </button>
                              <button onClick={() => { fillFromUser(row); openActionModal('addbal', row); }} className="p-1.5 text-[var(--text-secondary)] hover:text-amber-500 hover:bg-amber-500/10 rounded border border-transparent hover:border-amber-500/20 transition-all" title="Add Balance">
                                <BadgeDollarSign size={14} />
                              </button>
                            </>
                          )}
                          {hasPermission('users.delete') && (
                            <button onClick={() => deleteUser(row)} className="p-1.5 text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 rounded border border-transparent hover:border-red-500/20 transition-all" title="Delete">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </Td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TBody>
            </Table>
          </TableWrap>

          <CardFooter className="px-6 py-3 flex items-center justify-between">
            <p className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60 uppercase tracking-widest">
              Page {pagination.page} / {pagination.pages}
            </p>
            <div className="flex gap-2">
              <Button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5"
              >
                <ChevronLeft size={16} />
              </Button>
              <Button
                disabled={page === pagination.pages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5"
              >
                <ChevronRight size={16} />
              </Button>
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

      <Modal open={actionModal.open} onClose={closeActionModal} widthClass="max-w-lg">
        <div className="space-y-4">
          <h3 className="text-sm font-black text-[var(--text-primary)]">{actionModeTitle[actionModal.mode]}</h3>
          {actionModal.targetName && (
            <p className="text-[11px] text-[var(--text-secondary)]">Target: <span className="font-bold">{actionModal.targetName}</span></p>
          )}

          {(actionModal.mode === 'register' || actionModal.mode === 'bind') && (
            <Input type="text" placeholder="JID / nomor WA" value={actionModal.payload.jid} onChange={(e) => setActionField('jid', e.target.value)} />
          )}

          <Input type="email" placeholder="Email panel" value={actionModal.payload.email} onChange={(e) => setActionField('email', e.target.value)} />

          {actionModal.mode === 'register' && (
            <Input type="text" placeholder="Nama (opsional)" value={actionModal.payload.name} onChange={(e) => setActionField('name', e.target.value)} />
          )}

          {actionModal.mode === 'addbal' && (
            <Input type="number" min="1" placeholder="Jumlah topup" value={actionModal.payload.amount} onChange={(e) => setActionField('amount', e.target.value)} />
          )}

          <div className="flex justify-end gap-2">
            <Button onClick={closeActionModal}>Batal</Button>
            <Button variant="primary" disabled={working} onClick={submitActionModal}>
              {working ? 'Memproses...' : 'Submit'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={profileModal.open} onClose={() => setProfileModal({ open: false, loading: false, data: null })} widthClass="max-w-lg">
        {profileModal.loading ? (
          <p className="text-[11px] text-[var(--text-secondary)]">Memuat profile...</p>
        ) : profileModal.data ? (
          <div className="space-y-3 text-[11px]">
            <h3 className="text-sm font-black text-[var(--text-primary)]">Profile User</h3>
            <InfoRow label="Nama" value={profileModal.data.dbUser.name || '-'} />
            <InfoRow label="JID" value={profileModal.data.dbUser.jid || '-'} />
            <InfoRow label="Role" value={profileModal.data.dbUser.role || '-'} />
            <InfoRow label="Saldo" value={`Rp ${new Intl.NumberFormat('id-ID').format(profileModal.data.dbUser.balance || 0)}`} />
            <InfoRow label="Email Cloud" value={profileModal.data.dbUser.emailCloud || '-'} />
            <InfoRow label="Bound Panel" value={profileModal.data.pteroUser ? 'Ya' : 'Tidak'} />
            {profileModal.data.pteroUser && (
              <>
                <InfoRow label="Panel Username" value={profileModal.data.pteroUser.username || '-'} />
                <InfoRow label="Panel Email" value={profileModal.data.pteroUser.email || '-'} />
                <InfoRow label="Panel ID" value={String(profileModal.data.pteroUser.id || '-')} />
              </>
            )}
            <div className="flex justify-end pt-2">
              <Button variant="primary" onClick={() => setProfileModal({ open: false, loading: false, data: null })}>Tutup</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
};

const InfoRow = ({ label, value }) => (
  <div className="grid grid-cols-[120px_1fr] gap-2 items-start">
    <span className="text-[var(--text-secondary)] font-semibold">{label}</span>
    <span className="text-[var(--text-primary)] break-all">{value}</span>
  </div>
);

export default Users;
