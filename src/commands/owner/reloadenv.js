import dotenv from 'dotenv';
import { settings } from '../../config/settings.js';

export default {
    name: 'reloadenv',
    description: 'Reload environment variables from .env file (Owner Only)',
    category: 'Owner',
    execute: async (sock, m, args, text) => {
        const isOwner = m.sender === settings.ownerNumber || m.sender === settings.ownerLid;
        if (!isOwner) return;

        try {
            dotenv.config({ override: true });
            
            // Sync settings.js with new process.env
            settings.smmApiKey = process.env.SMM_API_KEY;
            settings.smmBaseUrl = process.env.SMM_BASE_URL || 'https://indosmm.id/api/v2';
            settings.geminiApiKey = process.env.GEMINI_API_KEY;

            console.log('--- ENV RELOADED ---');
            console.log('SMM_API_KEY:', settings.smmApiKey ? 'LOADED' : 'NOT FOUND');
            console.log('GEMINI_API_KEY:', settings.geminiApiKey ? 'LOADED' : 'NOT FOUND');

            await m.reply('✅ File `.env` berhasil dimuat ulang dan disinkronkan ke internal settings!');
        } catch (err) {
            await m.reply(`❌ Gagal reload .env: ${err.message}`);
        }
    }
};
