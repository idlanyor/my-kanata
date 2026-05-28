import { fetchAPI } from '../../lib/api.js';

export default {
    name: 'tt',
    aliases: ['ttdl', 'tiktok'],
    description: 'Download TikTok video or images directly',
    category: 'Downloader',

    execute: async (sock, m, args, text) => {
        if (!text) return m.reply('Please provide a TikTok URL.');
        await m.react('⏳');

        try {
            const data = await fetchAPI('/tiktok2', { url: text });
            if (!data || data.status !== 'success') {
                await m.react('❌');
                return m.reply('Gagal mengambil data.');
            }

            if (data.images?.length > 0) {
                // Handle Slideshow
                for (const img of data.images) {
                    await sock.sendMessage(
                        m.chat,
                        {
                            image: { url: img.url || img },
                            caption: `📸 *TikTok Image*`,
                        },
                        { quoted: m }
                    );
                }
            } else if (data.nowatermark_videos?.length > 0) {
                // Handle Video
                await sock.sendMessage(
                    m.chat,
                    {
                        video: { url: data.nowatermark_videos[0].url },
                        caption: `🎬 *TikTok Video (No Watermark)*\n\n*Author:* ${data.author || 'Unknown'}\n*Description:* ${data.description || 'No description'}`,
                    },
                    { quoted: m }
                );
            } else {
                await m.react('❌');
                await m.reply('No downloadable media found.');
                return;
            }
            await m.react('✅');
        } catch (err) {
            console.error(err);
            await m.react('❌');
            await m.reply('An error occurred while processing your request.');
        }
    },
};
