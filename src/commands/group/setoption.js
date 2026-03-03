import { jidNormalizedUser } from '@whiskeysockets/baileys';
import Group from '../../database/models/Group.js';
import { clearSettingsCache } from '../../handlers/messageHandler.js';

export default {
    name: 'settings',
    aliases: ['setopt', 'option'],
    description: 'Atur opsi fitur grup (Antilink, Antitoxic, dll)',
    category: 'Group',
    execute: async (sock, m, args, text) => {
        if (!m.isGroup) return m.reply('Perintah ini hanya bisa digunakan di dalam grup!');
        
        // Cek Admin
        const groupMetadata = await sock.groupMetadata(m.chat);
        const participants = groupMetadata.participants;
        const isAdmin = participants.find(p => jidNormalizedUser(p.id) === jidNormalizedUser(m.sender) && (p.admin === 'admin' || p.admin === 'superadmin'));
        
        if (!isAdmin) return m.reply('Hanya admin grup yang bisa menggunakan perintah ini!');

        const options = ['antilink', 'antitoxic', 'welcome', 'left', 'nsfw', 'mute'];
        const input = args[0]?.toLowerCase();

        if (!input || input === 'status') {
            let groupData = await Group.findOne({ jid: m.chat });
            if (!groupData) groupData = await Group.create({ jid: m.chat });

            let status = `*── 「 GROUP OPTIONS 」 ──*\n\n`;
            options.forEach(opt => {
                status += `➛ *${opt.toUpperCase()}*: ${groupData[opt] ? '' : ''}\n`;
            });
            status += `\n*Cara pakai:* .setoption <nama_opsi>\nContoh: .setoption antilink`;

            const ppUrl = await sock.profilePictureUrl(m.chat, 'image').catch(() => null);
            
            return sock.sendMessage(m.chat, {
                text: status,
                contextInfo: {
                    externalAdReply: {
                        title: `SETTINGS: ${groupMetadata.subject}`,
                        body: 'Group Feature Configuration',
                        mediaType: 1,
                        thumbnailUrl: ppUrl,
                        sourceUrl: 'https://api.kanata.web.id',
                        renderLargerThumbnail: true
                    },
                    // --- FAKE QUOTE VERIFIED ---
                    stanzaId: 'VERIFIED',
                    participant: '0@s.whatsapp.net',
                    quotedMessage: {
                        conversation: 'Kanata Bot Official'
                    }
                }
            }, { quoted: m });
        }

        if (!options.includes(input)) {
            return m.reply(`Opsi tidak valid! Pilih: ${options.join(', ')}`);
        }

        try {
            let groupData = await Group.findOne({ jid: m.chat });
            if (!groupData) groupData = await Group.create({ jid: m.chat });

            const newStatus = !groupData[input];
            groupData[input] = newStatus;
            await groupData.save();
            
            clearSettingsCache();

            const ppUrl = await sock.profilePictureUrl(m.chat, 'image').catch(() => null);

            await sock.sendMessage(m.chat, {
                text: ` Berhasil ${newStatus ? 'MENGAKTIFKAN' : 'MENONAKTIFKAN'} fitur *${input.toUpperCase()}* di grup ini.`,
                contextInfo: {
                    externalAdReply: {
                        title: `FEATURE UPDATED`,
                        body: `${input.toUpperCase()} is now ${newStatus ? 'ON' : 'OFF'}`,
                        mediaType: 1,
                        thumbnailUrl: ppUrl,
                        renderLargerThumbnail: false
                    },
                    // --- FAKE QUOTE VERIFIED ---
                    stanzaId: 'VERIFIED',
                    participant: '0@s.whatsapp.net',
                    quotedMessage: {
                        conversation: 'Kanata Bot Official'
                    }
                }
            }, { quoted: m });
        } catch (err) {
            console.error(err);
            m.reply('Gagal merubah opsi grup.');
        }
    }
};