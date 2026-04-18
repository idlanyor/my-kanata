import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { exec } from 'child_process';
import fs from 'fs';
import { makeResultPath } from '../../lib/resultPath.js';

const getRandom = (ext) => {
    return `${Math.floor(Math.random() * 10000)}${ext}`;
};

export default {
    name: 'tomp3',
    aliases: ['tomp3audio', 'extractaudio'],
    description: 'Convert Video to MP3 Audio',
    category: 'Tools',
    execute: async (sock, m, args) => {
        const quoted = m.quoted ? m.quoted : m;
        const isVideo = quoted.mtype === 'videoMessage';

        if (!isVideo) {
            return m.reply(' Reply video yang ingin dijadikan MP3.');
        }

        await m.reply(' Extracting audio to MP3...');

        try {
            const stream = await downloadContentFromMessage(quoted.msg, 'video');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            const inputFileName = getRandom('.mp4');
            const outputFileName = getRandom('.mp3');
            const inputFilePath = makeResultPath(inputFileName);
            const outputFilePath = makeResultPath(outputFileName);

            fs.writeFileSync(inputFilePath, buffer);

            // Convert Video to MP3 using FFmpeg
            exec(`ffmpeg -i ${inputFilePath} -vn -acodec libmp3lame -ab 128k ${outputFilePath}`, async (err) => {
                fs.unlinkSync(inputFilePath);

                if (err) {
                    console.error('FFmpeg Error:', err);
                    return m.reply(' Gagal mengekstrak audio.');
                }

                const audioBuffer = fs.readFileSync(outputFilePath);

                await sock.sendMessage(m.chat, { 
                    audio: audioBuffer, 
                    mimetype: 'audio/mpeg',
                    fileName: `${Date.now()}.mp3`
                }, { quoted: m });

                fs.unlinkSync(outputFilePath);
            });

        } catch (error) {
            console.error('ToMP3 Error:', error);
            m.reply(' Terjadi kesalahan saat memproses video.');
        }
    }
};
