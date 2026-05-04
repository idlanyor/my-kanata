import { fetchAPI } from '../../lib/api.js';
import { adContext } from '../../lib/adReply.js';

export default {
    name: 'tt',
    aliases: ['ttdl', 'tiktok'],
    description: 'Download TikTok video or images directly',
    category: 'Downloader',
    
    execute: async (sock, m, args, text) => {
        if (!text) return m.reply('Please provide a TikTok URL.');
        await m.reply('Processing...');
        
        try {
            const data = await fetchAPI('/tiktok2', { url: text });
            if (!data || data.status !== 'success') return m.reply('Gagal mengambil data.');

            const ctx = await adContext({ 
                title: 'TIKTOK DOWNLOADER', 
                body: data.author || 'TikTok Media', 
                thumbnail: data.cover 
            });

            if (data.images?.length > 0) {
                // Handle Slideshow
                for (const img of data.images) {
                    sock.sendMessage(m.chat, { 
                        image: { url: img.url || img },
                        caption: `📸 *TikTok Image*`,
                        contextInfo: ctx
                    }, { quoted: m }).catch(err => console.error('TT Send Error', err));
                }
            } else if (data.nowatermark_videos?.length > 0) {
                // Handle Video
                sock.sendMessage(m.chat, { 
                    video: { url: data.nowatermark_videos[0].url }, 
                    caption: `🎬 *TikTok Video (No Watermark)*\n\n*Author:* ${data.author || 'Unknown'}\n*Description:* ${data.description || 'No description'}`,
                    contextInfo: ctx
                }, { quoted: m }).catch(err => console.error('TT Send Error', err));
            } else {
                await m.reply('No downloadable media found.');
            }
        } catch (err) {
            console.error(err);
            await m.reply('An error occurred while processing your request.');
        }
    }
};
