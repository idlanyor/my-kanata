import fs from 'fs';
import path from 'path';
import User from '../database/models/User.js';
import Transaction from '../database/models/Transaction.js';
import Settings from '../database/models/Settings.js';
import { settings } from '../config/settings.js';

export const createDatabaseBackup = async () => {
    try {
        console.log('[DEBUG] Starting database fetch...');
        const users = await User.find({});
        const transactions = await Transaction.find({});
        const botSettings = await Settings.find({});
        console.log(`[DEBUG] Fetched ${users.length} users, ${transactions.length} transactions.`);

        const backupData = {
            timestamp: new Date().toISOString(),
            users,
            transactions,
            settings: botSettings
        };

        const fileName = `backup-${new Date().toISOString().split('T')[0]}.json`;
        const filePath = path.join(process.cwd(), fileName);

        console.log(`[DEBUG] Writing backup to: ${filePath}`);
        await fs.promises.writeFile(filePath, JSON.stringify(backupData, null, 2));
        
        const stats = fs.statSync(filePath);
        console.log(`[DEBUG] Backup file created. Size: ${(stats.size / 1024).toFixed(2)} KB`);
        
        return { filePath, fileName };
    } catch (error) {
        console.error('[DEBUG] Backup creation failed:', error);
        throw error;
    }
};

export const sendBackupToOwner = async (sock) => {
    let backupFile = null;
    try {
        backupFile = await createDatabaseBackup();
        let ownerJid = settings.ownerNumber;
        if (!ownerJid.endsWith('@s.whatsapp.net')) {
            ownerJid += '@s.whatsapp.net';
        }

        console.log(`[DEBUG] Attempting to send document to ${ownerJid}...`);

        await sock.sendMessage(ownerJid, {
            document: { url: backupFile.filePath },
            mimetype: 'application/json',
            fileName: backupFile.fileName,
            caption: `*SYSTEM BACKUP*\n\nDate: ${new Date().toLocaleString()}\nStatus: Success`
        });

        console.log(`[DEBUG] Message sent successfully.`);

        setTimeout(async () => {
            if (fs.existsSync(backupFile.filePath)) {
                await fs.promises.unlink(backupFile.filePath);
                console.log(`[DEBUG] Temporary backup file deleted.`);
            }
        }, 10000);

    } catch (error) {
        console.error('[DEBUG] sendBackupToOwner error detail:', error);
        if (backupFile && fs.existsSync(backupFile.filePath)) {
            await fs.promises.unlink(backupFile.filePath);
        }
        throw error; // Throw so command can catch it
    }
};