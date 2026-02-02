import axios from 'axios';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { Sticker, StickerTypes } from 'wa-sticker-formatter';
import { settings } from '../../config/settings.js';

export default {
    name: 'smeme',
    aliases: ['stickermeme'],
    description: 'Create a sticker with top and bottom text',
    category: 'General',
    execute: async (sock, m, args, text) => {
        try {
            const isQuoted = !!m.quoted;
            const msg = isQuoted ? m.quoted : m.msg;
            const mime = msg.mimetype || '';
            const mtype = isQuoted ? m.quoted.mtype : m.mtype;
            
            const isMedia = /image|sticker/.test(mime) || /imageMessage|stickerMessage/.test(mtype);

            if (!isMedia) {
                return m.reply(`Reply to an image or sticker with *${settings.prefix}smeme top.bottom*`);
            }

            if (!text) {
                return m.reply(`Example: ${settings.prefix}smeme hello.world`);
            }

            await m.reply('Processing smeme...');

            // Download media
            const mediaType = /sticker/.test(mime) || /stickerMessage/.test(mtype) ? 'sticker' : 'image';
            const stream = await downloadContentFromMessage(msg, mediaType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // Upload to a temporary image hosting (like Telegra.ph or similar) to use with Memegen API
            // Or use a direct API if available. 
            // Many public APIs for smeme exist, using a reliable one:
            
            // For now, we use a common method: upload buffer to get URL, then call meme API
            // But to keep it simple and fast, we'll use a direct buffer-based API if possible.
            // Since most smeme APIs require a URL, we'll use a simple trick or a specific API.
            
            // Alternatively, we can use the KanataAPI or similar if it has it.
            // Let's use a known public endpoint for smeme.
            
            // I'll use a widely known public API for this.
            // Handle text logic: if no dot, treat as bottom text only
            let topText, bottomText;
            if (text.includes('.')) {
                const parts = text.split('.');
                topText = parts[0] ? encodeURIComponent(parts[0]) : '_';
                bottomText = parts[1] ? encodeURIComponent(parts[1]) : '_';
            } else {
                topText = '_';
                bottomText = encodeURIComponent(text);
            }

            // Upload to user's custom API (api.kanata.web.id)
            const FormData = (await import('form-data')).default;
            const formData = new FormData();
            // Using the filename from the original or a generic one
            formData.append('file', buffer, { filename: 'image.jpg', contentType: mime });

            const uploadRes = await axios.post('https://api.kanata.web.id/upload', formData, {
                headers: {
                    ...formData.getHeaders(),
                    'accept': 'application/json'
                }
            });

            // Extract URL from the custom API response
            const imageUrl = uploadRes.data.url;

            if (!imageUrl) {
                throw new Error('Failed to get URL from custom API');
            }

            // Now use the memegen API
            const smemeUrl = `https://api.memegen.link/images/custom/${topText}/${bottomText}.png?background=${imageUrl}`;

            const response = await axios.get(smemeUrl, { responseType: 'arraybuffer' });
            const resultBuffer = response.data;

            const sticker = new Sticker(resultBuffer, {
                pack: settings.botName,
                author: m.pushName || 'User',
                type: StickerTypes.FULL,
                quality: 50
            });

            const stickerBuffer = await sticker.toBuffer();
            await sock.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: m });

        } catch (error) {
            console.error('Error creating smeme:', error);
            await m.reply('Failed to create smeme. Make sure you follow the format: top.bottom');
        }
    }
};
