import { fetchAPI } from '../../lib/api.js';
import { adContext } from '../../lib/adReply.js';
import logger from '../../lib/logger.js';

export default {
    name: 'ig',
    aliases: ['igdl', 'instagram'],
    description: 'Download Instagram media directly',
    category: 'Downloader',

    execute: async (sock, m, args, text) => {
        if (!text) return m.reply('Please provide an Instagram URL.');
        await m.reply('Processing...');
        
        try {
            const data = await fetchAPI('/instagram/fetch', { url: text });
            if (!data || data.status !== 'success' || !data.results?.length) return m.reply('Gagal mengambil data.');

            const ctx = await adContext({ 
                title: 'INSTAGRAM DOWNLOADER', 
                body: data.results[0]?.author || 'Instagram Media', 
                thumbnail: data.results[0]?.thumbnail 
            });

            for (const result of data.results) {
                for (const media of result.medias) {
                    const mediaType = media.extension === 'mp4' ? 'video' : 'image';
                    sock.sendMessage(m.chat, { 
                        [mediaType]: { url: media.url },
                        caption: `✅ *Instagram Media Downloaded*`,
                        contextInfo: ctx
                    }, { quoted: m }).catch(err => logger.error(err, 'IG Send Error'));
                }
            }
        } catch (err) {
            console.error(err);
            await m.reply('An error occurred while processing your request.');
        }
    }
};
