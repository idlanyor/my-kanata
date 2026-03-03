import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { ShieldCheck, Plus, Trash2, KeyRound, Edit3 } from 'lucide-react';
import { Card, Button, Pill, Input, FormField } from '../components/ui';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import NoticeModal from '../components/NoticeModal';
import { useModalFeedback } from '../hooks/useModalFeedback';

const Admins = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showResetPw, setShowResetPw] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const { notice, showNotice, closeNotice } = useModalFeedback();
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({ name: '', jid: '', password: '', role: 'viewer' });
  const [resetPw, setResetPw] = useState('');
  const [editRole, setEditRole] = useState('');

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/admins');
      setAdmins(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAdmins(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/api/admins', form);
      showNotice({ title: 'Created', message: `Admin ${form.name} created.`, tone: 'success' });
      setShowCreate(false);
      setForm({ name: '', jid: '', password: '', role: 'viewer' });
      fetchAdmins();
    } catch (err) {
      showNotice({ title: 'Error', message: err.response?.data?.error || err.message, tone: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/api/admins/${deleteTarget._id}`);
      showNotice({ title: 'Deleted', message: `Admin deleted.`, tone: 'success' });
      setDeleteTarget(null);
      fetchAdmins();
    } catch (err) {
      showNotice({ title: 'Error', message: err.response?.data?.error || err.message, tone: 'error' });
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!showResetPw || !resetPw) return;
    try {
      await api.patch(`/api/admins/${showResetPw._id}/password`, { password: resetPw });
      showNotice({ title: 'Updated', message: 'Password reset successfully.', tone: 'success' });
      setShowResetPw(null);
      setResetPw('');
    } catch (err) {
      showNotice({ title: 'Error', message: err.response?.data?.error || err.message, tone: 'error' });
    }
  };

  const handleUpdateRole = async (e) => {
    e.preventDefault();
    if (!editTarget || !editRole) return;
    try {
      await api.patch(`/api/admins/${editTarget._id}`, { role: editRole });
      showNotice({ title: 'Updated', message: 'Role updated.', tone: 'success' });
      setEditTarget(null);
      fetchAdmins();
    } catch (err) {
      showNotice({ title: 'Error', message: err.response?.data?.error || err.message, tone: 'error' });
    }
  };

  const roleTone = (role) => {
    if (role === 'owner') return 'danger';
    if (role === 'admin') return 'warning';
    return 'neutral';
  };

  return (
    <>
      <div className="space-y-4 pb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--bg-card)] p-4 rounded-lg border border-[var(--border-color)] shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/10 text-accent rounded-lg flex items-center justify-center border border-accent/20">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h1 className="heading-primary">Admin Management</h1>
              <p className="heading-secondary">{admins.length} admins</p>
            </div>
          </div>
          <Button variant="primary" onClick={() => setShowCreate(true)}><Plus size={14} /> Add Admin</Button>
        </div>

        <Card>
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-[var(--bg-main)] rounded-lg animate-pulse" />)}
            </div>
          ) : admins.length === 0 ? (
            <div className="p-12 text-center">
              <ShieldCheck size={40} className="mx-auto mb-3 text-[var(--text-secondary)] opacity-30" />
              <p className="text-sm text-[var(--text-secondary)]">No admins found</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-color)]">
              {admins.map((a) => (
                <div key={a._id} className="p-4 flex items-center gap-4 hover:bg-[var(--bg-main)]/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-[var(--text-primary)]">{a.name}</span>
                      <Pill tone={roleTone(a.role)}>{a.role}</Pill>
                      {!a.active && <Pill tone="danger">Inactive</Pill>}
                    </div>
                    <div className="flex gap-3 mt-1 text-[10px] text-[var(--text-secondary)]">
                      <span>{a.jid}</span>
                      {a.lastLoginAt && <span>Last login: {new Date(a.lastLoginAt).toLocaleDateString('id-ID')}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" onClick={() => { setEditTarget(a); setEditRole(a.role); }}><Edit3 size={12} /></Button>
                    <Button size="sm" onClick={() => setShowResetPw(a)}><KeyRound size={12} /></Button>
                    <Button size="sm" variant="danger" onClick={() => setDeleteTarget(a)}><Trash2 size={12} /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {showCreate && (
        <Modal title="Add Admin" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-3">
            <FormField label="Name"><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required /></FormField>
            <FormField label="JID"><Input value={form.jid} onChange={(e) => setForm((p) => ({ ...p, jid: e.target.value }))} placeholder="628xxx@s.whatsapp.net" required /></FormField>
            <FormField label="Password"><Input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} required minLength={6} /></FormField>
            <FormField label="Role">
              <select value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-xs">
                <option value="viewer">Viewer</option>
                <option value="admin">Admin</option>
                <option value="owner">Owner</option>
              </select>
            </FormField>
            <Button type="submit" variant="primary" disabled={creating} className="w-full">{creating ? 'Creating...' : 'Create Admin'}</Button>
          </form>
        </Modal>
      )}

      {showResetPw && (
        <Modal title={`Reset Password - ${showResetPw.name}`} onClose={() => { setShowResetPw(null); setResetPw(''); }}>
          <form onSubmit={handleResetPassword} className="space-y-3">
            <FormField label="New Password"><Input type="password" value={resetPw} onChange={(e) => setResetPw(e.target.value)} required minLength={6} /></FormField>
            <Button type="submit" variant="primary" className="w-full">Reset Password</Button>
          </form>
        </Modal>
      )}

      {editTarget && (
        <Modal title={`Edit Role - ${editTarget.name}`} onClose={() => setEditTarget(null)}>
          <form onSubmit={handleUpdateRole} className="space-y-3">
            <FormField label="Role">
              <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-xs">
                <option value="viewer">Viewer</option>
                <option value="admin">Admin</option>
                <option value="owner">Owner</option>
              </select>
            </FormField>
            <Button type="submit" variant="primary" className="w-full">Update Role</Button>
          </form>
        </Modal>
      )}

      <ConfirmModal open={!!deleteTarget} title="Delete Admin" message={`Delete admin "${deleteTarget?.name}"?`} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      <NoticeModal open={notice.open} title={notice.title} message={notice.message} tone={notice.tone} onClose={closeNotice} />
    </>
  );
};

export default Admins;
