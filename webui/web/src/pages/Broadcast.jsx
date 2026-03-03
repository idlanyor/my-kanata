import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Radio, Send, Users, UsersRound, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { Card, Button, Pill, FormField, Input } from '../components/ui';
import NoticeModal from '../components/NoticeModal';
import { useModalFeedback } from '../hooks/useModalFeedback';

const Broadcast = () => {
  const [form, setForm] = useState({
    target: 'all_users',
    message: '',
    scheduledAt: ''
  });
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const { notice, showNotice, closeNotice } = useModalFeedback();

  useEffect(() => {
    api.get('/api/bot/broadcasts')
      .then(({ data }) => setHistory(data || []))
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.message) return;
    setSending(true);
    try {
      const payload = {
        target: form.target,
        message: form.message
      };
      if (form.scheduledAt) payload.scheduledAt = new Date(form.scheduledAt).toISOString();

      const { data } = await api.post('/api/bot/broadcast', payload);
      showNotice({
        title: form.scheduledAt ? 'Scheduled' : 'Sent',
        message: data.message || `Broadcast ${form.scheduledAt ? 'scheduled' : 'sent'} successfully.`,
        tone: 'success'
      });
      setForm((p) => ({ ...p, message: '', scheduledAt: '' }));
      // Refresh history
      api.get('/api/bot/broadcasts').then(({ data: d }) => setHistory(d || [])).catch(() => {});
    } catch (err) {
      showNotice({ title: 'Failed', message: err.response?.data?.error || err.message, tone: 'error' });
    } finally {
      setSending(false);
    }
  };

  const targets = [
    { value: 'all_users', label: 'All Users', icon: Users },
    { value: 'all_groups', label: 'All Groups', icon: UsersRound },
  ];

  return (
    <>
      <div className="space-y-4 pb-8">
        <div className="flex items-center gap-3 bg-[var(--bg-card)] p-4 rounded-lg border border-[var(--border-color)] shadow-sm">
          <div className="w-10 h-10 bg-accent/10 text-accent rounded-lg flex items-center justify-center border border-accent/20">
            <Radio size={20} />
          </div>
          <div>
            <h1 className="heading-primary">Broadcast Message</h1>
            <p className="heading-secondary">Send bulk messages to users or groups</p>
          </div>
        </div>

        <Card className="p-4 sm:p-6">
          <form onSubmit={handleSend} className="space-y-4">
            <FormField label="Target">
              <div className="grid grid-cols-2 gap-2">
                {targets.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, target: t.value }))}
                    className={clsx(
                      'p-3 rounded-lg border flex items-center gap-2 transition-all text-left',
                      form.target === t.value
                        ? 'bg-accent/10 border-accent/30 text-accent'
                        : 'bg-[var(--bg-main)] border-[var(--border-color)] text-[var(--text-secondary)]'
                    )}
                  >
                    <t.icon size={16} />
                    <span className="text-xs font-bold">{t.label}</span>
                  </button>
                ))}
              </div>
            </FormField>

            <FormField label="Message">
              <textarea
                rows={5}
                value={form.message}
                onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg outline-none focus:ring-1 focus:ring-accent/50 text-sm resize-y"
                placeholder="Type broadcast message..."
                required
              />
            </FormField>

            <FormField label="Schedule (optional)" hint="Leave empty to send immediately">
              <Input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => setForm((p) => ({ ...p, scheduledAt: e.target.value }))}
              />
            </FormField>

            <div className="flex justify-end">
              <Button type="submit" variant="primary" disabled={sending}>
                {form.scheduledAt ? <Clock size={14} /> : <Send size={14} />}
                {sending ? 'Processing...' : form.scheduledAt ? 'Schedule Broadcast' : 'Send Now'}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="p-4">
          <h2 className="heading-primary mb-3">Broadcast History</h2>
          {loadingHistory ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-[var(--bg-main)] rounded animate-pulse" />)}
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] text-center py-6">No broadcasts yet</p>
          ) : (
            <div className="space-y-2">
              {history.map((b, i) => (
                <div key={b._id || i} className="p-3 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)]">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Pill tone={b.status === 'sent' ? 'success' : b.status === 'scheduled' ? 'warning' : 'neutral'}>{b.status || 'sent'}</Pill>
                      <span className="text-[10px] text-[var(--text-secondary)]">{b.target}</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-secondary)]">{new Date(b.createdAt || b.sentAt).toLocaleString('id-ID')}</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1 truncate">{b.message}</p>
                  {b.sent != null && <p className="text-[10px] text-emerald-500 mt-1">Sent to {b.sent} recipients</p>}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      <NoticeModal open={notice.open} title={notice.title} message={notice.message} tone={notice.tone} onClose={closeNotice} />
    </>
  );
};

export default Broadcast;
