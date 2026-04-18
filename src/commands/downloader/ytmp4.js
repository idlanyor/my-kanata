import { fetchAPI } from '../../lib/api.js';

export default {
    name: 'ytmp4',
    aliases: ['ytvideo', 'ytdl'],
    description: 'Download YouTube video',
    category: 'Downloader',
    execute: async (sock, m, args, text) => {
        if (!text) return m.reply('Please provide a YouTube URL.');
        const quality = '720';
        
        // console.log(`[DEBUG] ytmp4 triggered for URL: ${text}`);
        await m.reply('Processing your request...');
        
        try {
            // console.log(`[DEBUG] Fetching video API for: ${text}`);
            const data = await fetchAPI('https://api.ryzumi.net/api/downloader/ytmp4', { url: text, quality });
            
            if (!data || typeof data.url !== 'string') {
                // console.log(`[DEBUG] ytmp4 API Failure:`, data);
                return m.reply('Failed to fetch YouTube video. Make sure the URL is valid.');
            }

            const caption = ` *YouTube Downloaded*\n\nTitle: ${data.title || 'N/A'}\nChannel: ${data.author || 'N/A'}\nQuality: ${data.quality || `${quality}p`}\n\nSource: api.ryzumi.net`;
            await m.reply(caption);

            // console.log(`[DEBUG] ytmp4 success, sending video from: ${data.url.substring(0, 50)}...`);
            await sock.sendMessage(m.chat, { 
                video: { url: data.url },
                mimetype: 'video/mp4'
            }, { quoted: m });
            
            // console.log(`[DEBUG] ytmp4 sent successfully`);
        } catch (err) {
            console.error(`[DEBUG] ytmp4 error:`, err);
            await m.reply(' An error occurred while fetching the video.');
        }
    }
};
