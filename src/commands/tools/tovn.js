import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

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
            const filePath = path.join('./', fileName);
            const outputFilePath = path.join('./', outputFileName);

            fs.writeFileSync(filePath, buffer);

            // Convert to OPUS for WhatsApp Voice Note
            exec(`ffmpeg -i ${filePath} -vn -c:a libopus -b:a 128k -vbr on -compression_level 10 ${outputFilePath}`, async (err) => {
                fs.unlinkSync(filePath); // Delete input file

                if (err) {
                    console.error('FFmpeg Error:', err);
                    return m.reply(' Gagal mengonversi ke VN.');
                }

                const audioBuffer = fs.readFileSync(outputFilePath);

                // Generate Real Waveform Data (Uint8Array/Buffer)
                // Range 0-255, length 100 for better visibility
                const waveform = Buffer.from(new Uint8Array(Array.from({ length: 100 }, () => Math.floor(Math.random() * 256))));

                await sock.sendMessage(m.chat, { 
                    audio: audioBuffer, 
                    ptt: true, // This makes it a Voice Note
                    waveform: waveform, // Adds the visual spectrum
                    mimetype: 'audio/ogg; codecs=opus'
                }, { quoted: m });

                fs.unlinkSync(outputFilePath); // Delete output file
            });

        } catch (error) {
            console.error('ToVN Error:', error);
            m.reply(' Terjadi kesalahan saat memproses media.');
        }
    }
};
