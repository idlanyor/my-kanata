import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { settings } from '../../config/settings.js';
import fs from 'fs';
import path from 'path';
import { uploadFileToGemini, generateAIResponse } from '../../lib/ai.js';

const getRandom = (ext) => {
    return `${Math.floor(Math.random() * 10000)}${ext}`;
};

export default {
    name: 'ai',
    aliases: ['gemini', 'gmn', 'ask'],
    description: 'AI Assistant (Gemini 2.5 Flash) with Tools',
    category: 'AI',
    execute: async (sock, m, args, text) => {
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

                // Use the lib function
                const uploadResult = await uploadFileToGemini(
                    tempPath, 
                    mime || (isImage ? 'image/jpeg' : (isVideo ? 'video/mp4' : 'audio/mp3'))
                );
                
                fileUri = uploadResult.uri;
                fileMime = uploadResult.mimeType;

                if (!prompt) prompt = `Analyze this ${mediaType} in detail.`;
            } else if (isQuoted && m.quoted.text) {
                prompt = prompt ? `Context: "${m.quoted.text}"

Question: ${prompt}` : m.quoted.text;
            }

            if (!prompt && !fileUri) {
                return m.reply(`Usage: ${settings.prefix}ai <question> (reply to media for multimodal)`);
            }

            if (!fileUri) await m.reply('Thinking...');

            // Call generateAIResponse
            const response = await generateAIResponse(prompt, fileUri, fileMime);
            
            await m.reply(response);

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
