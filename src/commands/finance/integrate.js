import User from '../../database/models/User.js';
import bcrypt from 'bcrypt';

export default {
    name: 'integrate',
    aliases: ['webauth', 'weblogin'],
    description: 'Generate atau atur password untuk login ke Dashboard Web',
    category: 'Finance',
    execute: async (sock, m, args, text) => {
        try {
            const userId = m.sender;
            const phoneNumber = userId.split('@')[0].split(':')[0]; // Ambil nomor asli tanpa :suffix
            const password = args[0];

            if (!password) {
                return m.reply(
                    `*INTEGRASI DASHBOARD WEB*\n\nGunakan perintah ini untuk mengatur password login ke dashboard web finansial kamu.\n\n*Cara Pakai:*\n.integrate <password_pilihan_kamu>\n\n*Detail Login Web:*\nUsername: \`${phoneNumber}\`\nPassword: (Sesuai yang kamu atur)\n\n_Catatan: Jangan berikan password ini kepada siapapun._`
                );
            }

            if (password.length < 6) {
                return m.reply('Password minimal harus 6 karakter.');
            }

            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            await User.findOneAndUpdate(
                { jid: userId },
                { webPassword: hashedPassword },
                { upsert: true }
            );

            await m.reply(
                `*BERHASIL!*\n\nPassword dashboard web kamu telah diatur.\n\n*Link Web:* (Masukkan URL Web Kamu)\n*Username:* \`${phoneNumber}\`\n*Password:* \`${password}\`\n\nSilakan simpan data ini untuk login.`
            );
        } catch (error) {
            console.error('Integrate Error:', error);
            await m.reply('Terjadi kesalahan saat mengatur password integrasi.');
        }
    },
};
