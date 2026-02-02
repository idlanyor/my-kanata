import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { settings } from '../../config/settings.js';
import fs from 'fs';
import path from 'path';

// Initialize the Gemini client
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const getRandom = (ext) => {
    return `${Math.floor(Math.random() * 10000)}${ext}`;
};

export default {
    name: 'ai',
    aliases: ['gemini', 'gmn', 'ask'],
    description: 'AI Assistant (Gemini 2.5 Flash) with Tools',
    category: 'General',
    execute: async (sock, m, args, text) => {
        if (!process.env.GEMINI_API_KEY) {
            return m.reply('GEMINI_API_KEY is not set in .env file.');
        }

        try {
            const isQuoted = !!m.quoted;
            const msg = isQuoted ? m.quoted : m.msg;
            const mime = msg.mimetype || '';
            const mtype = isQuoted ? m.quoted.mtype : m.mtype;

            const isImage = /image/.test(mime) || /imageMessage/.test(mtype);
            const isVideo = /video/.test(mime) || /videoMessage/.test(mtype);
            const isAudio = /audio/.test(mime) || /audioMessage/.test(mtype);

            let prompt = text;
            let fileUri = null;
            let fileMime = null;
            let tempPath = null;

            if (isImage || isVideo || isAudio) {
                const mediaType = isImage ? 'image' : (isVideo ? 'video' : 'audio');
                await m.reply(`Uploading ${mediaType} to Gemini...`);
                
                const stream = await downloadContentFromMessage(msg, mediaType);
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                
                const ext = isImage ? '.jpg' : (isVideo ? '.mp4' : '.mp3');
                tempPath = path.resolve(getRandom(ext));
                fs.writeFileSync(tempPath, buffer);

                const myfile = await ai.files.upload({
                    file: tempPath,
                    config: { mimeType: mime || (isImage ? 'image/jpeg' : (isVideo ? 'video/mp4' : 'audio/mp3')) },
                });

                fileUri = myfile.uri;
                fileMime = myfile.mimeType;
                
                if (!prompt) prompt = `Analyze this ${mediaType} in detail.`;
            } else if (isQuoted && m.quoted.text) {
                prompt = prompt ? `Context: "${m.quoted.text}"

Question: ${prompt}` : m.quoted.text;
            }

            if (!prompt && !fileUri) {
                return m.reply(`Usage: ${settings.prefix}ai <question> (reply to media for multimodal)`);
            }

            if (!fileUri) await m.reply('Thinking...');

            // Prepare tools and config based on provided documentation
            const tools = [
                { googleSearch: {} }, // Google Search Grounding
                { codeExecution: {} }, // Code Execution
            ];

            const config = {
                tools,
                systemInstruction: `Kamu adalah KanataBot, asisten AI yang cerdas. 
Waktu saat ini: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'full', timeStyle: 'long' })}.

Aturan:
1. Selalu jawab dalam Bahasa Indonesia.
2. Gunakan format WhatsApp (PENTING):
   - Gunakan SATU asterisk (*tebal*) untuk teks tebal. JANGAN gunakan double asterisk (**).
   - Gunakan underscore (_miring_) untuk teks miring.
   - Gunakan \`kode single line\` untuk perintah/data singkat.
   - Gunakan \`\`\`kode multi line\`\`\` untuk blok kode.
   - Gunakan > quote untuk kutipan.
   - Gunakan list (1. atau - ) untuk poin-poin. Gunakan tanda strip (-) dan spasi untuk bulleted list.
3. Jangan pernah gunakan emoji.
4. Jika menggunakan alat (search/code), sertakan hasilnya dalam jawabanmu dengan format yang rapi.`
            };

            // Prepare parts
            const parts = [];
            if (fileUri) {
                parts.push(createPartFromUri(fileUri, fileMime));
            }
            if (prompt) {
                parts.push(prompt);
            }

            // Generate Content with Tools
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                config,
                contents: createUserContent(parts),
            });

            // Clean response text:
            // 1. Convert any double asterisks (Markdown bold) to single asterisks (WhatsApp bold)
            let finalOutput = response.text.replace(/\*\*(.*?)\*\*/g, '*$1*');
            
            await m.reply(finalOutput);

            // Cleanup
            if (tempPath && fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
            }

        } catch (error) {
            console.error('Gemini API Error:', error);
            await m.reply(`Error: ${error.message || 'Failed to process request'}`);
        }
    }
};
