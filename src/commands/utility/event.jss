import Event from '../../database/models/Event.js';

export default {
    name: 'event',
    description: 'Membuat undangan acara (Kanata-Baileys)',
    category: 'Utility',
    execute: async (sock, m, args, text) => {
        if (!text) return m.reply(`Format: .event Nama Acara`);

        // Mencoba mengirim dengan format standar yang sudah kita fix di core library
        try {
            const eventMsg = await sock.sendMessage(m.chat, {
                event: {
                    name: text,
                    description: 'Undangan acara dari Kanata-Baileys Custom',
                    startDate: new Date(Date.now() + 3600000),
                    location: { name: 'Grup WhatsApp' }
                }
            });

            const messageSecret = eventMsg.messageContextInfo?.messageSecret || 
                                  eventMsg.message?.eventMessage?.messageContextInfo?.messageSecret;

            if (messageSecret) {
                await Event.create({
                    eventId: eventMsg.key.id,
                    chat: m.chat,
                    name: text,
                    messageSecret: messageSecret
                });
            }
        } catch (err) {
            console.error('Error sending event:', err);
            m.reply('Gagal mengirim event. Pastikan library sudah terupdate.');
        }
    }
};