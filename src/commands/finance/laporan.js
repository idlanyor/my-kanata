import { getMonthlyReport } from '../../lib/financeService.js';

export default {
    name: 'laporan',
    aliases: ['report', 'listtx'],
    description: 'Lihat laporan transaksi keuangan (Bulanan/Harian)',
    category: 'Finance',
    execute: async (sock, m, args, text) => {
        try {
            const userId = m.sender;
            const now = new Date();
            
            const report = await getMonthlyReport(userId);

            if (report.transactions.length === 0) {
                return m.reply(`Belum ada transaksi tercatat untuk bulan ini (${now.toLocaleString('id-ID', { month: 'long' })}).`);
            }

            let reportMsg = `*LAPORAN KEUANGAN* \n`;
            reportMsg += `_Periode: ${now.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}_\n\n`;

            const listMsg = report.transactions.map((tx, i) => {
                const dateStr = new Date(tx.date).toLocaleString('id-ID', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                
                const emoji = tx.type === 'income' ? '📈' : '📉';
                const amountFormatted = new Intl.NumberFormat('id-ID').format(tx.amount);
                
                return `${i + 1}. [${dateStr}] ${emoji} *Rp ${amountFormatted}*\n   _${tx.description} (${tx.category})_\n   \`${tx._id}\``;
            }).join('\n\n');

            const formatCurrency = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

            let summary = `*RINGKASAN:* \n`;
            summary += ` Pemasukan: ${formatCurrency(report.totalIncome)}\n`;
            summary += ` Pengeluaran: ${formatCurrency(report.totalExpense)}\n`;
            summary += `--------------------------\n`;
            summary += `*SISA SALDO: ${formatCurrency(report.balance)}*\n\n`;

            await m.reply(`${reportMsg}${summary}*DETAIL TRANSAKSI:*\n${listMsg}`);

        } catch (error) {
            console.error('Laporan Error:', error);
            await m.reply('Gagal mengambil laporan transaksi.');
        }
    }
};
