import puppeteer from 'puppeteer';
import { settings } from '../../config/settings.js';

export default {
    name: 'ssweb',
    aliases: ['ssweb', 'screenshot', 'webss'],
    description: 'Take a screenshot of a website',
    category: 'General',
    execute: async (sock, m, args, text) => {
        if (!text) {
            return sock.sendMessage(m.chat, { text: `Please provide a URL.\nExample: ${settings.prefix}ssweb https://google.com` }, { quoted: m });
        }

        let url = text.trim();
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }

        await sock.sendMessage(m.chat, { text: 'Taking screenshot, please wait...' }, { quoted: m });

        let browser;
        try {
            browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();
            
            // Set viewport to a reasonable desktop size
            await page.setViewport({ width: 1280, height: 720 });

            // Go to URL and wait for network to be idle
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

            const screenshotBuffer = await page.screenshot({ type: 'png', fullPage: false });

            await sock.sendMessage(m.chat, {
                image: screenshotBuffer,
                caption: `Screenshot of: ${url}`,
                contextInfo: {
                    externalAdReply: {
                        title: settings.botName,
                        body: 'Web Screenshot Service',
                        mediaType: 1,
                        previewType: 0,
                        renderLargerThumbnail: true,
                        thumbnail: screenshotBuffer,
                        sourceUrl: url
                    }
                }
            }, { quoted: m });

        } catch (error) {
            console.error('Error in ssweb command:', error);
            await sock.sendMessage(m.chat, { text: `Failed to take screenshot.\nError: ${error.message}` }, { quoted: m });
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }
};
