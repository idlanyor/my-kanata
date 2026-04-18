import axios from 'axios';

export default {
    name: 'fb',
    category: 'Downloader',
    aliases: ['fbdl'],
    description: 'Download Facebook video',
    execute: async (sock, m, args, text) => {
        if (!text) return m.reply('Please provide a Facebook video URL.');

        await m.reply('Processing your request...');

        try {
            const encodedUrl = encodeURIComponent(text);
            const apiUrl = `https://api.ryzumi.net/api/downloader/fbdl?url=${encodedUrl}`;

            const response = await axios.get(apiUrl, {
                headers: {
                    'accept': 'application/json'
                },
                timeout: 30000
            });

            const data = response.data;

            if (!data || !data.status || !data.data || data.data.length === 0) {
                return m.reply('Failed to fetch Facebook video. Make sure the URL is valid.');
            }

            // Find the best quality video (prefer HD/1080p)
            const videoData = data.data.find(v => v.type === 'video') || data.data[0];

            if (!videoData || !videoData.url) {
                return m.reply('No video URL found in response.');
            }

            const resolution = videoData.resolution || 'Unknown';
            const thumbnail = videoData.thumbnail || '';

            const caption = ` *FACEBOOK DOWNLOADER*\n\n` +
                ` *Quality:* ${resolution}\n` +
                ` *Source:* api.ryzumi.net\n\n` +
                ` *Downloading video...*`;

            // Send thumbnail first
            if (thumbnail) {
                await sock.sendMessage(m.chat, {
                    image: { url: thumbnail },
                    caption: caption
                }, { quoted: m });
            }

            // Send video
            await sock.sendMessage(m.chat, {
                video: { url: videoData.url },
                mimetype: 'video/mp4',
                caption: ` *Facebook Video*\n\nQuality: ${resolution}\n\nPowered by KanataAPI`
            }, { quoted: m });

        } catch (err) {
            console.error('Facebook DL Error:', err.message);
            await m.reply(' An error occurred while fetching the video. Make sure the URL is public and accessible.');
        }
    }
};
