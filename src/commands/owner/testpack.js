import { generateWAMessageFromContent } from '@whiskeysockets/baileys';
import { settings } from '../../config/settings.js';
import axios from 'axios';

export default {
    name: 'testpack',
    description: 'Experimental: Advanced Sticker Pack Message',
    category: 'Owner',
    execute: async (sock, m, args) => {
        const sender = m.sender;
        const isOwner = sender === settings.ownerNumber || sender === settings.ownerLid || sender.split(':')[0] === settings.ownerNumber.split('@')[0];
        if (!isOwner) return;

        await m.reply('Sending advanced experimental sticker pack message...');

        try {
            // Let's use a real image for thumbnail
            const thumbUrl = 'https://api.kanata.web.id/uploads/7f9720eca5ada1b38bd244eeea48532b.jpeg';
            const thumbRes = await axios.get(thumbUrl, { responseType: 'arraybuffer' });
            const thumbBuffer = Buffer.from(thumbRes.data);

            const msg = generateWAMessageFromContent(m.chat, {
                stickerPackMessage: {
                    stickerPackId: 'kanata_pack_' + Date.now(),
                    name: 'Kanata Advanced Pack',
                    publisher: 'Roy Kanata',
                    description: 'Testing multimodal sticker pack integration',
                    thumbnails: [thumbBuffer],
                    stickerCount: 10,
                    mimetype: 'image/webp',
                    // These fields are usually needed for media messages
                    fileLength: thumbBuffer.length,
                    fileSha256: Buffer.alloc(32), 
                    fileEncSha256: Buffer.alloc(32),
                    mediaKey: Buffer.alloc(32),
                }
            }, { quoted: m });

            // Using relayMessage to bypass standard sendMessage restrictions
            await sock.relayMessage(m.chat, msg.message, { messageId: msg.key.id });

            await m.reply('Relay sent. Check your phone!');

        } catch (error) {
            console.error('StickerPack Advanced Error:', error);
            await m.reply(`Error: ${error.message}`);
        }
    }
};