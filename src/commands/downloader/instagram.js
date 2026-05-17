import { fetchAPI } from '../../lib/api.js';
import logger from '../../lib/logger.js';

export default {
    name: 'ig',
    aliases: ['igdl', 'instagram'],
    description: 'Download Instagram media directly',
    category: 'Downloader',

    execute: async (sock, m, args, text) => {
        if (!text) return m.reply('Please provide an Instagram URL.');
        await m.react('⏳');
        
        try {
            const data = await fetchAPI('/instagram/fetch', { url: text });
            if (!data || data.status !== 'success' || !data.results?.length) {
                await m.react('❌');
                return m.reply('Gagal mengambil data.');
            }

            for (const result of data.results) {
                for (const media of result.medias) {
                    const mediaType = media.extension === 'mp4' ? 'video' : 'image';
                    await sock.sendMessage(m.chat, { 
                        [mediaType]: { url: media.url },
                        caption: `✅ *Instagram Media Downloaded*`
                    }, { quoted: m });
                }
            }
            await m.react('✅');
        } catch (err) {
            logger.error(err, 'IG Send Error');
            await m.react('❌');
            await m.reply('An error occurred while processing your request.');
        }
    }
};
