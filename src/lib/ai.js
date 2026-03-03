import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";

// Store chat history in memory
const chatHistories = new Map();

/**
 * Clear chat history for a specific ID
 * @param {string} chatId 
 */
export const clearChatHistory = (chatId) => {
    if (chatHistories.has(chatId)) {
        chatHistories.delete(chatId);
        return true;
    }
    return false;
};

/**
 * Upload file to Gemini with dynamic API Key support
 */
export const uploadFileToGemini = async (filePath, mimeType) => {
    try {
        const ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY
        });
        const myfile = await ai.files.upload({
            file: filePath,
            config: { mimeType },
        });
        return { uri: myfile.uri, mimeType: myfile.mimeType };
    } catch (error) {
        throw new Error(`Failed to upload file to Gemini: ${error.message}`);
    }
};

/**
 * Generate AI Response with dynamic API Key support
 */
export const generateAIResponse = async (prompt, fileUri = null, fileMime = null, customSystemInstruction = null, chatId = null) => {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not set.');
    }

    const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY
    });

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

    let contents;
    if (chatId) {
        if (!chatHistories.has(chatId)) {
            chatHistories.set(chatId, []);
        }
        const history = chatHistories.get(chatId);
        
        // Add user message to history
        history.push(createUserContent(parts));

        // Limit history to last 20 messages
        if (history.length > 20) {
            history.splice(0, history.length - 20);
        }
        contents = history;
    } else {
        contents = createUserContent(parts);
    }

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        config,
        contents: contents,
    });

    const aiResponseText = response.text;

    if (chatId) {
        const history = chatHistories.get(chatId);
        // Add model response to history
        history.push({
            role: "model",
            parts: [{ text: aiResponseText }]
        });
    }

    // Clean response text: Convert Markdown bold (**) to WhatsApp bold (*)
    let finalOutput = aiResponseText.replace(/\*\*(.*?)\*\*/g, '*$1*');
    
    return finalOutput;
};
