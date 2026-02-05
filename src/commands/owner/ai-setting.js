import Settings from '../../database/models/Settings.js';
import { clearSettingsCache } from '../../handlers/messageHandler.js';

export default {
    name: 'aisetting',
    aliases: ['aiconfig', 'pvaichat'],
    description: 'Manage Auto-AI Mode for Private Chat (Owner Only)',
    category: 'Owner',
    execute: async (sock, m, args, text) => {
        const subcommand = args[0]?.toLowerCase();
        if (!subcommand) {
            return m.reply(`*Auto-AI Private Configuration*
            
Gunakan:
- *.aisetting on* : Aktifkan mode Auto-AI di PC
- *.aisetting off* : Matikan mode Auto-AI di PC
- *.aisetting setpersona <teks>* : Ubah persona AI PC
- *.aisetting check* : Cek status`);
        }

        let botSettings = await Settings.findOne({ id: 'bot_settings' });

        if (subcommand === 'on') {
            botSettings.autoAiPrivate = true;
            await botSettings.save();
            clearSettingsCache();
            return m.reply(' Auto-AI untuk Private Chat diaktifkan.');
        }

        if (subcommand === 'off') {
            botSettings.autoAiPrivate = false;
            await botSettings.save();
            clearSettingsCache();
            return m.reply(' Auto-AI untuk Private Chat dimatikan.');
        }

        if (subcommand === 'setpersona') {
            const persona = text.slice(subcommand.length).trim();
            if (!persona) return m.reply('Harap masukkan teks persona.');
            
            botSettings.privateAiPersona = persona;
            await botSettings.save();
            clearSettingsCache();
            return m.reply(` Persona PC berhasil diubah menjadi:
"${persona}"`);
        }

        if (subcommand === 'check') {
            return m.reply(`*Auto-AI Private Status*
            
Status: ${botSettings.autoAiPrivate ? ' Aktif' : ' Mati'}
Persona: ${botSettings.privateAiPersona}`);
        }

        return m.reply('Subcommand tidak dikenal.');
    }
};
