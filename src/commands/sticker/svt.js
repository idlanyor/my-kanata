import { exec } from 'child_process';
import fs from 'fs';
import { Sticker, StickerTypes } from 'wa-sticker-formatter';
import { settings } from '../../config/settings.js';
import { makeResultPath } from '../../utils/resultPath.js';

const getRandom = (ext) => `${Math.floor(Math.random() * 10000)}${ext}`;

export default {
    name: 'svt',
    aliases: ['stickervideotransparan', 'sgreen'],
    description: 'Buat stiker video transparan (Hapus background warna)',
    category: 'Sticker',
    execute: async (sock, m, args, text) => {
        const target = m.quoted ? m.quoted : m;

        if (!target.isVideo) {
            return m.reply(
                ' Balas video yang latarnya polos (misal Green Screen) untuk dijadikan stiker transparan.'
            );
        }

        // Ambil warna dari argumen (default hijau: 00ff00)
        // Contoh: .svt 000000 (buat hapus latar hitam)
        const color = args[0] || '00ff00';
        const similarity = args[1] || '0.1'; // Tingkat toleransi warna (0.01 - 1.0)

        await m.react('⏳');

        const inputPath = makeResultPath(getRandom('.mp4'));
        const outputPath = makeResultPath(getRandom('.webp'));

        try {
            // 1. Download Video
            const buffer = await target.download();
            fs.writeFileSync(inputPath, buffer);

            // 2. Cek Durasi via ffprobe
            const getDurationCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${inputPath}`;

            exec(getDurationCmd, async (err, stdout) => {
                if (err) {
                    console.error('ffprobe Error:', err);
                    await m.react('❌');
                    return m.reply(' Gagal memeriksa durasi video.');
                }

                const duration = parseFloat(stdout.trim());
                const maxDuration = 10; // Maksimal 10 detik

                if (duration > maxDuration) {
                    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                    await m.react('❌');
                    return m.reply(
                        ` Durasi video terlalu panjang! Maksimal *${maxDuration} detik*. (Video kamu: ${duration.toFixed(1)} detik)`
                    );
                }

                // 3. Jalankan FFmpeg (Filter colorkey)
                // colorkey=warna:similarity:blend
                const ffmpegCmd = `ffmpeg -i ${inputPath} -vf "colorkey=0x${color}:${similarity}:0.1,scale=512:512:force_original_aspect_ratio=increase,crop=512:512" -c:v libwebp -lossless 1 -loop 0 -an -vsync 0 ${outputPath}`;

                exec(ffmpegCmd, async (err) => {
                    if (err) {
                        console.error('FFmpeg Error:', err);
                        await m.react('❌');
                        return m.reply(
                            ' Gagal memproses video. Pastikan FFmpeg terinstall di server.'
                        );
                    }

                    // 4. Re-format pake wa-sticker-formatter biar metadata aman
                    const webpBuffer = fs.readFileSync(outputPath);
                    const sticker = new Sticker(webpBuffer, {
                        pack: settings.botName,
                        author: m.pushName || 'KanataBot',
                        type: StickerTypes.FULL,
                        quality: 50,
                    });

                    const result = await sticker.toBuffer();
                    await sock.sendMessage(m.chat, { sticker: result }, { quoted: m });

                    // 5. Cleanup
                    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                    await m.react('✅');
                });
            });
        } catch (err) {
            console.error('SVT Error:', err);
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            await m.react('❌');
            await m.reply(` Terjadi kesalahan: ${err.message}`);
        }
    },
};
