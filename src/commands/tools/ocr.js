import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { settings } from '../../config/settings.js';
import fs from 'fs';
import path from 'path';

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const getRandom = (ext) => {
    return `${Math.floor(Math.random() * 10000)}${ext}`;
};

export default {
    name: 'read',
    aliases: ['ocr'],
    description: 'Extract text from image (OCR)',
    category: 'Tools',
    execute: async (sock, m, args) => {
        const isQuoted = !!m.quoted;
        const msg = isQuoted ? m.quoted : m.msg;
        const mime = msg.mimetype || '';
        const mtype = isQuoted ? m.quoted.mtype : m.mtype;
        const isImage = /image/.test(mime) || /imageMessage/.test(mtype);

        if (!isImage) {
            return m.reply(`Please reply to an image or send an image with caption ${settings.prefix}read to extract text.`);
        }

        await m.reply('Reading text...');

        let tempPath = null;
        try {
            const stream = await downloadContentFromMessage(msg, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            
            const ext = '.jpg';
            tempPath = path.resolve(getRandom(ext));
            fs.writeFileSync(tempPath, buffer);

            const myfile = await ai.files.upload({
                file: tempPath,
                config: { mimeType: 'image/jpeg' },
            });

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                systemInstruction: "Kamu adalah asisten khusus OCR. Tugasmu HANYA menyalin semua teks yang terlihat di dalam gambar secara akurat. Jangan memberikan komentar, penjelasan, atau tambahan kata-kata lain. Jika tidak ada teks, katakan 'Tidak ada teks terdeteksi'.",
                contents: createUserContent([
                    createPartFromUri(myfile.uri, myfile.mimeType),
                    "Ekstrak semua teks dari gambar ini."
                ]),
            });

            await m.reply(response.text.trim());

        } catch (error) {
            console.error('OCR Error:', error);
            await m.reply(`Error: ${error.message || 'Failed to read text'}`);
        } finally {
            if (tempPath && fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
            }
        }
    }
};
