import ytSearch from 'yt-search';
import { fetchAPI } from '../../lib/api.js';

export default {
    name: 'play',
    aliases: ['p'],
    description: 'Search and play audio from YouTube',
    execute: async (sock, m, args, text) => {
        if (!text) return m.reply('Please provide a song title or YouTube URL.');

        // console.log(`[DEBUG] Play command triggered with text: ${text}`);
        await m.reply('Searching...');

        try {
            // console.log(`[DEBUG] Searching YouTube for: ${text}`);
            const search = await ytSearch(text);
            const video = search.videos[0];

            if (!video) {
                // console.log(`[DEBUG] No results found for: ${text}`);
                return m.reply('No results found.');
            }

            // console.log(`[DEBUG] Found video: ${video.title} (${video.url})`);

            let caption = ` *YouTube Play*\n\n`;
            caption += ` *Title:* ${video.title}\n`;
            caption += ` *Channel:* ${video.author.name}\n`;
            caption += ` *Duration:* ${video.timestamp}\n`;
            caption += ` *URL:* ${video.url}\n\n`;
            caption += ` *Downloading audio...*`;

            await sock.sendMessage(m.chat, { 
                image: { url: video.thumbnail }, 
                caption: caption 
            }, { quoted: m });

            // console.log(`[DEBUG] Fetching from KanataAPI using /youtube2/download-audio for URL: ${video.url}`);
            let data = null;
            
            try {
                data = await fetchAPI('/youtube2/download-audio', { url: video.url });
            } catch (e) {
                console.error(`[DEBUG] /youtube2/download-audio error: ${e.message}`);
            }

            if (!data || data.status !== 'success' || !data.full_url) {
                // console.log(`[DEBUG] API Error (both endpoints failed)`);
                return m.reply(' Failed to download audio. The converter might be having trouble with this video. Try another song!');
            }

            // console.log(`[DEBUG] URL received: ${data.full_url.substring(0, 50)}...`);
            // console.log(`[DEBUG] Sending audio stream to WhatsApp...`);

            await sock.sendMessage(m.chat, { 
                audio: { url: data.full_url }, 
                mimetype: 'audio/mpeg',
                fileName: `${video.title}.mp3`
            }, { quoted: m });

            // console.log(`[DEBUG] Request sent to WhatsApp servers.`);
            // console.log(`[DEBUG] Play command completed successfully`);

        } catch (err) {
            console.error(`[DEBUG] Play command failed:`, err);
            await m.reply(' An error occurred during processing.');
        }
    }
};
