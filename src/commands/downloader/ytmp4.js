import axios from 'axios';
import { fetchAPI } from '../../lib/api.js';

export default {
    name: 'ytmp4',
    aliases: ['ytvideo', 'ytdl'],
    description: 'Download YouTube video',
    category: 'Downloader',
    execute: async (sock, m, args, text) => {
        if (!text) return m.reply('Please provide a YouTube URL.');
        
        const resFlag = args.find(arg => arg.startsWith('--') && /\d+/.test(arg));
        const requestedRes = resFlag ? resFlag.replace('--', '') : null;
        const cleanUrl = text.replace(resFlag, '').trim();

        await m.react('⏳');
        
        try {
            const data = await fetchAPI('https://api.kanata.web.id/ytdown/fetch', { url: cleanUrl });
            
            if (!data || data.status !== 'success' || !data.data?.links) {
                await m.react('❌');
                return m.reply('Failed to fetch YouTube video. Make sure the URL is valid.');
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

            const caption = ` *YouTube Downloaded*\n\nTitle: ${data.data.title || 'N/A'}\nQuality: ${videoLink.quality || videoLink.res}\nSize: ${videoLink.size}\n\nSource: Kanata API`;

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
                caption: caption,
                fileName: `${data.data.title || 'video'}.mp4`
            }, { quoted: m });
            await m.react('✅');
            
            // console.log(`[DEBUG] ytmp4 sent successfully`);
        } catch (err) {
            console.error(`[DEBUG] ytmp4 error:`, err);
            await m.react('❌');
            await m.reply(' An error occurred while fetching the video.');
        }
    }
};
