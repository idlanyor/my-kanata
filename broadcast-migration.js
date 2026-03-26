import mongoose from 'mongoose';
import axios from 'axios';

// Configuration
const MONGODB_URI = 'mongodb://localhost:27017/mywhatsappbot';
const BOT_WEBHOOK_URL = 'http://127.0.0.1:8787/api/webhook/send-text';
const BOT_WEBHOOK_TOKEN = 'anohimitahananonamaewobokutachiwamadashiranai';

// User Schema
const userSchema = new mongoose.Schema({
    jid: String,
    name: String,
    emailCloud: String,
    balance: Number
});

const User = mongoose.model('User', userSchema);

async function startBroadcast() {
    try {
        console.log('--- MIGRATION BROADCAST STARTED ---');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB.');

        const users = await User.find({ 
            jid: /@s.whatsapp.net|@lid/,
            emailCloud: { $ne: '', $exists: true } 
        });
        console.log(`Found ${users.length} users with bound Pterodactyl accounts to notify.`);

        for (const user of users) {
            const firstName = user.name.split(' ')[0];
            const email = user.emailCloud || 'Email belum terdata';
            
            const message = `*📢 PENGUMUMAN PENTING: MIGRASI DASHBOARD IRENG CLOUD*

Halo *${firstName}* 👋

Kami mengundang Anda untuk mendaftarkan akun di **Dashboard Ireng Cloud** terbaru agar pengelolaan server Pterodactyl Anda lebih aman dan mudah.

*Informasi Akun Anda:*
📧 Email Terdaftar: \`${email}\`
💰 Saldo Bot: Rp ${(user.balance || 0).toLocaleString('id-ID')}

*Langkah Cepat:*
1️⃣ Daftar di: 🌐 https://ireng.uk/register
2️⃣ Masukkan No. WhatsApp aktif Anda saat registrasi.
3️⃣ Ke menu **Pterodactyl** > klik **"Bind Account"** (Gunakan email \`${email}\`).

⚠️ Mohon selesaikan pendaftaran sebelum masa aktif server berakhir agar fitur *Automatic Renewal Reminder* via WhatsApp kami bisa mulai mengirimkan notifikasi kepada Anda.

Jika ada kendala, admin siap membantu di grup!
*— Management Ireng Cloud*`;

            console.log(`Sending to ${user.name} (${user.jid})...`);

            try {
                await axios.post(BOT_WEBHOOK_URL, {
                    to: user.jid,
                    text: message
                }, {
                    headers: {
                        'Authorization': `Bearer ${BOT_WEBHOOK_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                });
                console.log(`✅ Success sent to ${user.name}`);
            } catch (err) {
                console.error(`❌ Failed to send to ${user.name}:`, err.response?.data || err.message);
            }

            // Random delay between 5-10 seconds to avoid spam detection
            const delay = Math.floor(Math.random() * (10000 - 5000 + 1) + 5000);
            console.log(`Waiting for ${delay/1000}s before next message...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        console.log('--- BROADCAST COMPLETED ---');
        process.exit(0);
    } catch (err) {
        console.error('Fatal Error:', err);
        process.exit(1);
    }
}

startBroadcast();
