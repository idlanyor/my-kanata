export default {
    name: 'groupstatus',
    aliases: ['upswgc'],
    description: 'Kirim status teks/media ke grup (YeBail Style)',
    category: 'Group',
    execute: async (sock, m, args, text) => {
        if (!m.isGroup) return m.reply('Perintah ini hanya bisa digunakan di dalam grup!');
        
        const quoted = m.quoted ? m.quoted : m;
        const mime = (quoted.msg || quoted).mimetype || '';
        const isMedia = /image|video/.test(mime);

        try {
            let innerContent;
            if (isMedia) {
                const buffer = await m.downloadMediaMessage(quoted);
                const type = mime.split('/')[0];
                // Kita biarkan core generate content media dulu
                const mediaContent = await sock.prepareWAMessageMedia({
                    [type]: buffer,
                    caption: text || quoted.text || ''
                }, { upload: sock.waUploadToServer });
                innerContent = mediaContent;
            } else {
                if (!text) return m.reply('Ketik teks yang ingin dikirim sebagai status grup!');
                innerContent = { conversation: text };
            }

            // Struktur YeBail yang sangat spesifik
            const message = {
                groupStatusMessageV2: {
                    message: innerContent
                }
            };

            await sock.relayMessage(m.chat, message, {
                messageId: sock.generateMessageIDV2 ? sock.generateMessageIDV2() : undefined
            });
            
            m.reply(' Group Status sent (YeBail Style)!');
        } catch (err) {
            console.error(err);
            m.reply('Gagal mengirim status grup.');
        }
    }
};