import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Settings2, Save, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import NoticeModal from '../components/NoticeModal';
import { useModalFeedback } from '../hooks/useModalFeedback';
import { Button, Card, FormField, Input } from '../components/ui';

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    mode: 'public',
    autoStatusRead: false,
    autoAiPrivate: false,
    mustJoinGroup: false,
    smartMode: false,
    groupInviteLink: '',
    privateAiPersona: '',
    disabledCommands: []
  });
  const [disabledCommandsText, setDisabledCommandsText] = useState('');
  const { notice, showNotice, closeNotice } = useModalFeedback();

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/settings');
      setForm({
        mode: data.mode || 'public',
        autoStatusRead: !!data.autoStatusRead,
        autoAiPrivate: !!data.autoAiPrivate,
        mustJoinGroup: !!data.mustJoinGroup,
        smartMode: !!data.smartMode,
        groupInviteLink: data.groupInviteLink || '',
        privateAiPersona: data.privateAiPersona || '',
        disabledCommands: Array.isArray(data.disabledCommands) ? data.disabledCommands : []
      });
      setDisabledCommandsText((data.disabledCommands || []).join(', '));
    } catch (err) {
      showNotice({ title: 'Gagal Ambil Settings', message: err.response?.data?.message || err.message, tone: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const disabledCommands = disabledCommandsText.split(',').map((x) => x.trim()).filter(Boolean);
      await api.patch('/api/settings', { ...form, disabledCommands });
      showNotice({ title: 'Berhasil', message: 'Settings berhasil disimpan.', tone: 'success' });
      await fetchSettings();
    } catch (err) {
      showNotice({ title: 'Simpan Gagal', message: err.response?.data?.message || err.message, tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6 animate-pulse">
        <div className="h-5 w-48 rounded bg-[var(--bg-main)] mb-4" />
        <div className="space-y-3">
          <div className="h-10 rounded bg-[var(--bg-main)]" />
          <div className="h-10 rounded bg-[var(--bg-main)]" />
          <div className="h-24 rounded bg-[var(--bg-main)]" />
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4 pb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--bg-card)] p-4 rounded-lg border border-[var(--border-color)] shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/10 text-accent rounded-lg flex items-center justify-center border border-accent/20">
              <Settings2 size={20} />
            </div>
            <div>
              <h1 className="heading-primary">Bot Settings</h1>
              <p className="heading-secondary">Konfigurasi perilaku bot</p>
            </div>
          </div>
          <Button onClick={fetchSettings} type="button">
            <RefreshCw size={14} /> Reload
          </Button>
        </div>

        <Card className="p-4 sm:p-6">
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <FormField label="Bot Mode">
                <select
                  value={form.mode}
                  onChange={(e) => setField('mode', e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg outline-none focus:ring-1 focus:ring-accent/50 text-sm"
                >
                  <option value="public">public</option>
                  <option value="self">self</option>
                  <option value="group">group</option>
                </select>
              </FormField>

              <FormField label="Group Invite Link">
                <Input type="text" value={form.groupInviteLink} onChange={(e) => setField('groupInviteLink', e.target.value)} placeholder="https://chat.whatsapp.com/..." className="text-sm" />
              </FormField>
            </div>

            <div className="rounded-lg border border-[var(--border-color)] p-4 space-y-3 bg-[var(--bg-main)]/50">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">AI Private Chat (Owner `aisetting`)</h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Sinkron dengan command: <code>.aisetting on/off</code>, <code>.aisetting smartmode on/off</code>, <code>.aisetting mustjoin on/off</code>, <code>.aisetting setlink</code>, dan <code>.aisetting setpersona</code>.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <ToggleCard
                  label="Auto AI Private"
                  active={form.autoAiPrivate}
                  onClick={() => setField('autoAiPrivate', !form.autoAiPrivate)}
                  helper="Aktif/nonaktif balasan AI di private chat."
                />
                <ToggleCard
                  label="Smart Mode"
                  active={form.smartMode}
                  onClick={() => setField('smartMode', !form.smartMode)}
                  helper="Jika ON, bot membalas saat user dianggap AFK."
                />
                <ToggleCard
                  label="Must Join Group"
                  active={form.mustJoinGroup}
                  onClick={() => setField('mustJoinGroup', !form.mustJoinGroup)}
                  helper="Wajib join grup dulu sebelum pakai AI private."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ToggleCard label="Auto Read Status" active={form.autoStatusRead} onClick={() => setField('autoStatusRead', !form.autoStatusRead)} />
              <div className="rounded-lg border border-dashed border-[var(--border-color)] p-3 text-xs text-[var(--text-secondary)]">
                <p className="font-semibold text-[var(--text-primary)]">Status ringkas (`.aisetting check`)</p>
                <p className="mt-1">Auto AI: {form.autoAiPrivate ? 'Aktif' : 'Mati'}</p>
                <p>Smart Mode: {form.smartMode ? 'ON' : 'OFF'}</p>
                <p>Must Join Group: {form.mustJoinGroup ? 'Aktif' : 'Mati'}</p>
              </div>
            </div>

            <FormField label="Disabled Commands (pisahkan dengan koma)">
              <Input type="text" value={disabledCommandsText} onChange={(e) => setDisabledCommandsText(e.target.value)} placeholder="ai, tiktok, panel" className="text-sm" />
            </FormField>

            <FormField label="Private AI Persona">
              <textarea
                rows={5}
                value={form.privateAiPersona}
                onChange={(e) => setField('privateAiPersona', e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg outline-none focus:ring-1 focus:ring-accent/50 text-sm resize-y"
              />
            </FormField>

            <div className="flex justify-end">
              <Button type="submit" variant="primary" disabled={saving} className={clsx(saving && 'opacity-60 cursor-not-allowed')}>
                <Save size={14} />
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <NoticeModal open={notice.open} title={notice.title} message={notice.message} tone={notice.tone} onClose={closeNotice} />
    </>
  );
};

const ToggleCard = ({ label, active, onClick, helper }) => (
  <button
    type="button"
    onClick={onClick}
    className={clsx(
      'text-left p-3 rounded-lg border transition-all',
      active
        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
        : 'bg-[var(--bg-main)] border-[var(--border-color)] text-[var(--text-secondary)]'
    )}
  >
    <p className="text-[11px] font-black uppercase tracking-wider">{label}</p>
    <p className="text-xs mt-1 font-semibold">{active ? 'Enabled' : 'Disabled'}</p>
    {helper ? <p className="text-[11px] mt-1 opacity-80 leading-relaxed">{helper}</p> : null}
  </button>
);

export default Settings;
