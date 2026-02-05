import { sendBackupToOwner } from '../../lib/backup.js';

export default {
    name: 'backup',
    description: 'Manual Database Backup (Owner only)',
    category: 'Owner',
    execute: async (sock, m, args, text) => {
        await m.reply('Generating backup file...');
        try {
            await sendBackupToOwner(sock);
            await m.reply('Backup has been sent to your private chat.');
        } catch (e) {
            console.error('[COMMAND DEBUG] Backup Error:', e);
            let errorMsg = `Backup failed: ${e.message}\n\nCheck terminal for full log.`;
            if (e.stack) {
                console.error(e.stack);
            }
            await m.reply(errorMsg);
        }
    }
};