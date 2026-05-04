import Transaction from '../database/models/Transaction.js';
export { Transaction };
import Budget from '../database/models/Budget.js';
import { GoogleGenAI, createUserContent, createPartFromUri } from "@google/genai";
import fs from 'fs';
import { makeResultPath } from './resultPath.js';

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const getRandom = (ext) => `${Math.floor(Math.random() * 10000)}${ext}`;

// --- BUDGET FUNCTIONS ---
export const setBudget = async (userId, month, year, data) => {
    return await Budget.findOneAndUpdate(
        { userId, month, year },
        { $set: data },
        { upsert: true, new: true }
    );
};

export const getBudget = async (userId, month, year) => {
    return await Budget.findOne({ userId, month, year });
};

export const getKakeiboReport = async (userId, month, year) => {
    const report = await getMonthlyReport(userId, month, year);
    const budget = await getBudget(userId, month + 1, year);

    const kakeibo = {
        needs: 0,
        wants: 0,
        culture: 0,
        extras: 0,
    };

    report.transactions.forEach(tx => {
        if (tx.type === 'expense') {
            // Prioritize explicit Kakeibo category
            if (tx.kakeiboCategory && kakeibo.hasOwnProperty(tx.kakeiboCategory)) {
                kakeibo[tx.kakeiboCategory] += tx.amount;
            } else {
                // Fallback to keyword guessing
                const cat = (tx.category || '').toLowerCase();
                if (cat.match(/makan|pangan|grocery|listrik|air|kos|transport|sewa|obat|sehat/)) {
                    kakeibo.needs += tx.amount;
                } else if (cat.match(/buku|belajar|kursus|seni|film|wisata|hiburan/)) {
                    kakeibo.culture += tx.amount;
                } else if (cat.match(/darurat|kado|sumbang|service|rusak/)) {
                    kakeibo.extras += tx.amount;
                } else {
                    kakeibo.wants += tx.amount;
                }
            }
        }
    });

    return {
        ...report,
        budget: budget || { incomeTarget: 0, savingsTarget: 0 },
        kakeibo
    };
};

export const addTransaction = async ({ userId, userName, type, amount, category, description, date, kakeiboCategory, source = 'finance' }) => {
    return await Transaction.create({
        userId,
        userName,
        type,
        amount,
        category,
        description,
        kakeiboCategory,
        date: date ? new Date(date) : new Date(),
        source
    });
};

export const deleteTransaction = async (userId, transactionId) => {
    if (transactionId) {
        return await Transaction.findOneAndDelete({ _id: transactionId, userId });
    } else {
        const lastTx = await Transaction.findOne({ userId }).sort({ createdAt: -1 });
        if (lastTx) {
            return await Transaction.findByIdAndDelete(lastTx._id);
        }
    }
    return null;
};

export const updateTransaction = async (userId, transactionId, updateData) => {
    return await Transaction.findOneAndUpdate(
        { _id: transactionId, userId },
        { $set: updateData },
        { new: true }
    );
};

export const getMonthlyReport = async (userId, month, year, filters = {}) => {
    const now = new Date();
    const targetMonth = month !== undefined ? month : now.getMonth();
    const targetYear = year !== undefined ? year : now.getFullYear();

    let startDate = new Date(targetYear, targetMonth, 1);
    let endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

    // Override with specific date range if provided
    if (filters.startDate) startDate = new Date(filters.startDate);
    if (filters.endDate) {
        endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
    }

    const query = {
        userId,
        date: { $gte: startDate, $lte: endDate }
    };

    if (filters.type) query.type = filters.type;
    if (filters.category) query.category = { $regex: new RegExp(filters.category, 'i') };
    if (filters.kakeiboCategory) query.kakeiboCategory = filters.kakeiboCategory;

    const transactions = await Transaction.find(query).sort({ date: -1 });

    let totalIncome = 0;
    let totalExpense = 0;
    transactions.forEach(tx => {
        if (tx.type === 'income') totalIncome += tx.amount;
        else totalExpense += tx.amount;
    });

    return {
        transactions,
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        period: { month: targetMonth + 1, year: targetYear, startDate, endDate }
    };
};

export const processAiTransaction = async (userId, userName, prompt, fileData = null) => {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY belum diatur.');

    let tempPath = null;
    let fileUri = null;
    let fileMime = null;

    try {
        if (fileData && fileData.buffer) {
            const ext = fileData.mimeType.includes('audio') ? '.mp3' : '.jpg';
            tempPath = makeResultPath(getRandom(ext));
            fs.writeFileSync(tempPath, fileData.buffer);

            const myfile = await ai.files.upload({
                file: tempPath,
                config: { mimeType: fileData.mimeType },
            });

            fileUri = myfile.uri;
            fileMime = myfile.mimeType;
            
            if (!prompt) {
                prompt = fileData.mimeType.includes('audio') 
                    ? "Ekstrak transaksi dari rekaman suara ini." 
                    : "Ekstrak data transaksi dari screenshot/struk ini. Cari nominal total, kategori, dan deskripsinya.";
            }
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
        parts.push(prompt || "Catat transaksi");

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
            return { error: 'Maaf, saya tidak bisa menangkap detail transaksinya.' };
        }

        const transactionsData = Array.isArray(data) ? data : [data];
        const savedTransactions = [];

        for (const txData of transactionsData) {
            const newTx = await addTransaction({
                userId,
                userName,
                type: txData.type,
                amount: txData.amount,
                category: txData.category,
                description: txData.description,
                date: txData.date,
                source: 'finance'
            });
            savedTransactions.push(newTx);
        }

        return { success: true, transactions: savedTransactions };

    } finally {
        if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }
};
