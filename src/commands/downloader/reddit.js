import { fetchAPI } from '../../lib/api.js';

export default {
    name: 'reddit',
    aliases: ['redditdl'],
    description: 'Download Reddit video',
    execute: async (sock, m, args, text) => {
        if (!text) return m.reply('Please provide a Reddit URL.');
        
        await m.reply('Processing your request...');
        
        try {
            const data = await fetchAPI('/reddit/fetch', { url: text });
            
            if (!data || !data.download_url) {
                return m.reply('Failed to fetch Reddit video.');
            }

            await sock.sendMessage(m.chat, { 
                video: { url: data.download_url }, 
                caption: ` *Reddit Downloaded*\n\nPowered by KanataAPI`
            }, { quoted: m });
            
        } catch (err) {
            console.error(err);
            await m.reply(' An error occurred while fetching the video.');
        }
    }
};
