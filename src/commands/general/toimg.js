
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { settings } from '../../config/settings.js';

const getRandom = (ext) => {
    return `${Math.floor(Math.random() * 10000)}${ext}`;
};

export default {
    name: 'toimg',
    description: 'Convert sticker to image',
    aliases: ['toimage', 'img'],
    execute: async (sock, m, args) => {
        try {
            const quoted = m.quoted ? m.quoted : m;
            const mime = quoted.mtype || '';
            const isSticker = quoted.message?.stickerMessage;

            if (!isSticker) {
                return m.reply(`Reply to a sticker with *${settings.prefix}toimg*`);
            }

            await m.reply('Converting...');

            const stream = await downloadContentFromMessage(quoted.message.stickerMessage, 'sticker');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            const fileName = getRandom('.webp');
            const outputFiles = getRandom('.png');
            const filePath = path.join('./', fileName);
            const outPath = path.join('./', outputFiles);

            fs.writeFileSync(filePath, buffer);

            exec(`ffmpeg -i ${filePath} ${outPath}`, async (err) => {
                fs.unlinkSync(filePath);
                if (err) {
                    return m.reply('Failed to convert sticker to image.');
                }

                const imageBuffer = fs.readFileSync(outPath);
                await sock.sendMessage(m.chat, { image: imageBuffer, caption: 'Converted successfully' }, { quoted: m });
                fs.unlinkSync(outPath);
            });

        } catch (error) {
            console.error(error);
            m.reply('❌ An error occurred.');
        }
    }
};
