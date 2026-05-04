import * as cheerio from 'cheerio';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

async function fetchFDownHtml(facebookUrl) {
    const args = [
        '-sS',
        '-X',
        'POST',
        'https://fdown.net/download.php',
        '-H',
        'Content-Type: application/x-www-form-urlencoded',
        '-H',
        'User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        '-H',
        'Referer: https://fdown.net/',
        '--data-urlencode',
        `URLz=${facebookUrl}`
    ];

    const { stdout } = await execFileAsync('curl', args, {
        timeout: 30000,
        maxBuffer: 1024 * 1024 * 5
    });

    return stdout;
}

async function scrapeFDown(facebookUrl) {
    try {
        const html = await fetchFDownHtml(facebookUrl);
        const $ = cheerio.load(html);

        if ($('title').text().includes('Just a moment')) {
            throw new Error('Blocked by Cloudflare challenge');
        }

        const result = {
            title: $('.lib-row.lib-header').text().trim() || 'No title',
            description: $('.lib-row.lib-desc').first().text().replace('Description:', '').trim() || 'No description',
            duration: $('.lib-row.lib-desc').last().text().replace('Duration:', '').trim() || 'Unknown',
            thumbnail: $('.lib-img-show').attr('src'),
            sd: $('#sdlink').attr('href'),
            hd: $('#hdlink').attr('href'),
        };

        return result;
    } catch (error) {
        console.error('Error scraping Facebook:', error.message);
        return null;
    }
}

export default {
    name: 'fb',
    category: 'Downloader',
    aliases: ['fbdl', 'facebook'],
    description: 'Download Facebook video/reels',
    execute: async (sock, m, args, text) => {
        let url = text || (m.quoted ? (m.quoted.text || m.quoted.message?.conversation) : '');
        if (!url) return m.reply('Please provide a Facebook video URL.');

        // Add reaction
        await sock.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

        try {
            const result = await scrapeFDown(url);

            if (!result || (!result.sd && !result.hd)) {
                await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
                return m.reply('Failed to fetch Facebook video. Make sure the URL is public and accessible.');
            }

            const videoUrl = result.hd || result.sd;
            const quality = result.hd ? 'HD' : 'SD';

            const caption = `🎬 *FACEBOOK DOWNLOADER*\n\n` +
                `📌 *Title:* ${result.title}\n` +
                `⏱️ *Duration:* ${result.duration}\n` +
                `📊 *Quality:* ${quality}\n` +
                `📝 *Desc:* ${result.description}\n\n` +
                `Powered by Kachina-MD`;

            await sock.sendMessage(m.chat, {
                video: { url: videoUrl },
                caption: caption,
                mimetype: 'video/mp4',
                fileName: `fb_video.mp4`
            }, { quoted: m });

            await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (err) {
            console.error('Facebook DL Error:', err);
            await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
            await m.reply('An error occurred while processing your request.');
        }
    }
};
