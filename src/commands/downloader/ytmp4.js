import { fetchAPI } from '../../lib/api.js';

export default {
    name: 'ytmp4',
    aliases: ['ytvideo', 'ytdl'],
    description: 'Download YouTube video',
    execute: async (sock, m, args, text) => {
        if (!text) return m.reply('Please provide a YouTube URL.');
        
        // console.log(`[DEBUG] ytmp4 triggered for URL: ${text}`);
        await m.reply('Processing your request...');
        
        try {
            // console.log(`[DEBUG] Fetching video API for: ${text}`);
            const data = await fetchAPI('/youtube/download', { url: text });
            
            if (data.status !== 'success' || !data.full_url) {
                // console.log(`[DEBUG] ytmp4 API Failure:`, data);
                return m.reply('Failed to fetch YouTube video. Make sure the URL is valid.');
            }

            // console.log(`[DEBUG] ytmp4 success, sending video from: ${data.full_url.substring(0, 50)}...`);
            await sock.sendMessage(m.chat, { 
                video: { url: data.full_url }, 
                caption: ` *YouTube Downloaded*\n\nTitle: ${data.title || 'N/A'}\n\nPowered by KanataAPI`
            }, { quoted: m });
            
            // console.log(`[DEBUG] ytmp4 sent successfully`);
        } catch (err) {
            console.error(`[DEBUG] ytmp4 error:`, err);
            await m.reply(' An error occurred while fetching the video.');
        }
    }
};
