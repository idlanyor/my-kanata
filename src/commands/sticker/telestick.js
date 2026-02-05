import axios from 'axios';
import { Sticker, StickerTypes } from 'wa-sticker-formatter';
import { settings } from '../../config/settings.js';

const TELEGRAM_BOT_TOKEN = '7935827856:AAGdbLXArulCigWyi6gqR07gi--ZPm7ewhc';
const headers = {
    'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
};

async function fetchTeleStickers(url) {
    const match = url.match(/https:\/\/t\.me\/addstickers\/([^\/\?#]+)/);
    if (!match) throw new Error('Invalid Telegram sticker URL');
    
    const setName = match[1].trim();
    const { data: setInfo } = await axios.get(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getStickerSet?name=${setName}`, { headers });
    
    if (!setInfo.ok) throw new Error('Failed to fetch sticker set from Telegram');

    return {
        title: setInfo.result.title,
        stickers: setInfo.result.stickers.slice(0, 10)
    };
}

export default {
    name: 'telestick',
    aliases: ['tgsticker', 'tgs'],
    description: 'Import Stickers from Telegram Pack',
    category: 'Sticker',
    execute: async (sock, m, args, text) => {
        if (!text) return m.reply(`Usage: ${settings.prefix}telestick <telegram_url>`);

        await m.reply('Downloading stickers... (limit 10)');

        try {
            const data = await fetchTeleStickers(text);

            for (const s of data.stickers) {
                const { data: fileInfo } = await axios.get(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${s.file_id}`, { headers });
                const stickerUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileInfo.result.file_path}`;
                
                const response = await axios.get(stickerUrl, { responseType: 'arraybuffer', headers });
                
                const sticker = new Sticker(response.data, {
                    pack: data.title,
                    author: 'Telegram',
                    type: StickerTypes.FULL,
                    quality: 50
                });

                const stickerBuffer = await sticker.toBuffer();
                await sock.sendMessage(m.chat, { sticker: stickerBuffer });
            }

            await m.reply(`Successfully sent ${data.stickers.length} stickers from pack: ${data.title}`);

        } catch (error) {
            console.error('TeleStick Error:', error);
            await m.reply(`Error: ${error.message}`);
        }
    }
};
