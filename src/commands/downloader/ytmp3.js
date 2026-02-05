import { fetchAPI } from '../../lib/api.js';

export default {
    name: 'ytmp3',
    aliases: ['ytaudio', 'yta'],
    description: 'Download YouTube audio',
    execute: async (sock, m, args, text) => {
        if (!text) return m.reply('Please provide a YouTube URL.');
        
        // console.log(`[DEBUG] ytmp3 triggered for URL: ${text}`);
        await m.reply('Processing your request...');
        
        try {
            // console.log(`[DEBUG] Fetching audio API for: ${text}`);
            const data = await fetchAPI('/youtube2/download-audio', { url: text });
            
            if (data.status !== 'success' || !data.full_url) {
                // console.log(`[DEBUG] ytmp3 API Failure:`, data);
                return m.reply('Failed to fetch YouTube audio. Make sure the URL is valid.');
            }

            // console.log(`[DEBUG] ytmp3 success, sending audio from: ${data.full_url.substring(0, 50)}...`);
            await sock.sendMessage(m.chat, { 
                audio: { url: data.full_url }, 
                mimetype: 'audio/mpeg',
                fileName: `${data.title || 'audio'}.mp3`
            }, { quoted: m });
            
            // console.log(`[DEBUG] ytmp3 sent successfully`);
        } catch (err) {
            console.error(`[DEBUG] ytmp3 error:`, err);
            await m.reply(' An error occurred while fetching the audio.');
        }
    }
};
