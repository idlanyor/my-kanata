import { fetchAPI } from '../../lib/api.js';
import { adContext } from '../../lib/adReply.js';

// Cache disimpan di level modul plugin
const ttDataCache = new Map();

export default {
    name: 'tt',
    aliases: ['ttdl', 'tiktok'],
    description: 'Download TikTok with selection buttons',
    category: 'Downloader',
    buttonPrefix: 'ttdl',
    
    // Logika handle button langsung di sini
    handleButton: async (sock, m) => {
        const buttonId = m.message?.buttonsResponseMessage?.selectedButtonId || 
                         m.message?.templateButtonReplyMessage?.selectedId || 
                         m.message?.listResponseMessage?.singleSelectReply?.selectedRowId || '';

        const [_, type, id] = buttonId.split('_');
        const cache = ttDataCache.get(id);

        if (!cache) {
            await m.reply('❌ Session expired. Silakan kirim link lagi.');
            return true;
        }

        try {
            if (type === 'video') {
                await sock.sendMessage(m.chat, { 
                    video: { url: cache.nowatermark_videos[0].url }, 
                    caption: `✅ *TIKTOK VIDEO (No WM)*\n\n*Powered by KanataAPI*` 
                }, { quoted: m });
            } else if (type === 'audio') {
                await sock.sendMessage(m.chat, { 
                    audio: { url: cache.musics[0].url }, 
                    mimetype: 'audio/mpeg'
                }, { quoted: m });
            } else if (type === 'images') {
                for (const img of cache.images) {
                    await sock.sendMessage(m.chat, { image: { url: img.url || img } }, { quoted: m });
                }
            }
        } catch (err) {
            await m.reply(`❌ Gagal memproses: ${err.message}`);
        }
        return true;
    },

    execute: async (sock, m, args, text) => {
        if (!text) return m.reply('Please provide a TikTok URL.');
        await m.reply('Processing...');
        
        try {
            const data = await fetchAPI('/tiktok2', { url: text });
            if (!data || data.status !== 'success') return m.reply('Gagal mengambil data.');

            const ttId = Math.random().toString(36).slice(2, 8);
            ttDataCache.set(ttId, data);
            setTimeout(() => ttDataCache.delete(ttId), 15 * 60 * 1000); // Auto-delete cache

            const buttons = [
                { buttonId: `ttdl_video_${ttId}`, buttonText: { displayText: '🎬 Video' }, type: 1 },
                { buttonId: `ttdl_audio_${ttId}`, buttonText: { displayText: '🎵 Audio' }, type: 1 }
            ];
            if (data.images?.length > 0) {
                buttons.push({ buttonId: `ttdl_images_${ttId}`, buttonText: { displayText: `📸 Images (${data.images.length})` }, type: 1 });
            }

            const ctx = await adContext({ title: 'TIKTOK DOWNLOADER', body: data.author, thumbnail: data.cover });
            await sock.sendMessage(m.chat, { text: `乂  *TIKTOK DOWNLOADER*\n\nPilih format:`, footer: 'Kanata', buttons, contextInfo: ctx }, { quoted: m });
        } catch (err) {
            await m.reply('An error occurred.');
        }
    }
};
