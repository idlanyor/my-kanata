import { GoogleGenAI, createUserContent, createPartFromUri } from "@google/genai";
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import Transaction from '../../database/models/Transaction.js';
import fs from 'fs';
import path from 'path';

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const getRandom = (ext) => `${Math.floor(Math.random() * 10000)}${ext}`;

export default {
    name: 'catat',
    aliases: ['transaksi', 'bill'],
    description: 'Catat transaksi otomatis via suara/teks (Gemini 2.5 Flash)',
    category: 'Finance',
    execute: async (sock, m, args, text) => {
        if (!process.env.GEMINI_API_KEY) return m.reply('GEMINI_API_KEY belum diatur.');

        try {
            const isQuoted = !!m.quoted;
            const msg = isQuoted ? m.quoted : m.msg;
            const mime = msg.mimetype || '';
            const mtype = isQuoted ? m.quoted.mtype : m.mtype;

            const isAudio = /audio/.test(mime) || /audioMessage/.test(mtype);
            const isImage = /image/.test(mime) || /imageMessage/.test(mtype);
            let prompt = text;
            let fileUri = null;
            let fileMime = null;
            let tempPath = null;

            if (isAudio || isImage) {
                const mediaType = isAudio ? 'audio' : 'image';
                await m.reply(`Sedang menganalisis ${mediaType === 'audio' ? 'suara' : 'gambar'} kamu...`);
                const stream = await downloadContentFromMessage(msg, mediaType);
                let buffer = Buffer.from([]);
                for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

                const ext = isAudio ? '.mp3' : '.jpg';
                tempPath = path.resolve(getRandom(ext));
                fs.writeFileSync(tempPath, buffer);

                const myfile = await ai.files.upload({
                    file: tempPath,
                    config: { mimeType: isAudio ? 'audio/mpeg' : 'image/jpeg' },
                });

                fileUri = myfile.uri;
                fileMime = myfile.mimeType;
                if (!prompt) {
                    prompt = isAudio 
                        ? "Ekstrak transaksi dari rekaman suara ini." 
                        : "Ekstrak data transaksi dari screenshot/struk ini. Cari nominal total, kategori, dan deskripsinya.";
                }
            }

            if (!prompt && !fileUri) {
                return m.reply('Kirim/balas VN atau ketik teks untuk mencatat transaksi.\nContoh: ".catat beli bakso 15rb"');
            }

            const systemInstruction = `Kamu adalah asisten pencatat keuangan cerdas. 
Tugasmu adalah mengekstrak data transaksi dari teks, audio, atau gambar.
WAKTU SEKARANG: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'full', timeStyle: 'long' })}.

Jika user menyebutkan waktu seperti "kemarin", "tadi pagi", "2 hari lalu", atau tanggal spesifik, kamu HARUS menghitung tanggalnya dengan tepat berdasarkan WAKTU SEKARANG.

Data yang harus diekstrak untuk SETIAP transaksi:
1. type: "income" atau "expense".
2. amount: angka saja.
3. category: kategori singkat.
4. description: penjelasan singkat.
5. date: format ISO 8601 (YYYY-MM-DDTHH:mm:ssZ). Jika tidak disebutkan waktu spesifik, gunakan waktu sekarang.

Output HARUS dalam format JSON ARRAY murni:
[
  {"type": "expense", "amount": 15000, "category": "Makanan", "description": "bakso", "date": "2026-02-01T12:00:00Z"}
]

Jika tidak jelas, balas: {"error": "data tidak jelas"}`;

            const parts = [];
            if (fileUri) parts.push(createPartFromUri(fileUri, fileMime));
            parts.push(prompt);

            const result = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                config: { systemInstruction },
                contents: createUserContent(parts),
            });

            let jsonText = result.text.trim();
            if (jsonText.includes('```')) {
                jsonText = jsonText.replace(/```json|```/g, '').trim();
            }

            const data = JSON.parse(jsonText);

            if (data.error || (Array.isArray(data) && data.length === 0)) {
                return m.reply('Maaf, saya tidak bisa menangkap detail transaksinya. Bisa diulangi lebih jelas?');
            }

            const transactions = Array.isArray(data) ? data : [data];
            let responseMsg = `*${transactions.length} TRANSAKSI BERHASIL DICATAT* \n\n`;
            
            for (const txData of transactions) {
                const newTx = await Transaction.create({
                    userId: m.sender,
                    userName: m.pushName || 'User',
                    type: txData.type,
                    amount: txData.amount,
                    category: txData.category,
                    description: txData.description,
                    date: txData.date ? new Date(txData.date) : new Date()
                });

                const statusEmoji = txData.type === 'income' ? '' : '';
                const formattedAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(txData.amount);
                const txDate = new Date(newTx.date).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });

                responseMsg += `${statusEmoji} *${formattedAmount}*\n`;
                responseMsg += `└ _${txData.description} (${txDate})_\n\n`;
            }

            await m.reply(responseMsg.trim());

            if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

        } catch (error) {
            console.error('Catat Error:', error);
            await m.reply('Gagal mencatat transaksi. Pastikan format benar atau suara terdengar jelas.');
            if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        }
    }
};
