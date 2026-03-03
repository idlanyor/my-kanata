
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { settings } from '../../config/settings.js';

const getRandom = (ext) => {
    return `${Math.floor(Math.random() * 10000)}${ext}`;
};

export default {
    name: 'toimg',
    description: 'Convert sticker to image',
    aliases: ['toimage', 'img'],
    execute: async (sock, m, args) => {
        let inputPath = '';
        let outPath = '';
        try {
            const target = m.quoted || m;
            const isSticker = !!target.isSticker;
            const isAnimated = !!(target?.msg?.isAnimated || target?.msg?.isAvatar);

            if (!isSticker) {
                return m.reply(`Reply to a sticker with *${settings.prefix}toimg*`);
            }

            await m.reply('Converting...');
            const buffer = await target.download();

            inputPath = path.resolve(getRandom('.webp'));
            outPath = path.resolve(getRandom(isAnimated ? '.mp4' : '.png'));
            fs.writeFileSync(inputPath, buffer);

            const ffmpegCmd = isAnimated
                ? `ffmpeg -y -i "${inputPath}" -movflags +faststart -pix_fmt yuv420p "${outPath}"`
                : `ffmpeg -y -i "${inputPath}" "${outPath}"`;

            exec(ffmpegCmd, async (err) => {
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                if (err) {
                    return m.reply('Failed to convert sticker.');
                }

                const mediaBuffer = fs.readFileSync(outPath);
                if (isAnimated) {
                    await sock.sendMessage(
                        m.chat,
                        { video: mediaBuffer, mimetype: 'video/mp4', caption: 'Converted animated sticker to video' },
                        { quoted: m }
                    );
                } else {
                    await sock.sendMessage(
                        m.chat,
                        { image: mediaBuffer, caption: 'Converted sticker to image' },
                        { quoted: m }
                    );
                }
                if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
            });

        } catch (error) {
            console.error(error);
            if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            if (outPath && fs.existsSync(outPath)) fs.unlinkSync(outPath);
            m.reply('An error occurred.');
        }
    }
};
