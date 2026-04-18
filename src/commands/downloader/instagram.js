import { fetchAPI } from '../../lib/api.js';
import { adContext } from '../../lib/adReply.js';

const igDataCache = new Map();

export default {
    name: 'ig',
    aliases: ['igdl', 'instagram'],
    description: 'Download Instagram media with selection buttons',
    category: 'Downloader',
    buttonPrefix: 'igdl',

    handleButton: async (sock, m) => {
        const buttonId = m.message?.buttonsResponseMessage?.selectedButtonId || 
                         m.message?.templateButtonReplyMessage?.selectedId || 
                         m.message?.listResponseMessage?.singleSelectReply?.selectedRowId || '';

        const [_, type, id] = buttonId.split('_');
        const cache = igDataCache.get(id);

        if (!cache) {
            await m.reply('❌ Session expired.');
            return true;
        }

        try {
            if (type === 'all' || type === 'video' || type === 'image') {
                for (const result of cache.results) {
                    for (const media of result.medias) {
                        const mediaType = media.extension === 'mp4' ? 'video' : 'image';
                        if (type === 'video' && mediaType !== 'video') continue;
                        if (type === 'image' && mediaType !== 'image') continue;

                        await sock.sendMessage(m.chat, { 
                            [mediaType]: { url: media.url },
                            caption: `✅ *Instagram Media*`
                        }, { quoted: m });
                    }
                }
            }
        } catch (err) {
            await m.reply(`❌ Gagal: ${err.message}`);
        }
        return true;
    },

    execute: async (sock, m, args, text) => {
        if (!text) return m.reply('Please provide an Instagram URL.');
        await m.reply('Processing...');
        
        try {
            const data = await fetchAPI('/instagram/fetch', { url: text });
            if (!data || data.status !== 'success' || !data.results?.length) return m.reply('Gagal mengambil data.');

            const igId = Math.random().toString(36).slice(2, 8);
            igDataCache.set(igId, data);
            setTimeout(() => igDataCache.delete(igId), 15 * 60 * 1000);

            const buttons = [{ buttonId: `igdl_all_${igId}`, buttonText: { displayText: '📦 Download All' }, type: 1 }];

            const ctx = await adContext({ title: 'INSTAGRAM DOWNLOADER', body: data.results[0]?.author, thumbnail: data.results[0]?.thumbnail });
            await sock.sendMessage(m.chat, { text: `乂  *INSTAGRAM DOWNLOADER*\n\nPilih format:`, footer: 'Kanata', buttons, contextInfo: ctx }, { quoted: m });
        } catch (err) {
            await m.reply('An error occurred.');
        }
    }
};
