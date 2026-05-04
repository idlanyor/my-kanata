import util from 'util';

export default {
    name: 'inspect',
    aliases: ['m', 'debug-m'],
    description: 'Mengintip isi objek m (Serialized Message)',
    category: 'Owner',
    execute: async (sock, m, args) => {
        // Kita hanya cetak ke console karena objeknya sangat besar dan berputar (circular)
        // Jika dikirim ke WhatsApp, bisa menyebabkan bot hang/crash
        console.log('─── [ DEBUG OBJECT M ] ───');
        
        // Menggunakan util.inspect agar properti non-enumerable dan depth terlihat jelas
        console.log(util.inspect(m, { 
            depth: 1, // Kita set depth 1 dulu agar tidak terlalu panjang, naikkan jika ingin lebih detail
            colors: true,
            showProxy: true
        }));
        
        console.log('─── [ END OF DEBUG ] ───');

        await m.reply('✅ Isi objek `m` telah dicetak ke terminal PM2. Silakan cek dengan perintah `pm2 logs`.');
    }
};
