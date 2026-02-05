import fs from 'fs';

export default {
    name: 'vnote',
    description: 'Mengirim Video Note (Circular Video)',
    category: 'Utility',
    execute: async (sock, m, args, text) => {
        const quoted = m.quoted ? m.quoted : m;
        const mime = (quoted.msg || quoted).mimetype || '';

        if (!/video/.test(mime)) return m.reply('Balas video yang ingin dijadikan Video Note!');

        m.reply('Sedang memproses Video Note...');
        
        try {
            const buffer = await m.downloadMediaMessage(quoted);
            
            await sock.sendMessage(m.chat, {
                video: buffer,
                ptv: true // Fitur Kanata-Baileys: Otomatis jadi Video Note
            }, { quoted: m });
        } catch (err) {
            console.error(err);
            m.reply('Gagal mengirim Video Note.');
        }
    }
};
