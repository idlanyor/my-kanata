import User from '../../database/models/User.js';
import { settings } from '../../config/settings.js';
import axios from 'axios';

const PTERO_URL = process.env.PTERO_URL;
const PTERO_API_KEY = process.env.PTERO_API_KEY;

const ptero = axios.create({
    baseURL: `${PTERO_URL}/api/application`,
    headers: {
        'Authorization': `Bearer ${PTERO_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'Application/vnd.pterodactyl.v1+json',
    }
});

export default {
    name: 'addbalance',
    aliases: ['addbal', 'topup'],
    description: 'Add balance to a user via Ptero Email (Owner only)',
    category: 'Owner',
    execute: async (sock, m, args, text) => {
        const input = args[0]; // Email
        const amount = parseInt(args[1]);

        if (!input || isNaN(amount)) {
            return m.reply(`*Format Salah!*

` +
                `Gunakan:
` +
                `• ${settings.prefix}addbalance <email_ptero> <jumlah>

` +
                `Contoh: ${settings.prefix}addbalance user@gmail.com 50000`);
        }

        try {
            await m.reply('Mencari user berdasarkan email...');

            // 1. Cari user di Pterodactyl berdasarkan email
            const usersResp = await ptero.get(`/users?filter[email]=${input}`);
            
            if (usersResp.data.data.length === 0) {
                return m.reply(`Gagal: Email *${input}* tidak ditemukan di panel Pterodactyl.`);
            }

            const pteroUser = usersResp.data.data[0].attributes;
            const targetJid = pteroUser.external_id;

            if (!targetJid || !targetJid.includes('@')) {
                return m.reply(`Gagal: Akun Ptero ditemukan, tetapi belum terhubung (bind) dengan WhatsApp.
Mintalah user untuk melakukan .bind ${input} terlebih dahulu.`);
            }

            // 2. Update saldo di database bot berdasarkan JID yang ditemukan
            let user = await User.findOne({ jid: targetJid });
            if (!user) {
                user = await User.create({ jid: targetJid });
            }

            user.balance += amount;
            await user.save();

            const successMsg = `*TOPUP BERHASIL*

` +
                `Email: ${pteroUser.email}
` +
                `WhatsApp: @${targetJid.split('@')[0]}
` +
                `Jumlah: + Rp ${amount.toLocaleString()}
` +
                `Saldo Sekarang: Rp ${user.balance.toLocaleString()}`;

            await sock.sendMessage(m.chat, { 
                text: successMsg, 
                mentions: [targetJid] 
            }, { quoted: m });

        } catch (e) {
            console.error(e);
            await m.reply(`Error: ${e.message}`);
        }
    }
};