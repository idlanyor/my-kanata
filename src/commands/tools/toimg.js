
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import sharp from 'sharp';
import { settings } from '../../config/settings.js';
import { makeResultPath } from '../../lib/resultPath.js';

const getRandom = (ext) => {
    return `${Math.floor(Math.random() * 10000)}${ext}`;
};
const execAsync = promisify(exec);

export default {
    name: 'toimg',
    description: 'Convert sticker to image',
    aliases: ['toimage', 'img'],
    category: 'Tools',
    execute: async (sock, m, args) => {
        let inputPath = '';
        let outPath = '';
        try {
            const target = m.quoted || m;
            const isSticker = !!target.isSticker;
            const stickerMsg = target?.msg || target;
            const isAnimated = !!(stickerMsg?.isAnimated || stickerMsg?.isAvatar);

            if (!isSticker) {
                return m.reply(`Reply to a sticker with *${settings.prefix}toimg*`);
            }

            await m.reply('Converting...');
            const buffer = await target.download();
            if (!buffer?.length) {
                return m.reply('Failed to download sticker media.');
            }

            inputPath = makeResultPath(getRandom('.webp'));
            outPath = makeResultPath(getRandom(isAnimated ? '.mp4' : '.png'));
            fs.writeFileSync(inputPath, buffer);

            const ffmpegCmd = isAnimated
                ? `ffmpeg -y -i "${inputPath}" -an -c:v libx264 -movflags +faststart -pix_fmt yuv420p "${outPath}"`
                : `ffmpeg -y -i "${inputPath}" -frames:v 1 "${outPath}"`;

            try {
                await execAsync(ffmpegCmd);
            } catch (ffmpegError) {
                // Fallback static sticker conversion with sharp when ffmpeg fails
                if (!isAnimated) {
                    const pngBuffer = await sharp(buffer).png().toBuffer();
                    await sock.sendMessage(
                        m.chat,
                        { image: pngBuffer, caption: 'Converted sticker to image' },
                        { quoted: m }
                    );
                    return;
                }
                throw ffmpegError;
            }

            if (!fs.existsSync(outPath)) {
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

        } catch (error) {
            console.error(error);
            await m.reply('Failed to convert sticker.');
        } finally {
            if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            if (outPath && fs.existsSync(outPath)) fs.unlinkSync(outPath);
        }
    }
};
