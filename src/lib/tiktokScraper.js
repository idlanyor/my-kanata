import puppeteer from 'puppeteer';
import logger from '../utils/logger.js';

export const getTikTokProfileVideos = async (username) => {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
        const page = await browser.newPage();
        const url = username.startsWith('http')
            ? username
            : `https://www.tiktok.com/@${username.replace('@', '')}`;

        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
        );
        await page.goto(url, { waitUntil: 'networkidle2' });

        logger.info(`Scanning profile: ${url}...`, 'SCRAPER');

        // Scroll down to load all videos (TikTok uses lazy loading)
        let prevHeight = -1;
        let maxScrolls = 10; // Adjust if they have HUNDREDS of videos
        let scrolls = 0;

        while (scrolls < maxScrolls) {
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await new Promise((resolve) => setTimeout(resolve, 2000));

            let newHeight = await page.evaluate(() => document.body.scrollHeight);
            if (newHeight === prevHeight) break;
            prevHeight = newHeight;
            scrolls++;
        }

        // Extract Links
        const videos = await page.evaluate(() => {
            const anchors = Array.from(document.querySelectorAll('a'));
            return anchors
                .map((a) => a.href)
                .filter((href) => href.includes('/video/'))
                .filter((v, i, a) => a.indexOf(v) === i); // Unique
        });

        await browser.close();
        return videos;
    } catch (error) {
        await browser.close();
        logger.error(error, 'TikTok Scraper Error');
        return [];
    }
};
