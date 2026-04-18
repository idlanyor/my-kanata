import ytSearch from 'yt-search';
import { fetchAPI } from '../../lib/api.js';

export default {
    name: 'playv',
    aliases: ['playvideo', 'pv'],
    description: 'Search and play video from YouTube',
    category: 'Downloader',
    execute: async (sock, m, args, text) => {
        if (!text) return m.reply('Please provide a song title or YouTube URL.');

        // console.log(`[DEBUG] Playv command triggered with text: ${text}`);
        await m.reply('Searching and processing...');

        try {
            const quality = '720';
            const search = await ytSearch(text);
            const video = search.videos[0];

            if (!video) {
                return m.reply('No results found.');
            }

            const data = await fetchAPI('https://api.ryzumi.net/api/downloader/ytmp4', { url: video.url, quality });

            if (!data || typeof data.url !== 'string') {
                return m.reply('Failed to retrieve video download link.');
            }

            // Helper function to format duration (seconds -> MM:SS or HH:MM:SS)
            const formatDuration = (seconds) => {
                const totalSeconds = Number(seconds) || 0;
                const h = Math.floor(totalSeconds / 3600);
                const m = Math.floor((totalSeconds % 3600) / 60);
                const s = totalSeconds % 60;
                const hDisplay = h > 0 ? `${h}:` : '';
                const mDisplay = m < 10 && h > 0 ? `0${m}:` : `${m}:`;
                const sDisplay = s < 10 ? `0${s}` : s;
                return hDisplay + mDisplay + sDisplay;
            };

            const caption = ` *YouTube Video*\n\n` +
                            ` *Title:* ${data.title || video.title}\n` +
                            ` *Channel:* ${data.author || video.author.name}\n` +
                            ` *Duration:* ${video.timestamp || formatDuration(video.seconds)}\n` +
                            ` *View Count:* ${new Intl.NumberFormat('id-ID').format(Number(video.views) || 0)}\n` +
                            ` *Uploaded:* ${video.ago || 'Unknown'}\n` +
                            ` *URL:* ${video.url}\n` +
                            ` *Quality:* ${data.quality || `${quality}p`}\n` +
                            ` *Source:* api.ryzumi.net\n\n` +
                            ` *Description:*\n${video.description || 'No description available'}`;
            const safeCaption = caption.slice(0, 950);

            await m.reply(safeCaption);

            await sock.sendMessage(m.chat, { 
                video: { url: data.url }, 
                mimetype: 'video/mp4'
            }, { quoted: m });

        } catch (err) {
            console.error(`[DEBUG] Playv command failed:`, err);
            await m.reply(' An error occurred while processing the video.');
        }
    }
};
