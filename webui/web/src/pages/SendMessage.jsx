import React, { useState } from 'react';
import api from '../services/api';
import { Send, MessageSquare } from 'lucide-react';
import { Card, Button, FormField, Input } from '../components/ui';
import NoticeModal from '../components/NoticeModal';
import { useModalFeedback } from '../hooks/useModalFeedback';

const SendMessage = () => {
  const [form, setForm] = useState({ recipient: '', message: '', type: 'text' });
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);
  const { notice, showNotice, closeNotice } = useModalFeedback();

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.recipient || !form.message) return;
    setSending(true);
    try {
      await api.post('/api/bot/send-message', {
        recipient: form.recipient.includes('@') ? form.recipient : form.recipient + '@s.whatsapp.net',
        message: form.message,
        type: form.type
      });
      setHistory((prev) => [{ ...form, sentAt: new Date().toISOString() }, ...prev].slice(0, 20));
      showNotice({ title: 'Sent', message: `Message sent to ${form.recipient}`, tone: 'success' });
      setForm((p) => ({ ...p, message: '' }));
    } catch (err) {
      showNotice({ title: 'Failed', message: err.response?.data?.error || err.message, tone: 'error' });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="space-y-4 pb-8">
        <div className="flex items-center gap-3 bg-[var(--bg-card)] p-4 rounded-lg border border-[var(--border-color)] shadow-sm">
          <div className="w-10 h-10 bg-accent/10 text-accent rounded-lg flex items-center justify-center border border-accent/20">
            <MessageSquare size={20} />
          </div>
          <div>
            <h1 className="heading-primary">Send Message</h1>
            <p className="heading-secondary">Send direct message via bot</p>
          </div>
        </div>

        <Card className="p-4 sm:p-6">
          <form onSubmit={handleSend} className="space-y-4">
            <FormField label="Recipient (Phone or JID)">
              <Input
                value={form.recipient}
                onChange={(e) => setForm((p) => ({ ...p, recipient: e.target.value }))}
                placeholder="628123456789 or 628123456789@s.whatsapp.net"
                required
              />
            </FormField>
            <FormField label="Message">
              <textarea
                rows={4}
                value={form.message}
                onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg outline-none focus:ring-1 focus:ring-accent/50 text-sm resize-y"
                placeholder="Type your message..."
                required
              />
            </FormField>
            <div className="flex justify-end">
              <Button type="submit" variant="primary" disabled={sending}>
                <Send size={14} /> {sending ? 'Sending...' : 'Send Message'}
              </Button>
            </div>
          </form>
        </Card>

        {history.length > 0 && (
          <Card className="p-4">
            <h2 className="heading-primary mb-3">Recent Sent (this session)</h2>
            <div className="space-y-2">
              {history.map((h, i) => (
                <div key={i} className="p-3 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)]">
                  <div className="flex justify-between">
                    <span className="text-xs font-bold text-[var(--text-primary)]">{h.recipient}</span>
                    <span className="text-[10px] text-[var(--text-secondary)]">{new Date(h.sentAt).toLocaleTimeString('id-ID')}</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1 truncate">{h.message}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
      <NoticeModal open={notice.open} title={notice.title} message={notice.message} tone={notice.tone} onClose={closeNotice} />
    </>
  );
};

export default SendMessage;
