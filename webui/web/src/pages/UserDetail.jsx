import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft, User as UserIcon, Server, Banknote, Ban, ShieldCheck, Edit3, Save } from 'lucide-react';
import { clsx } from 'clsx';
import { Card, Button, Pill, Input, FormField } from '../components/ui';
import NoticeModal from '../components/NoticeModal';
import { useModalFeedback } from '../hooks/useModalFeedback';

const tabs = ['Overview', 'Servers', 'Transactions'];

const UserDetail = () => {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [servers, setServers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const { notice, showNotice, closeNotice } = useModalFeedback();

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/api/users/${id}`);
        setUser(data.user);
        setServers(data.servers || []);
        setTransactions(data.transactions || []);
        setEditForm({ name: data.user?.name || '', balance: data.user?.balance || 0 });
      } catch (err) {
        showNotice({ title: 'Error', message: err.response?.data?.error || 'User not found', tone: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/api/users/${id}`, editForm);
      showNotice({ title: 'Saved', message: 'User updated.', tone: 'success' });
      setEditing(false);
      const { data } = await api.get(`/api/users/${id}`);
      setUser(data.user);
    } catch (err) {
      showNotice({ title: 'Error', message: err.response?.data?.error || err.message, tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleBan = async () => {
    try {
      await api.patch(`/api/users/${id}`, { banned: !user.banned });
      showNotice({ title: user.banned ? 'Unbanned' : 'Banned', message: `User ${user.banned ? 'unbanned' : 'banned'}.`, tone: 'success' });
      setUser((p) => ({ ...p, banned: !p.banned }));
    } catch (err) {
      showNotice({ title: 'Error', message: err.response?.data?.error || err.message, tone: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-20 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]" />
        <div className="h-48 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]" />
      </div>
    );
  }

  if (!user) {
    return (
      <Card className="p-12 text-center">
        <p className="text-sm text-[var(--text-secondary)]">User not found</p>
        <Link to="/users"><Button className="mt-4"><ArrowLeft size={14} /> Back to Users</Button></Link>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4 pb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--bg-card)] p-4 rounded-lg border border-[var(--border-color)] shadow-sm">
          <div className="flex items-center gap-3">
            <Link to="/users"><Button size="sm"><ArrowLeft size={14} /></Button></Link>
            <div className="w-10 h-10 bg-accent/10 text-accent rounded-lg flex items-center justify-center border border-accent/20">
              <UserIcon size={20} />
            </div>
            <div>
              <h1 className="heading-primary flex items-center gap-2">
                {user.name || user.jid?.split('@')[0] || 'User'}
                {user.banned && <Pill tone="danger">Banned</Pill>}
                {user.premium && <Pill tone="success">Premium</Pill>}
              </h1>
              <p className="heading-secondary">{user.jid}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant={user.banned ? 'success' : 'danger'} onClick={handleBan}>
              {user.banned ? <ShieldCheck size={14} /> : <Ban size={14} />}
              {user.banned ? 'Unban' : 'Ban'}
            </Button>
          </div>
        </div>

        <div className="flex gap-1 bg-[var(--bg-card)] p-1 rounded-lg border border-[var(--border-color)]">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'flex-1 py-2 text-xs font-bold rounded-md transition-all',
                activeTab === tab
                  ? 'bg-accent/10 text-accent'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-main)]'
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'Overview' && (
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading-primary">User Info</h2>
              {editing ? (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                  <Button size="sm" variant="primary" onClick={handleSave} disabled={saving}>
                    <Save size={12} /> {saving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              ) : (
                <Button size="sm" onClick={() => setEditing(true)}><Edit3 size={12} /> Edit</Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow label="JID" value={user.jid} />
              {editing ? (
                <FormField label="Name">
                  <Input value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
                </FormField>
              ) : (
                <InfoRow label="Name" value={user.name || '-'} />
              )}
              {editing ? (
                <FormField label="Balance">
                  <Input type="number" value={editForm.balance} onChange={(e) => setEditForm((p) => ({ ...p, balance: Number(e.target.value) }))} />
                </FormField>
              ) : (
                <InfoRow label="Balance" value={`Rp ${new Intl.NumberFormat('id-ID').format(user.balance || 0)}`} />
              )}
              <InfoRow label="Email" value={user.email || '-'} />
              <InfoRow label="Registered" value={user.createdAt ? new Date(user.createdAt).toLocaleDateString('id-ID') : '-'} />
              <InfoRow label="Status" value={user.banned ? 'Banned' : 'Active'} />
            </div>
          </Card>
        )}

        {activeTab === 'Servers' && (
          <Card>
            {servers.length === 0 ? (
              <div className="p-12 text-center">
                <Server size={32} className="mx-auto mb-2 text-[var(--text-secondary)] opacity-30" />
                <p className="text-sm text-[var(--text-secondary)]">No servers</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-color)]">
                {servers.map((srv) => (
                  <div key={srv._id} className="p-4 flex items-center gap-3">
                    <Server size={16} className="text-amber-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[var(--text-primary)]">{srv.name || srv.serverId}</p>
                      <p className="text-[10px] text-[var(--text-secondary)]">{srv.plan || '-'} · Expires: {srv.expiredAt ? new Date(srv.expiredAt).toLocaleDateString('id-ID') : '-'}</p>
                    </div>
                    <Pill tone={srv.suspended ? 'danger' : 'success'}>{srv.suspended ? 'Suspended' : 'Active'}</Pill>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {activeTab === 'Transactions' && (
          <Card>
            {transactions.length === 0 ? (
              <div className="p-12 text-center">
                <Banknote size={32} className="mx-auto mb-2 text-[var(--text-secondary)] opacity-30" />
                <p className="text-sm text-[var(--text-secondary)]">No transactions</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-color)]">
                {transactions.map((tx) => (
                  <div key={tx._id} className="p-4 flex items-center gap-3">
                    <Banknote size={16} className="text-violet-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[var(--text-primary)]">
                        Rp {new Intl.NumberFormat('id-ID').format(tx.amount)}
                        <span className="ml-2 font-normal text-[var(--text-secondary)]">{tx.description}</span>
                      </p>
                      <p className="text-[10px] text-[var(--text-secondary)]">{new Date(tx.createdAt).toLocaleString('id-ID')}</p>
                    </div>
                    <Pill tone={tx.status === 'success' ? 'success' : tx.status === 'failed' ? 'danger' : 'warning'}>{tx.type} / {tx.status}</Pill>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
      <NoticeModal open={notice.open} title={notice.title} message={notice.message} tone={notice.tone} onClose={closeNotice} />
    </>
  );
};

const InfoRow = ({ label, value }) => (
  <div>
    <p className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">{label}</p>
    <p className="text-sm text-[var(--text-primary)] mt-0.5">{value}</p>
  </div>
);

export default UserDetail;
