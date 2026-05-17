import { scrapeTwitter } from '../../lib/twitterScraper.js';

export default {
    name: 'xdl',
    aliases: ['twdl'],
    description: 'Download Twitter/X video',
    category: 'Downloader',
    execute: async (sock, m, args, text) => {
        if (!text) return m.reply('Please provide a Twitter/X URL.');

        const isTwitterUrl = /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\//i.test(text);
        if (!isTwitterUrl) {
            return m.reply('Invalid URL. Please send a valid Twitter/X link.');
        }

        await m.react('⏳');

        try {
            const data = await scrapeTwitter(text);

            if (!data || !Array.isArray(data.medias) || data.medias.length === 0) {
                await m.react('❌');
                return m.reply('Failed to fetch Twitter/X video.');
            }

            const bestVideo = data.medias[0];
            const caption = ` *TWITTER/X DOWNLOADER*\n\n` +
                `  ◦  *Title* : ${data.title || 'Twitter Video'}\n` +
                `  ◦  *Quality* : ${bestVideo.quality || 'unknown'}\n\n` +
                `Powered by getxbot`;

            await sock.sendMessage(
                m.chat,
                {
                    video: { url: bestVideo.url },
                    caption
                },
                { quoted: m }
            );
            await m.react('✅');
        } catch (err) {
            console.error(err);
            await m.react('❌');
            await m.reply('An error occurred while fetching Twitter/X video.');
        }
    }
};
