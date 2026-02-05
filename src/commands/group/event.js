import { randomBytes } from 'node:crypto';

export default {
    name: 'event',
    aliases: ['acara', 'addevent'],
    description: 'Bikin acara grup (WA Beta Feature - YeBail Style)',
    category: 'Group',
    execute: async (sock, m, args, text) => {
        if (!m.isGroup) return m.reply('Hanya bisa di grup!');
        if (!text) return m.reply('Format: .event Nama Acara | Deskripsi | Lokasi');

        const [name, desc, loc] = text.split('|').map(v => v.trim());
        if (!name) return m.reply('Nama acara wajib diisi!');

        try {
            const startTime = Math.floor(Date.now() / 1000) + 3600;
            const endTime = startTime + 3600;

            // Mengikuti struktur rumit dari Ye-Bail yang terbukti work
            const messageContent = {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: {
                            deviceListMetadata: {},
                            deviceListMetadataVersion: 2,
                            messageSecret: randomBytes(32),
                            supportPayload: JSON.stringify({
                                version: 2,
                                is_ai_message: true,
                                should_show_system_message: true,
                                ticket_id: randomBytes(16).toString('hex')
                            })
                        },
                        eventMessage: {
                            contextInfo: {
                                mentionedJid: [m.sender],
                                participant: m.sender,
                                remoteJid: "status@broadcast",
                                forwardedNewsletterMessageInfo: {
                                    newsletterName: "AntiDonasi Creative",
                                    newsletterJid: "120363305152329358@newsletter",
                                    serverMessageId: 1
                                }
                            },
                            isCanceled: false,
                            name: name,
                            description: desc || 'Dibuat oleh Bot Kanata',
                            location: {
                                name: loc || 'WhatsApp Group'
                            },
                            joinLink: '',
                            startTime: startTime,
                            endTime: endTime,
                            extraGuestsAllowed: true
                        }
                    }
                }
            };

            await sock.relayMessage(m.chat, messageContent, {
                messageId: sock.generateMessageIDV2 ? sock.generateMessageIDV2() : undefined
            });
            
            m.reply(' Acara grup berhasil dibuat (YeBail Style)!');
        } catch (err) {
            console.error(err);
            m.reply('Gagal membuat acara.');
        }
    }
};