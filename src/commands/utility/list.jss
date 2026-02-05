export default {
    name: 'list',
    description: 'Mengirim Modern List Message (Single Select)',
    category: 'General',
    execute: async (sock, m, args, text) => {
        console.log(`[DEBUG] Executing modern list command for ${m.chat}`);
        
        // Hint dari vryptt: Sekarang List harus dibungkus dalam Button native_flow
        // Nama button-nya adalah "single_select"
        const sections = [
            {
                title: "MENU BOT UTAMA",
                rows: [
                    { title: "Ping", id: ".ping", description: "Cek kecepatan bot" },
                    { title: "Menu", id: ".menu", description: "Tampilkan perintah" }
                ]
            },
            {
                title: "MENU EKSPERIMENTAL",
                rows: [
                    { title: "Button", id: ".button", description: "Tes tombol melayang" },
                    { title: "Event", id: ".event Syukuran", description: "Tes fitur undangan" }
                ]
            }
        ];

        const interactiveMessage = {
            header: {
                title: " KANATA LIST MENU",
                hasMediaAttachment: false
            },
            body: {
                text: "Silakan pilih menu melalui tombol di bawah ini."
            },
            footer: {
                text: "Modern List by Kanata-Baileys"
            },
            nativeFlowMessage: {
                buttons: [
                    {
                        name: "single_select",
                        buttonParamsJson: JSON.stringify({
                            title: "Pilih Menu",
                            sections: sections
                        })
                    }
                ]
            }
        };

        try {
            // Gunakan sendMessage native kita yang sudah di-patch binary node-nya
            await sock.sendMessage(m.chat, {
                interactive: interactiveMessage,
                viewOnce: true
            }, { quoted: m });
            
            console.log(`[DEBUG] Modern list message sent.`);
        } catch (err) {
            console.error('[ERROR] Failed to send modern list:', err);
            m.reply('Gagal mengirim List Message modern.');
        }
    }
};
