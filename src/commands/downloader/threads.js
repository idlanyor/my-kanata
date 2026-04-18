import { fetchAPI } from '../../lib/api.js';

export default {
    name: 'threads',
    aliases: ['threadsdl'],
    description: 'Download Threads media',
    category: 'Downloader',
    execute: async (sock, m, args, text) => {
        if (!text) return m.reply('Please provide a Threads URL.');
        
        await m.reply('Processing your request...');
        
        try {
            const data = await fetchAPI('/threads/fetch', { url: text });
            
            if (!data || !data.video_url) {
                return m.reply('Failed to fetch Threads media.');
            }

            await sock.sendMessage(m.chat, { 
                video: { url: data.video_url }, 
                caption: ` *Threads Downloaded*\n\nPowered by KanataAPI`
            }, { quoted: m });
            
        } catch (err) {
            console.error(err);
            await m.reply(' An error occurred while fetching the media.');
        }
    }
};
