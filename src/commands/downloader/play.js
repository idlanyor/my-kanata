import ytSearch from 'yt-search';
import { fetchAPI } from '../../lib/api.js';

export default {
    name: 'play',
    aliases: ['p'],
    description: 'Search and play audio from YouTube',
    execute: async (sock, m, args, text) => {
        if (!text) return m.reply('Please provide a song title or YouTube URL.');

        // console.log(`[DEBUG] Play command triggered with text: ${text}`);
        await m.react('⏳');

        try {
            const search = await ytSearch(text);
            const video = search.videos[0];

            if (!video) {
                await m.react('❌');
                return m.reply('No results found.');
            }

            const data = await fetchAPI('https://api.ryzumi.net/api/downloader/ytmp3', { url: video.url });

            if (!data || typeof data.url !== 'string') {
                await m.react('❌');
                return m.reply('Failed to retrieve audio download link.');
            }

            const audioTitle = data.title || video.title;
            const audioUrl = data.url;

            let caption = ` *YouTube Play*\n\n`;
            caption += ` *Title:* ${audioTitle}\n`;
            caption += ` *Channel:* ${data.author || video.author.name}\n`;
            caption += ` *Duration:* ${video.timestamp}\n`;
            caption += ` *URL:* ${video.url}\n`;
            caption += ` *Quality:* ${data.quality || 'unknown'}\n`;
            caption += ` *Source:* api.ryzumi.net\n\n`;
            caption += ` *Downloading audio...*`;

            await sock.sendMessage(m.chat, { 
                image: { url: video.thumbnail }, 
                caption: caption 
            }, { quoted: m });

            await sock.sendMessage(m.chat, { 
                audio: { url: audioUrl }, 
                mimetype: 'audio/mpeg',
                fileName: `${audioTitle}.mp3`
            }, { quoted: m });
            await m.react('✅');

        } catch (err) {
            console.error(`[DEBUG] Play command failed:`, err);
            await m.react('❌');
            await m.reply(' An error occurred during processing.');
        }
    }
};
