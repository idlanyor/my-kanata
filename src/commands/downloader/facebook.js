import { fetchAPI } from '../../lib/api.js';

export default {
    name: 'fb',
    category:'Downloader',
    aliases: ['fb', 'fbdl'],
    description: 'Download Facebook video',
    execute: async (sock, m, args, text) => {
        if (!text) return m.reply('Please provide a Facebook video URL.');
        
        await m.reply('Processing your request...');
        
        try {
            const data = await fetchAPI('/facebook/fetch', { url: text });
            
            if (!data || !data.video_url) {
                return m.reply('Failed to fetch Facebook video.');
            }

            // Fix for URL with '#' which causes 404 because it's interpreted as fragment
            const videoUrl = data.video_url.replace(/#/g, '%23');

            await sock.sendMessage(m.chat, { 
                video: { url: videoUrl }, 
                caption: ` *Facebook Downloaded*\n\n*Title:* ${data.title || 'N/A'}\n\nPowered by KanataAPI`
            }, { quoted: m });
            
        } catch (err) {
            console.error(err);
            await m.reply(' An error occurred while fetching the video.');
        }
    }
};
