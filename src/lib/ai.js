import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

export const uploadFileToGemini = async (filePath, mimeType) => {
    try {
        const myfile = await ai.files.upload({
            file: filePath,
            config: { mimeType },
        });
        return { uri: myfile.uri, mimeType: myfile.mimeType };
    } catch (error) {
        throw new Error(`Failed to upload file to Gemini: ${error.message}`);
    }
};

export const generateAIResponse = async (prompt, fileUri = null, fileMime = null, customSystemInstruction = null) => {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not set.');
    }

    const defaultSystemInstruction = `Kamu adalah KanataBot, asisten AI yang cerdas. 
Waktu saat ini: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'full', timeStyle: 'long' })}.

Aturan:
1. Selalu jawab dalam Bahasa Indonesia (kecuali diminta lain).
2. Gunakan format WhatsApp (PENTING):
   - Gunakan SATU asterisk (*tebal*) untuk teks tebal. JANGAN gunakan double asterisk (**).
   - Gunakan underscore (_miring_) untuk teks miring.
   - Gunakan \`kode single line\` untuk perintah/data singkat.
   - Gunakan \`\`\`kode multi line\`\`\` untuk blok kode.
   - Gunakan > quote untuk kutipan.
   - Gunakan list (1. atau - ) untuk poin-poin.
3. Jangan pernah gunakan emoji (kecuali diperbolehkan di persona).
4. Jika menggunakan alat (search/code), sertakan hasilnya dalam jawabanmu dengan format yang rapi.`;

    const systemInstruction = customSystemInstruction 
        ? `${customSystemInstruction}

[System Note: Waktu saat ini ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}. Gunakan format WhatsApp (*bold*, _italic_, \`code\`).]`  
        : defaultSystemInstruction;

    const tools = [
        { googleSearch: {} },
        { codeExecution: {} },
    ];

    const config = {
        tools,
        systemInstruction,
    };

    const parts = [];
    if (fileUri) {
        parts.push(createPartFromUri(fileUri, fileMime));
    }
    if (prompt) {
        parts.push(prompt);
    }

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        config,
        contents: createUserContent(parts),
    });

    // Clean response text: Convert Markdown bold (**) to WhatsApp bold (*)
    let finalOutput = response.text.replace(/\*\*(.*?)\*\*/g, '*$1*');
    
    return finalOutput;
};