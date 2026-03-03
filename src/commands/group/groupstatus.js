import { generateWAMessageContent, generateWAMessageFromContent } from '@whiskeysockets/baileys';
import crypto from 'node:crypto';
import { PassThrough } from 'node:stream';
import ffmpeg from 'fluent-ffmpeg';
import { settings } from '../../config/settings.js';

export default {
    name: 'groupstatus',
    aliases: ['swgc', 'upswgc'],
    description: 'Kirim status teks/media ke grup (Full Media Support)',
    category: 'Group',
    execute: async (sock, m, args, text) => {
        if (!m.isGroup) return m.reply('Perintah ini hanya bisa digunakan di dalam grup!');

        let [textInput, warna, url] = text.split('|');
        let id = m.chat;

        if (url) {
            try {
                const inviteCode = url.split('/').pop().split('?')[0];
                let geti = await sock.groupGetInviteInfo(inviteCode);
                id = geti.id;
            } catch (e) {
                return m.reply('⚠️ Link grup tidak valid!');
            }
        }

        const quoted = m.quoted || m;
        const mime = (quoted.msg || quoted).mimetype || '';
        const cap = textInput || quoted.text || '';

        try {
            let content = null;

            if (/image/.test(mime)) {
                const buffer = await quoted.download();
                content = { image: buffer, caption: cap };
            } else if (/video/.test(mime)) {
                const buffer = await quoted.download();
                content = { video: buffer, caption: cap };
            } else if (/audio/.test(mime)) {
                const buffer = await quoted.download();
                await m.reply('Processing audio status...');
                const audioVn = await toVN(buffer);
                const audioWaveform = await generateWaveform(buffer);
                content = {
                    audio: audioVn,
                    waveform: audioWaveform,
                    mimetype: "audio/ogg; codecs=opus",
                    ptt: true
                };
            } else if (warna || textInput || text) {
                const warnaStatusWA = new Map([
                    ['biru', '#34B7F1'], ['hijau', '#25D366'], ['kuning', '#FFD700'],
                    ['jingga', '#FF8C00'], ['merah', '#FF3B30'], ['ungu', '#9C27B0'],
                    ['abu', '#9E9E9E'], ['hitam', '#000000'], ['putih', '#FFFFFF'], ['cyan', '#00BCD4']
                ]);

                let color = '#25D366';
                if (warna) {
                    const textWarna = warna.toLowerCase().trim();
                    for (const [nama, kode] of warnaStatusWA.entries()) {
                        if (textWarna.includes(nama)) { color = kode; break; }
                    }
                }
                content = { text: cap || textInput || text, backgroundColor: color };
            }

            if (!content) return m.reply('⚠️ Reply media atau kirim teks!');

            await m.reply('🚀 Uploading status...');
            
            // 1. Generate core content
            const backgroundColor = content.backgroundColor;
            if (backgroundColor) delete content.backgroundColor;

            const inside = await generateWAMessageContent(content, {
                upload: sock.waUploadToServer,
                backgroundColor
            });

            // 2. Prepare message with Message Secret (Crucial for Media)
            const messageSecret = crypto.randomBytes(32);
            const msg = generateWAMessageFromContent(id, {
                messageContextInfo: { messageSecret },
                groupStatusMessageV2: {
                    message: {
                        ...inside,
                        messageContextInfo: { messageSecret }
                    }
                }
            }, {});

            // 3. Send via Relay
            await sock.relayMessage(id, msg.message, { messageId: msg.key.id });
            
            await m.reply('✅ Dah UpStatus Nya Tengok Di Grup');

        } catch (err) {
            console.error('GroupStatus Error:', err);
            m.reply(`❌ Gagal: ${err.message}`);
        }
    }
};

/**
 * Helpers for Audio
 */
async function toVN(inputBuffer) {
    return new Promise((resolve, reject) => {
        const inStream = new PassThrough();
        const outStream = new PassThrough();
        const chunks = [];
        inStream.end(inputBuffer);
        ffmpeg(inStream)
            .noVideo()
            .audioCodec('libopus')
            .format('ogg')
            .audioBitrate('48k')
            .audioChannels(1)
            .audioFrequency(48000)
            .outputOptions(['-map_metadata', '-1', '-application', 'voip', '-compression_level', '10', '-page_duration', '20000'])
            .on('error', reject)
            .on('end', () => resolve(Buffer.concat(chunks)))
            .pipe(outStream, { end: true });
        outStream.on('data', c => chunks.push(c));
    });
}

async function generateWaveform(inputBuffer, bars = 64) {
    return new Promise((resolve, reject) => {
        const inputStream = new PassThrough();
        inputStream.end(inputBuffer);
        const chunks = [];
        ffmpeg(inputStream)
            .audioChannels(1)
            .audioFrequency(16000)
            .format("s16le")
            .on("error", reject)
            .on("end", () => {
                const rawData = Buffer.concat(chunks);
                const samples = rawData.length / 2;
                const amplitudes = [];
                for (let i = 0; i < samples; i++) {
                    let val = rawData.readInt16LE(i * 2);
                    amplitudes.push(Math.abs(val) / 32768);
                }
                let blockSize = Math.floor(amplitudes.length / bars);
                let avg = [];
                for (let i = 0; i < bars; i++) {
                    let block = amplitudes.slice(i * blockSize, (i + 1) * blockSize);
                    avg.push(block.length > 0 ? block.reduce((a, b) => a + b, 0) / block.length : 0);
                }
                let max = Math.max(...avg) || 1;
                let normalized = avg.map(v => Math.floor((v / max) * 100));
                resolve(Buffer.from(new Uint8Array(normalized)).toString("base64"));
            })
            .pipe(new PassThrough()) 
            .on("data", chunk => chunks.push(chunk));
    });
}
