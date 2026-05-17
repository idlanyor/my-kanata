import axios from 'axios';
import ytSearch from 'yt-search';
import { fetchAPI } from '../../lib/api.js';

export default {
    name: 'playv',
    aliases: ['playvideo', 'pv'],
    description: 'Search and play video from YouTube',
    category: 'Downloader',
    execute: async (sock, m, args, text) => {
        if (!text) return m.reply('Please provide a song title or YouTube URL.');

        const resFlag = args.find(arg => arg.startsWith('--') && /\d+/.test(arg));
        const requestedRes = resFlag ? resFlag.replace('--', '') : null;
        const cleanQuery = text.replace(resFlag, '').trim();

        // console.log(`[DEBUG] Playv command triggered with text: ${cleanQuery}`);
        await m.react('⏳');

        try {
            const search = await ytSearch(cleanQuery);
            const video = search.videos[0];

            if (!video) {
                await m.react('❌');
                return m.reply('No results found.');
            }

            const data = await fetchAPI('https://api.kanata.web.id/ytdown/fetch', { url: video.url });

            if (!data || data.status !== 'success' || !data.data?.links) {
                await m.react('❌');
                return m.reply('Failed to retrieve video download link.');
            }

            let videoLink;
            if (requestedRes) {
                videoLink = data.data.links.find(l => l.type === 'Video' && l.res.includes(requestedRes));
            }
            
            if (!videoLink) {
                // Default to 360p, then HD, then whatever is available
                videoLink = data.data.links.find(l => l.type === 'Video' && (l.res.includes('360') || l.quality === 'SD' && l.res.includes('640x360'))) ||
                            data.data.links.find(l => l.type === 'Video' && l.quality === 'HD') || 
                            data.data.links.find(l => l.type === 'Video');
            }

            if (!videoLink) {
                await m.react('❌');
                return m.reply('No downloadable video link found.');
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
                            ` *Title:* ${data.data.title || video.title}\n` +
                            ` *Channel:* ${data.data.user_info?.name || video.author.name}\n` +
                            ` *Duration:* ${videoLink.duration || video.timestamp || formatDuration(video.seconds)}\n` +
                            ` *Size:* ${videoLink.size}\n` +
                            ` *Quality:* ${videoLink.quality || videoLink.res}\n` +
                            ` *Source:* Kanata API\n\n` +
                            ` *Description:*\n${(data.data.description || video.description || 'No description available').slice(0, 500)}`;
            const safeCaption = caption.slice(0, 950);

            let finalUrl = videoLink.proxy_url || videoLink.url;
            
            // If it's a proxy_url, it might return a JSON with the real fileUrl
            if (videoLink.proxy_url) {
                try {
                    const proxyResp = await axios.get(videoLink.proxy_url);
                    if (proxyResp.data && proxyResp.data.fileUrl) {
                        finalUrl = proxyResp.data.fileUrl;
                    }
                } catch (e) {
                    console.error('Proxy URL fetch failed, falling back to direct URL:', e.message);
                    if (!videoLink.url || videoLink.url === 'Waiting...') {
                        await m.react('❌');
                        return m.reply('Failed to retrieve final video URL.');
                    }
                    finalUrl = videoLink.url;
                }
            }

            if (!finalUrl || finalUrl === 'Waiting...') {
                await m.react('❌');
                return m.reply('Video is still processing or unavailable. Please try again in a moment.');
            }

            // Download as buffer to ensure it's playable on mobile
            const videoResponse = await axios.get(finalUrl, { 
                responseType: 'arraybuffer',
                headers: {
                    'accept': '*/*'
                }
            });
            const videoBuffer = Buffer.from(videoResponse.data);

            await sock.sendMessage(m.chat, { 
                video: videoBuffer, 
                mimetype: 'video/mp4',
                caption: safeCaption,
                fileName: `${data.data.title || video.title}.mp4`
            }, { quoted: m });
            await m.react('✅');

        } catch (err) {
            console.error(`[DEBUG] Playv command failed:`, err);
            await m.react('❌');
            await m.reply(' An error occurred while processing the video.');
        }
    }
};
