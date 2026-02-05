import Transaction from '../../database/models/Transaction.js';

export default {
    name: 'laporan',
    aliases: ['report', 'listtx'],
    description: 'Lihat laporan transaksi keuangan (Bulanan/Harian)',
    category: 'Finance',
    execute: async (sock, m, args, text) => {
        try {
            const userId = m.sender;
            
            // Default to current month if no args
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

            const transactions = await Transaction.find({
                userId,
                date: { $gte: startOfMonth, $lte: endOfMonth }
            }).sort({ date: -1 });

            if (transactions.length === 0) {
                return m.reply(`Belum ada transaksi tercatat untuk bulan ini (${now.toLocaleString('id-ID', { month: 'long' })}).`);
            }

            let totalIncome = 0;
            let totalExpense = 0;
            let reportMsg = `*LAPORAN KEUANGAN* \n`;
            reportMsg += `_Periode: ${now.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}_\n\n`;

            const listMsg = transactions.map((tx, i) => {
                const dateStr = new Date(tx.date).toLocaleString('id-ID', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                
                if (tx.type === 'income') totalIncome += tx.amount;
                else totalExpense += tx.amount;

                const emoji = tx.type === 'income' ? '' : '';
                const amountFormatted = new Intl.NumberFormat('id-ID').format(tx.amount);
                
                return `${i + 1}. [${dateStr}] ${emoji} *Rp ${amountFormatted}*\n   _${tx.description} (${tx.category})_\n   \`${tx._id}\``;
            }).join('\n\n');

            const balance = totalIncome - totalExpense;
            const formatCurrency = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

            let summary = `*RINGKASAN:* \n`;
            summary += ` Pemasukan: ${formatCurrency(totalIncome)}\n`;
            summary += ` Pengeluaran: ${formatCurrency(totalExpense)}\n`;
            summary += `--------------------------\n`;
            summary += `*SISA SALDO: ${formatCurrency(balance)}*\n\n`;

            await m.reply(`${reportMsg}${summary}*DETAIL TRANSAKSI:*\n${listMsg}`);

        } catch (error) {
            console.error('Laporan Error:', error);
            await m.reply('Gagal mengambil laporan transaksi.');
        }
    }
};
