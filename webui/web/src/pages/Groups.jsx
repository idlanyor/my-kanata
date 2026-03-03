import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';
import NoticeModal from '../components/NoticeModal';
import ConfirmModal from '../components/ConfirmModal';
import { useModalFeedback } from '../hooks/useModalFeedback';
import { Button, Card, CardFooter, Input, Table, TableWrap, TBody, Td, THead, Th } from '../components/ui';
import { UsersRound, Search, Settings2, Trash2, VolumeX, ChevronLeft, ChevronRight, Info, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { clsx } from 'clsx';

const defaultAdvanced = {
  open: false,
  id: '',
  cityId: '',
  cityName: '',
  welcomeMsg: '',
  leaveMsg: '',
  announce: false,
  restrict: false,
  antilink: false,
  antitoxic: false,
  welcome: false,
  left: false,
  nsfw: false,
  mute: false,
  prayerReminder: false
};

const Groups = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncRow, setSyncRow] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const { notice, showNotice, closeNotice, confirmState, openConfirm, closeConfirm, executeConfirm } = useModalFeedback();
  const [nameModal, setNameModal] = useState({ open: false, id: '', value: '' });
  const [advancedModal, setAdvancedModal] = useState(defaultAdvanced);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get(`/api/data/groups?page=${page}&search=${search}`);
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

  const updateGroupFields = async (id, payload, successTitle = 'Berhasil') => {
    try {
      await api.patch(`/api/data/groups/${id}`, payload);
      await fetchData();
      showNotice({ title: successTitle, message: 'Data group berhasil diperbarui.', tone: 'success' });
    } catch (err) {
      showNotice({ title: 'Update Gagal', message: err.response?.data?.error || err.message, tone: 'error' });
    }
  };

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await api.post('/api/bot/sync-groups');
      showNotice({ title: 'Smart Sync Dimulai', message: 'Bot akan memproses grup kosong satu per satu dengan delay 5 detik.', tone: 'success' });
    } catch (err) {
      showNotice({ title: 'Sync Gagal', message: err.response?.data?.message || err.message, tone: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  const syncSingle = async (jid) => {
    setSyncRow(jid);
    try {
      await api.post('/api/bot/sync-groups', { jid });
      setTimeout(fetchData, 3000);
    } catch (err) {
      showNotice({ title: 'Sync Gagal', message: err.response?.data?.message || err.message, tone: 'error' });
    } finally {
      setSyncRow(null);
    }
  };

  const deleteGroup = (id) => {
    openConfirm({
      title: 'Hapus Group',
      message: 'Hapus grup ini dari database bot?',
      confirmLabel: 'Hapus',
      onConfirm: async () => {
        await api.delete(`/api/data/groups/${id}`);
        await fetchData();
        showNotice({ title: 'Berhasil', message: 'Group berhasil dihapus.', tone: 'success' });
      }
    });
  };

  const openNameModal = (id, currentName = '') => setNameModal({ open: true, id, value: currentName || '' });

  const submitNameModal = async () => {
    const newName = nameModal.value.trim();
    if (!newName) {
      showNotice({ title: 'Input Invalid', message: 'Nama group tidak boleh kosong.', tone: 'error' });
      return;
    }
    await updateGroupFields(nameModal.id, { name: newName }, 'Update Nama');
    setNameModal({ open: false, id: '', value: '' });
  };

  const openAdvancedModal = (group) => {
    setAdvancedModal({
      open: true,
      id: group._id,
      cityId: group.cityId || '1420',
      cityName: group.cityName || 'KAB. PURBALINGGA',
      welcomeMsg: group.welcomeMsg || 'Selamat datang @user di grup @group!',
      leaveMsg: group.leaveMsg || 'Selamat tinggal @user, semoga tenang di sana!',
      announce: !!group.announce,
      restrict: !!group.restrict,
      antilink: !!group.antilink,
      antitoxic: !!group.antitoxic,
      welcome: !!group.welcome,
      left: !!group.left,
      nsfw: !!group.nsfw,
      mute: !!group.mute,
      prayerReminder: !!group.prayerReminder
    });
  };

  const setAdvancedField = (key, value) => setAdvancedModal((prev) => ({ ...prev, [key]: value }));

  const submitAdvancedModal = async () => {
    const payload = {
      cityId: String(advancedModal.cityId || '').trim(),
      cityName: String(advancedModal.cityName || '').trim(),
      welcomeMsg: String(advancedModal.welcomeMsg || '').trim(),
      leaveMsg: String(advancedModal.leaveMsg || '').trim(),
      announce: !!advancedModal.announce,
      restrict: !!advancedModal.restrict,
      antilink: !!advancedModal.antilink,
      antitoxic: !!advancedModal.antitoxic,
      welcome: !!advancedModal.welcome,
      left: !!advancedModal.left,
      nsfw: !!advancedModal.nsfw,
      mute: !!advancedModal.mute,
      prayerReminder: !!advancedModal.prayerReminder
    };

    if (!payload.cityId || !payload.cityName) {
      showNotice({ title: 'Input Invalid', message: 'City ID dan City Name wajib diisi.', tone: 'error' });
      return;
    }
    if (!payload.welcomeMsg || !payload.leaveMsg) {
      showNotice({ title: 'Input Invalid', message: 'Welcome message dan leave message wajib diisi.', tone: 'error' });
      return;
    }

    await updateGroupFields(advancedModal.id, payload, 'Advanced Settings');
    setAdvancedModal(defaultAdvanced);
  };

  const renderGroupName = (group, className = '') => (
    group.name ? (
      <span className={clsx('block truncate', className)} title={group.name}>{group.name}</span>
    ) : (
      <button
        onClick={() => syncSingle(group.jid)}
        disabled={syncRow === group.jid}
        className={clsx('text-red-500 hover:text-red-600 flex items-center gap-1.5 group/sync', className)}
      >
        <span className="italic underline underline-offset-4 decoration-dashed">Unknown Subject</span>
        <RefreshCw size={12} className={clsx(syncRow === group.jid && 'animate-spin')} />
      </button>
    )
  );

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 bg-[var(--bg-card)] p-3 sm:p-4 rounded-lg border border-[var(--border-color)] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent/10 text-accent rounded-lg flex items-center justify-center border border-accent/20"><UsersRound size={20} /></div>
          <div>
            <h1 className="heading-primary text-base sm:text-lg">Group Management</h1>
            <p className="heading-secondary text-[10px] sm:text-xs">{pagination.total} Connected Groups</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 flex-1 lg:max-w-3xl items-stretch sm:items-center min-w-0">
          <div className="relative group flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] opacity-50" size={14} />
            <Input type="text" placeholder="Search Group Name or JID..." className="pl-9 pr-4 shadow-inner" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Button onClick={handleSync} disabled={syncing} variant="primary" className="whitespace-nowrap justify-center">
            <RefreshCw size={14} className={clsx(syncing && 'animate-spin')} /> {syncing ? 'Processing...' : 'Smart Sync'}
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="md:hidden divide-y divide-[var(--border-color)] max-h-[70vh] overflow-x-hidden overflow-y-auto">
          {loading ? (
            <div className="px-4 py-10 text-center text-[var(--text-secondary)] font-bold italic opacity-50">Loading groups...</div>
          ) : data.length === 0 ? (
            <div className="px-4 py-10 text-center text-[var(--text-secondary)] font-bold italic opacity-50">No groups found.</div>
          ) : data.map((group) => (
            <div key={group._id} className="p-3 sm:p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] flex items-center justify-center text-accent font-bold text-sm uppercase">{group.name ? group.name.charAt(0) : '?'}</div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-[var(--text-primary)] text-[13px] sm:text-sm">{renderGroupName(group, 'max-w-full')}</div>
                  <code className="text-[10px] font-bold text-[var(--text-secondary)] block break-all mt-1 leading-relaxed">{group.jid}</code>
                  <p className="text-[9px] text-[var(--text-secondary)] font-bold mt-1">City: {group.cityName || '-'} ({group.cityId || '-'})</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-1 shrink-0">
                <IconButton title="Advanced" onClick={() => openAdvancedModal(group)}><SlidersHorizontal size={16} /></IconButton>
                <IconButton title="Edit Name" onClick={() => openNameModal(group._id, group.name)}><Settings2 size={16} /></IconButton>
                <IconButton title="Delete Group" onClick={() => deleteGroup(group._id)} className="hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/20"><Trash2 size={16} /></IconButton>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block max-h-[70vh] overflow-auto">
          <TableWrap>
            <Table className="min-w-[980px]">
              <THead>
                <tr className="bg-[var(--bg-main)]/50 border-b border-[var(--border-color)]">
                  <Th>Group Profile</Th>
                  <Th>Subject / Name</Th>
                  <Th>Details</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </THead>
              <TBody>
                {loading ? (
                  <tr><Td colSpan="4" className="py-12 text-center text-[var(--text-secondary)] font-bold italic opacity-50">Loading groups...</Td></tr>
                ) : data.length === 0 ? (
                  <tr><Td colSpan="4" className="py-12 text-center text-[var(--text-secondary)] font-bold italic opacity-50">No groups found.</Td></tr>
                ) : data.map((group) => (
                  <tr key={group._id} className="hover:bg-accent/[0.02] transition-colors group">
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)] flex items-center justify-center text-accent font-bold text-sm uppercase">{group.name ? group.name.charAt(0) : '?'}</div>
                        <code className="text-[10px] font-bold text-[var(--text-secondary)]">{group.jid}</code>
                      </div>
                    </Td>
                    <Td><div className="font-bold text-[var(--text-primary)] text-sm">{renderGroupName(group, 'max-w-[250px]')}</div></Td>
                    <Td>
                      <div className="text-[10px] font-bold text-[var(--text-secondary)] space-y-1">
                        <p>City: {group.cityName || '-'} ({group.cityId || '-'})</p>
                        <p>Reminder: {group.prayerReminder ? 'ON' : 'OFF'} | Mute: {group.mute ? 'ON' : 'OFF'}</p>
                      </div>
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <IconButton title="Advanced" onClick={() => openAdvancedModal(group)}><SlidersHorizontal size={16} /></IconButton>
                        <IconButton title="Edit Name" onClick={() => openNameModal(group._id, group.name)}><Settings2 size={16} /></IconButton>
                        <IconButton title="Delete Group" onClick={() => deleteGroup(group._id)} className="hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/20"><Trash2 size={16} /></IconButton>
                      </div>
                    </Td>
                  </tr>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        </div>

        <CardFooter className="px-3 sm:px-4 md:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <p className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60 uppercase tracking-widest">Page {pagination.page} / {pagination.pages}</p>
          <div className="flex items-center justify-end gap-2">
            <Button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="h-8 w-8 sm:h-auto sm:w-auto sm:p-1.5 flex items-center justify-center"><ChevronLeft size={16} /></Button>
            <Button disabled={page === pagination.pages} onClick={() => setPage((p) => p + 1)} className="h-8 w-8 sm:h-auto sm:w-auto sm:p-1.5 flex items-center justify-center"><ChevronRight size={16} /></Button>
          </div>
        </CardFooter>
      </Card>

      <div className="px-3 sm:px-6 py-3 bg-accent/5 rounded-lg border border-accent/10 flex items-start sm:items-center gap-2 sm:gap-3">
        <Info size={14} className="text-accent shrink-0 mt-0.5 sm:mt-0" />
        <p className="text-[10px] sm:text-[11px] text-accent/80 font-medium tracking-tight">Semua toggle policies/security sekarang dipusatkan di tombol <span className="font-bold">Advanced</span>.</p>
      </div>

      <NoticeModal open={notice.open} title={notice.title} message={notice.message} tone={notice.tone} onClose={closeNotice} />
      <ConfirmModal open={confirmState.open} title={confirmState.title} message={confirmState.message} confirmLabel={confirmState.confirmLabel} loading={confirmState.loading} onCancel={closeConfirm} onConfirm={executeConfirm} />

      <Modal open={nameModal.open} onClose={() => setNameModal({ open: false, id: '', value: '' })} widthClass="max-w-md">
        <div className="space-y-4">
          <h3 className="text-sm font-black text-[var(--text-primary)]">Edit Nama Group</h3>
          <Input type="text" value={nameModal.value} onChange={(e) => setNameModal((prev) => ({ ...prev, value: e.target.value }))} placeholder="Masukkan nama group..." />
          <div className="flex justify-end gap-2">
            <Button onClick={() => setNameModal({ open: false, id: '', value: '' })}>Batal</Button>
            <Button variant="primary" onClick={submitNameModal}>Simpan</Button>
          </div>
        </div>
      </Modal>

      <Modal open={advancedModal.open} onClose={() => setAdvancedModal(defaultAdvanced)} widthClass="max-w-3xl">
        <div className="space-y-4">
          <h3 className="text-sm font-black text-[var(--text-primary)]">Advanced Group Settings</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input type="text" placeholder="City ID" value={advancedModal.cityId} onChange={(e) => setAdvancedField('cityId', e.target.value)} />
            <Input type="text" placeholder="City Name" value={advancedModal.cityName} onChange={(e) => setAdvancedField('cityName', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <AdvancedToggle label="Announce" active={advancedModal.announce} onClick={() => setAdvancedField('announce', !advancedModal.announce)} />
            <AdvancedToggle label="Restrict" active={advancedModal.restrict} onClick={() => setAdvancedField('restrict', !advancedModal.restrict)} />
            <AdvancedToggle label="Antilink" active={advancedModal.antilink} onClick={() => setAdvancedField('antilink', !advancedModal.antilink)} />
            <AdvancedToggle label="Antitoxic" active={advancedModal.antitoxic} onClick={() => setAdvancedField('antitoxic', !advancedModal.antitoxic)} />
            <AdvancedToggle label="Welcome" active={advancedModal.welcome} onClick={() => setAdvancedField('welcome', !advancedModal.welcome)} />
            <AdvancedToggle label="Leave" active={advancedModal.left} onClick={() => setAdvancedField('left', !advancedModal.left)} />
            <AdvancedToggle label="NSFW" active={advancedModal.nsfw} onClick={() => setAdvancedField('nsfw', !advancedModal.nsfw)} />
            <AdvancedToggle label="Mute" active={advancedModal.mute} onClick={() => setAdvancedField('mute', !advancedModal.mute)} />
            <AdvancedToggle label="Sholat Reminder" active={advancedModal.prayerReminder} onClick={() => setAdvancedField('prayerReminder', !advancedModal.prayerReminder)} />
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Welcome Message</p>
            <textarea rows={3} value={advancedModal.welcomeMsg} onChange={(e) => setAdvancedField('welcomeMsg', e.target.value)} className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg outline-none focus:ring-1 focus:ring-accent/50 text-xs resize-y" />
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Leave Message</p>
            <textarea rows={3} value={advancedModal.leaveMsg} onChange={(e) => setAdvancedField('leaveMsg', e.target.value)} className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg outline-none focus:ring-1 focus:ring-accent/50 text-xs resize-y" />
          </div>

          <div className="flex justify-end gap-2">
            <Button onClick={() => setAdvancedModal(defaultAdvanced)}>Batal</Button>
            <Button variant="primary" onClick={submitAdvancedModal}>Simpan</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const IconButton = ({ className, ...props }) => (
  <button className={clsx('p-1.5 text-[var(--text-secondary)] rounded border border-transparent hover:border-accent/20 transition-all', className)} {...props} />
);

const AdvancedToggle = ({ label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={clsx(
      'text-left p-2 rounded-lg border transition-all',
      active ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-[var(--bg-main)] border-[var(--border-color)] text-[var(--text-secondary)]'
    )}
  >
    <p className="text-[10px] font-black uppercase tracking-wider">{label}</p>
    <p className="text-[10px] mt-1 font-semibold">{active ? 'ON' : 'OFF'}</p>
  </button>
);

export default Groups;
