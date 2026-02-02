import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { Sticker, StickerTypes } from 'wa-sticker-formatter';

export default {
    name: 'sticker',
    aliases: ['s', 'stiker'],
    description: 'Convert image/video to sticker',
    category: 'General',
    execute: async (sock, m, args, text) => {
        try {
            const quoted = m.msg.contextInfo ? m.msg.contextInfo.quotedMessage : null;
            const type = m.mtype;
            
            let messageToDownload = null;
            let mediaType = '';

            if (type === 'imageMessage' || type === 'videoMessage') {
                messageToDownload = m.msg;
                mediaType = type.replace('Message', '');
            } else if (quoted) {
                const quotedType = Object.keys(quoted)[0];
                if (quotedType === 'imageMessage' || quotedType === 'videoMessage') {
                    messageToDownload = quoted[quotedType];
                    mediaType = quotedType.replace('Message', '');
                }
            }

            if (!messageToDownload) {
                return m.reply('Please reply to an image or video/gif with !sticker');
            }

            // console.log(`[DEBUG] Downloading ${mediaType} for sticker...`);
            await m.reply('Processing sticker...');

            const stream = await downloadContentFromMessage(messageToDownload, mediaType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // console.log(`[DEBUG] ${mediaType} downloaded, creating sticker...`);

            const sticker = new Sticker(buffer, {
                pack: 'MyBot Pack',
                author: m.pushName || 'MyBot',
                type: StickerTypes.FULL,
                categories: ['', ''],
                id: m.id,
                quality: 50
            });

            const stickerBuffer = await sticker.toBuffer();
            // console.log(`[DEBUG] Sticker created, sending...`);

            await sock.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: m });
            // console.log(`[DEBUG] Sticker sent successfully`);

        } catch (err) {
            console.error(`[DEBUG] Sticker command failed:`, err);
            await m.reply(' Failed to create sticker.');
        }
    }
};
