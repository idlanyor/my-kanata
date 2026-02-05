export default {
    name: 'tagstatus',
    description: 'Kirim Status Grup + Tag Semua Orang',
    category: 'Group',
    execute: async (sock, m, args, text) => {
        if (!m.isGroup) return m.reply('Hanya di grup!');
        
        const groupMetadata = await sock.groupMetadata(m.chat);
        const participants = groupMetadata.participants.map(p => p.id);

        try {
            await sock.sendMessage(m.chat, {
                groupStatus: text || 'Halo warga grup! (Status Tag)',
                mentions: participants,
                contextInfo: {
                    mentionedJid: participants
                }
            });
            m.reply(' Status Grup dengan tag massal berhasil dikirim!');
        } catch (err) {
            console.error(err);
            m.reply('Gagal kirim tag status.');
        }
    }
};
