import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { exec } from 'child_process';
import fs from 'fs';
import { makeResultPath } from '../../lib/resultPath.js';

const getRandom = (ext) => {
    return `${Math.floor(Math.random() * 10000)}${ext}`;
};

export default {
    name: 'tovn',
    aliases: ['tovoicenote', 'mp3tovn'],
    description: 'Convert Audio/Video to Voice Note (VN) with Spectrum',
    category: 'Tools',
    execute: async (sock, m, args) => {
        const quoted = m.quoted ? m.quoted : m;
        const mime = quoted.mtype || '';
        const isAudio = quoted.mtype === 'audioMessage';
        const isVideo = quoted.mtype === 'videoMessage';

        if (!isAudio && !isVideo) {
            return m.reply(' Reply audio atau video yang ingin dijadikan Voice Note (VN).');
        }

        await m.reply(' Converting to VN...');

        try {
            const mediaType = isAudio ? 'audio' : 'video';
            const stream = await downloadContentFromMessage(quoted.msg, mediaType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            const fileName = getRandom(isAudio ? '.mp3' : '.mp4');
            const outputFileName = getRandom('.opus');
            const filePath = makeResultPath(fileName);
            const outputFilePath = makeResultPath(outputFileName);

            fs.writeFileSync(filePath, buffer);

            // Convert to OPUS for WhatsApp Voice Note
            exec(`ffmpeg -i ${filePath} -vn -c:a libopus -b:a 128k -vbr on -compression_level 10 ${outputFilePath}`, async (err) => {
                fs.unlinkSync(filePath); // Delete input file

                if (err) {
                    console.error('FFmpeg Error:', err);
                    return m.reply(' Gagal mengonversi ke VN.');
                }

                const audioBuffer = fs.readFileSync(outputFilePath);

                // Generate Rhythmic Waveform (Simulated Sine Wave + Noise)
                // This looks more natural than pure random
                const waveLength = 70;
                const waveform = new Uint8Array(waveLength);
                for (let i = 0; i < waveLength; i++) {
                    // Create a "pulse" effect using sine
                    const pulse = Math.sin(i / 2) * 60 + 120;
                    // Add micro-noise
                    const noise = Math.random() * 40;
                    waveform[i] = Math.min(255, pulse + noise);
                }

                await sock.sendMessage(m.chat, { 
                    audio: audioBuffer, 
                    ptt: true, 
                    waveform: Buffer.from(waveform), 
                    mimetype: 'audio/ogg; codecs=opus',
                    contextInfo: {
                        externalAdReply: {
                            title: 'VOICE NOTE CONVERTER',
                            body: 'Rhythmic Audio Spectrum (Sync)',
                            mediaType: 1,
                            renderLargerThumbnail: false,
                            thumbnail: fs.existsSync('./maskot.jpeg') ? fs.readFileSync('./maskot.jpeg') : null,
                            sourceUrl: 'https://api.kanata.web.id'
                        }
                    }
                }, { quoted: m });

                fs.unlinkSync(outputFilePath); // Delete output file
            });

        } catch (error) {
            console.error('ToVN Error:', error);
            m.reply(' Terjadi kesalahan saat memproses media.');
        }
    }
};
