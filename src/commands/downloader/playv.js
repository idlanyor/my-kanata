import ytSearch from 'yt-search';
import { fetchAPI } from '../../lib/api.js';

export default {
    name: 'playv',
    aliases: ['playvideo', 'pv'],
    description: 'Search and play video from YouTube',
    execute: async (sock, m, args, text) => {
        if (!text) return m.reply('Please provide a song title or YouTube URL.');

        // console.log(`[DEBUG] Playv command triggered with text: ${text}`);
        await m.reply('Searching and processing...');

        try {
            // 1. Search YouTube
            const search = await ytSearch(text);
            const video = search.videos[0];

            if (!video) {
                return m.reply('No results found.');
            }

            // 2. Fetch Video Info from KanataAPI
            // console.log(`[DEBUG] Fetching info for: ${video.url}`);
            const data = await fetchAPI('/youtube/info', { url: video.url });

            if (!data || !data.formats || data.formats.length === 0) {
                return m.reply('Failed to retrieve video information.');
            }

            // 3. Select appropriate format
            // Priority: MP4, has audio (acodec != none), has video (vcodec != none)
            // We often prefer format_id '18' (360p) for compatibility and size, or just the best available match.
            const formats = data.formats.filter(f => 
                f.ext === 'mp4' && 
                f.acodec !== 'none' && 
                f.vcodec !== 'none'
            );

            // Sort by resolution (height) descending, but maybe prefer 360p/480p to avoid hitting limits
            // For now, let's pick the one with format_id '18' if available, otherwise the first compatible one.
            let selectedFormat = formats.find(f => f.format_id === '18') || formats[0];

            if (!selectedFormat) {
                return m.reply('No suitable video format found to send.');
            }

            // Helper function to format duration (seconds -> MM:SS or HH:MM:SS)
            const formatDuration = (seconds) => {
                const h = Math.floor(seconds / 3600);
                const m = Math.floor((seconds % 3600) / 60);
                const s = seconds % 60;
                const hDisplay = h > 0 ? `${h}:` : '';
                const mDisplay = m < 10 && h > 0 ? `0${m}:` : `${m}:`;
                const sDisplay = s < 10 ? `0${s}` : s;
                return hDisplay + mDisplay + sDisplay;
            };

            // Helper to format date (YYYYMMDD -> DD/MM/YYYY)
            const formatDate = (dateStr) => {
                if (!dateStr || dateStr.length !== 8) return dateStr;
                const year = dateStr.substring(0, 4);
                const month = dateStr.substring(4, 6);
                const day = dateStr.substring(6, 8);
                return `${day}/${month}/${year}`;
            };

            const caption = ` *YouTube Video*\n\n` +
                            ` *Title:* ${data.title || video.title}\n` +
                            ` *Channel:* ${data.uploader || video.author.name}\n` +
                            ` *Duration:* ${formatDuration(data.duration)}\n` +
                            ` *View Count:* ${new Intl.NumberFormat('id-ID').format(data.view_count)}\n` +
                            ` *Upload Date:* ${formatDate(data.upload_date)}\n` +
                            ` *URL:* ${data.source_url || video.url}\n\n` +
                            ` *Description:*\n${data.description || 'No description available'}`;

            // 4. Send Video
            await sock.sendMessage(m.chat, { 
                video: { url: selectedFormat.url }, 
                caption: caption,
                mimetype: 'video/mp4'
            }, { quoted: m });

        } catch (err) {
            console.error(`[DEBUG] Playv command failed:`, err);
            await m.reply(' An error occurred while processing the video.');
        }
    }
};
