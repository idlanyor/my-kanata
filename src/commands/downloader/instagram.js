import { fetchAPI } from '../../lib/api.js';

export default {
    name: 'ig',
    aliases: ['ig', 'igdl'],
    description: 'Download Instagram media',
    execute: async (sock, m, args, text) => {
        if (!text) return m.reply('Please provide an Instagram URL.');
        
        await m.reply('Processing your request...');
        
        try {
            const data = await fetchAPI('/instagram/fetch', { url: text });
            
            if (!data || data.status !== 'success' || !data.results || data.results.length === 0) {
                return m.reply('Failed to fetch Instagram media.');
            }

            for (const result of data.results) {
                const caption = result.title ? `${result.title}\n\n *Instagram Media*\nPowered by KanataAPI` : ` *Instagram Media*\n\nPowered by KanataAPI`;
                
                for (const media of result.medias) {
                    const type = media.extension === 'mp4' ? 'video' : 'image';
                    await sock.sendMessage(m.chat, { 
                        [type]: { url: media.url },
                        caption: caption
                    }, { quoted: m });
                }
            }
            
        } catch (err) {
            console.error(err);
            await m.reply(' An error occurred while fetching the media.');
        }
    }
};
