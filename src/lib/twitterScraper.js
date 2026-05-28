import axios from 'axios';
import logger from '../utils/logger.js';

/**
 * Scrapes Twitter/X video using getxbot.com
 */
async function scrapeTwitter(url) {
    try {
        logger.info(`Scraping Twitter URL: ${url}`);

        const { data } = await axios.post(
            'https://www.getxbot.com/api/parse',
            {
                videoId: url,
                p: 1,
            },
            {
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    Origin: 'https://www.getxbot.com',
                    Referer: 'https://www.getxbot.com/',
                },
            }
        );

        if (data.code !== 0 || !data.data) {
            throw new Error(data.message || 'Failed to parse Twitter video');
        }

        const videoKeys = Object.keys(data.data);
        if (videoKeys.length === 0) {
            throw new Error('No video found in the tweet');
        }

        const variants = Array.isArray(data.data[videoKeys[0]]) ? data.data[videoKeys[0]] : [];
        const medias = variants
            .filter((v) => v && v.url)
            .map((v) => ({
                url: v.url,
                quality: v.size || 'unknown',
                type: 'video',
                extension: 'mp4',
            }));

        if (medias.length === 0) {
            throw new Error('No downloadable video variant found');
        }

        medias.sort((a, b) => {
            const resA = parseInt(String(a.quality).split('x')[0], 10) || 0;
            const resB = parseInt(String(b.quality).split('x')[0], 10) || 0;
            return resB - resA;
        });

        return {
            title: 'Twitter Video',
            medias,
        };
    } catch (error) {
        logger.error('Error in Twitter scraper:', error.response?.data || error.message);
        throw error;
    }
}

export { scrapeTwitter };
