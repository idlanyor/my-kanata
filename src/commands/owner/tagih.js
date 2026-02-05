import { settings } from '../../config/settings.js';

export default {
    name: 'tagih',
    aliases: ['pay', 'invoice'],
    description: 'Kirim invoice pembayaran kustom (Custom Payment Type)',
    category: 'Owner',
    execute: async (sock, m, args, text) => {
        // Check Owner
        const sender = m.sender;
        const isOwner = sender === settings.ownerNumber || sender === settings.ownerLid || sender.split(':')[0] === settings.ownerNumber.split('@')[0];
        if (!isOwner) return m.reply('Akses ditolak. Khusus Owner.');

        // Format: .tagih nominal | catatan
        // Contoh: .tagih 50000 | Sewa Bot 1 Bulan
        if (!text.includes('|')) {
            return m.reply(`*Format Salah!*
            
Gunakan: ${settings.prefix}tagih nominal | catatan
Contoh: ${settings.prefix}tagih 15000 | Beli Kopi Malam`);
        }

        const [amountStr, note] = text.split('|').map(v => v.trim());
        const amount = parseInt(amountStr);

        if (isNaN(amount)) return m.reply('Nominal harus berupa angka murni!');

        const externalId = 'KANATA-' + Date.now();

        try {
            // Mengirim menggunakan tipe pesan baru yang kita buat di core
            await sock.sendMessage(m.chat, {
                customPayment: {
                    amount: amount,
                    currency: 'IDR',
                    externalId: externalId,
                    note: note || 'Pembayaran Layanan Kanata'
                },
                viewOnce: true // Tambahkan ini!
            }, { quoted: m });
            
            console.log(`[DEBUG] Custom payment sent: ${externalId}`);
        } catch (err) {
            console.error('Error sending custom payment:', err);
            m.reply('Gagal mengirim invoice kustom. Pastikan core library sudah di-build.');
        }
    }
};
