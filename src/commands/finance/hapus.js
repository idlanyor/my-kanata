import Transaction from '../../database/models/Transaction.js';

export default {
    name: 'hapus',
    aliases: ['delete', 'batal', 'undo'],
    description: 'Hapus transaksi yang salah input',
    category: 'Finance',
    execute: async (sock, m, args, text) => {
        try {
            const userId = m.sender;

            // Jika ada ID yang diberikan (misal dari daftar laporan)
            if (args[0]) {
                const targetId = args[0];
                const deleted = await Transaction.findOneAndDelete({ _id: targetId, userId });
                
                if (!deleted) {
                    return m.reply('Transaksi tidak ditemukan atau ID salah. Pastikan kamu hanya menghapus transaksimu sendiri.');
                }

                return m.reply(`✅ Berhasil menghapus transaksi:\n\n*${deleted.description}* - Rp ${new Intl.NumberFormat('id-ID').format(deleted.amount)}`);
            }

            // Jika tidak ada argumen, hapus transaksi TERAKHIR milik user tersebut
            const lastTx = await Transaction.findOne({ userId }).sort({ createdAt: -1 });

            if (!lastTx) {
                return m.reply('Kamu belum memiliki riwayat transaksi untuk dihapus.');
            }

            // Konfirmasi penghapusan transaksi terakhir
            await Transaction.findByIdAndDelete(lastTx._id);

            const amountFormatted = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(lastTx.amount);
            
            await m.reply(`✅ *TRANSAKSI TERAKHIR DIHAPUS*\n\n*Keterangan:* ${lastTx.description}\n*Nominal:* ${amountFormatted}\n*Kategori:* ${lastTx.category}\n\n_Gunakan ".laporan" untuk melihat daftar lengkap._`);

        } catch (error) {
            console.error('Hapus Error:', error);
            await m.reply('Terjadi kesalahan saat mencoba menghapus transaksi. Pastikan format ID benar.');
        }
    }
};
