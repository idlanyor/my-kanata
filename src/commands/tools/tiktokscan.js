import { getTikTokProfileVideos } from '../../lib/tiktokScraper.js';
import { settings } from '../../config/settings.js';

export default {
    name: 'tiktokscan',
    aliases: ['ttscan'],
    description: 'Scan all video links from a TikTok profile (Owner Only)',
    category: 'Tools',
    execute: async (sock, m, args, text) => {
        const isOwner = m.sender === settings.ownerNumber || m.sender === settings.ownerLid;
        if (!isOwner) return;

        const target = args[0];
        if (!target) return m.reply('Masukkan username TikTok atau link profil!\nContoh: .ttscan @soffymedicallambulnce21');

        await m.reply('Bentar ya, lagi proses scan profile... (biasanya 10-20 detik)');

        const videos = await getTikTokProfileVideos(target);

        if (videos.length === 0) {
            return m.reply('Gagal mendapatkan video. Pastikan akun tidak privat atau coba lagi nanti.');
        }

        let resMsg = `*── 「 TIKTOK SCANNER 」 ──*\n\n`;
        resMsg += `➛ *Target:* ${target}\n`;
        resMsg += `➛ *Total Video:* ${videos.length}\n\n`;
        
        resMsg += videos.join('\n');

        await m.reply(resMsg);
    }
};