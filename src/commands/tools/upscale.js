import axios from 'axios';
import { settings } from '../../config/settings.js';
import { uploadBufferToKanata } from '../../lib/mediaUpload.js';

export default {
    name: 'upscale',
    aliases: ['hd', 'uphd', 'imgup'],
    description: 'Upscale gambar via Chocomilk API (upload pakai Kanata uploader)',
    category: 'Tools',
    execute: async (sock, m) => {
        try {
            const quoted = m.quoted ? m.quoted : m;
            const msg = quoted.msg || quoted;
            const mime = msg.mimetype || '';

            if (!/^image\//i.test(mime) && !/sticker/i.test(mime)) {
                return m.reply(`Reply gambar/sticker dengan *${settings.prefix}upscale*`);
            }

            await m.react('⏳');
            const mediaBuffer = await m.downloadMediaMessage(quoted);
            if (!mediaBuffer || !mediaBuffer.length) {
                return m.reply('Gagal membaca media. Coba kirim ulang gambarnya.');
            }

            const ext = mime.split('/')[1]?.split(';')[0] || 'jpg';
            const filename = msg.fileName || msg.filename || `upscale_${Date.now()}.${ext}`;

            const { url: imageUrl } = await uploadBufferToKanata(mediaBuffer, {
                filename,
                mimeType: mime || 'image/jpeg',
                timeout: 60000
            });

            await m.react('⚙️');
            const upscaleRes = await axios.get('https://chocomilk.amira.us.kg/v1/i2i/upscale', {
                params: { image: imageUrl },
                timeout: 120000
            });

            const upscaledImageUrl = upscaleRes.data?.data?.image;
            if (!upscaledImageUrl) {
                throw new Error(upscaleRes.data?.error || 'Response upscale tidak valid.');
            }

            await sock.sendMessage(m.chat, {
                image: { url: upscaledImageUrl },
                caption: '*Upscale berhasil*'
            }, { quoted: m });
            await m.react('✅');
        } catch (error) {
            console.error('[upscale] error:', error);
            await m.react('❌');
            return m.reply(`Gagal upscale gambar: ${error.message || 'Unknown error'}`);
        }
    }
};
