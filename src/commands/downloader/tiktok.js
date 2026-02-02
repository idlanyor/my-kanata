import { fetchAPI } from '../../lib/api.js';

export default {
    name: 'tt',
    aliases: ['tt', 'ttdl'],
    description: 'Download TikTok video without watermark',
    execute: async (sock, m, args, text) => {
        if (!text) return m.reply('Please provide a TikTok URL.');
        
        await m.reply('Processing your request...');
        
        try {
            const data = await fetchAPI('/tiktok/fetch', { url: text });
            
            if (!data || data.status !== 'success' || !data.nowatermark_videos || data.nowatermark_videos.length === 0) {
                return m.reply('Failed to fetch TikTok data. Make sure the URL is valid.');
            }

            const videoUrl = data.nowatermark_videos[0].url;

            const caption = ` *TikTok Downloader*\n\n` +
                          ` *Author:* ${data.author || 'N/A'}\n` +
                          ` *Caption:* ${data.caption || 'No caption'}\n\n` +
                          `Powered by KanataAPI`;

            await sock.sendMessage(m.chat, { 
                video: { url: videoUrl }, 
                caption: caption 
            }, { quoted: m });
            
        } catch (err) {
            console.error(err);
            await m.reply(' An error occurred while fetching the video.');
        }
    }
};
