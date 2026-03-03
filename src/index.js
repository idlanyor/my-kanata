import 'dotenv/config';
import { makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import pino from 'pino';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import fsExtra from 'fs-extra';
import connectDB from './config/database.js';
import { loadCommands } from './lib/commands.js';
import { messageHandler } from './handlers/messageHandler.js';
import logger from './lib/logger.js';
import cron from 'node-cron';
import { sendBackupToOwner } from './lib/backup.js';
import Server from './database/models/Server.js';
import Group from './database/models/Group.js';
import User from './database/models/User.js';
import axios from 'axios';
import { startPrayerScheduler } from './lib/prayerScheduler.js';
import { startGroupScheduler } from './lib/groupScheduler.js';
import { botSocket } from './lib/socket.js';
import { startWebhookApi } from './lib/webhookApi.js';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));
let activeSocket = null;

const authFolder = 'auth_info_baileys';

const cleanupAuth = async () => {
    if (!fs.existsSync(authFolder)) return;
    try {
        const files = await fs.promises.readdir(authFolder);
        let deletedCount = 0;
        const now = Date.now();
        const ONE_DAY = 24 * 60 * 60 * 1000;
        for (const file of files) {
            if (file === 'creds.json' || file.startsWith('app-state-sync-key-')) continue;
            const filePath = path.join(authFolder, file);
            const stats = await fs.promises.stat(filePath);
            if (now - stats.mtimeMs > ONE_DAY) {
                await fs.promises.unlink(filePath);
                deletedCount++;
            }
        }
        if (deletedCount > 0) logger.info(`Cleaned up ${deletedCount} unused auth files`);
    } catch (err) {
        logger.error(err, 'Error during auth cleanup');
    }
};

const startBot = async () => {
    botSocket.connect();
    if (!global.isWebhookApiStarted) {
        startWebhookApi({ getSocket: () => activeSocket });
        global.isWebhookApiStarted = true;
    }
    await connectDB();
    await loadCommands();
    await cleanupAuth();
    setInterval(cleanupAuth, 60 * 60 * 1000);

    let { state, saveCreds } = await useMultiFileAuthState(authFolder);

    // FIX: Auto-clean corrupted/stale session before asking for number
    if (!state.creds.registered && fs.existsSync(authFolder)) {
        const files = fs.readdirSync(authFolder);
        if (files.length > 0) {
            logger.warn('Stale session detected. Purging auth folder for a fresh start...');
            fsExtra.emptyDirSync(authFolder);
            // Re-init state after purge
            const refreshed = await useMultiFileAuthState(authFolder);
            state = refreshed.state;
            saveCreds = refreshed.saveCreds;
        }
    }

    let phoneNumber = null;
    if (!state.creds.registered) {
        console.log('\x1b[33m%s\x1b[0m', 'Bot not registered. Starting fresh pairing process.');
        const input = await question('Please enter your WhatsApp number (e.g. 628123456789): ');
        phoneNumber = input.trim();
    }

    const connectToWhatsApp = async () => {
        const sock = makeWASocket({
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
            },
            browser: Browsers.macOS('safari'),
            markOnline: true,
            generateHighQualityLinkPreview: false,
            syncFullHistory: false,
            shouldSyncHistoryMessage: () => false,
            keepAliveIntervalMs: 60000,
            defaultQueryTimeoutMs: 60000,
            connectTimeoutMs: 60000,
            retryRequestDelayMs: 5000,
        });
        activeSocket = sock;
        if (!global.isBackupScheduled) {
            cron.schedule('0 0 * * *', () => {
                logger.info('Running automated database backup...');
                sendBackupToOwner(sock);
            }, { scheduled: true, timezone: "Asia/Jakarta" });
            
                        cron.schedule('0 * * * *', async () => {
            
                            try {
            
                                const sevenDaysAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
            
                                const expiredServers = await Server.find({ expiredAt: { $lt: sevenDaysAgo }, status: 'active' });
            
                                if (expiredServers.length === 0) return;
            
                                const ptero = axios.create({
            
                                    baseURL: `${process.env.PTERO_URL}/api/application`,
            
                                    headers: {
            
                                        'Authorization': `Bearer ${process.env.PTERO_API_KEY}`,
            
                                        'Content-Type': 'application/json',
            
                                        'Accept': 'Application/vnd.pterodactyl.v1+json',
            
                                    }
            
                                });
            
                                for (const srv of expiredServers) {
            
                                    try {
            
                                        await ptero.post(`/servers/${srv.pteroId}/suspend`);
            
                                        srv.status = 'suspended';
            
                                        await srv.save();
            
                                        await sock.sendMessage(srv.userId, { 
            
                                            text: `*LAYANAN DI-SUSPEND*\n\nServer Anda *${srv.planName}* (ID: ${srv.identifier}) telah ditangguhkan karena melewati jatuh tempo lebih dari 7 hari.\nSilakan perpanjang untuk mengaktifkan kembali.` 
            
                                        });
            
                                    } catch (err) { logger.error(`[SYSTEM] Failed to suspend server ${srv.pteroId}: ${err.message}`); }
            
                                }
            
                            } catch (err) { logger.error('[SYSTEM] Error in auto-suspend task:', err); }
            
                        }, { scheduled: true, timezone: "Asia/Jakarta" });
            
            
            
                        // Task: Reminder 5 days before expired (Every day at 08:00)
            
                        cron.schedule('0 8 * * *', async () => {
            
                            try {
            
                                const fiveDaysLater = new Date();
            
                                fiveDaysLater.setDate(fiveDaysLater.getDate() + 5);
            
                                const startOf5Days = new Date(fiveDaysLater.setHours(0, 0, 0, 0));
            
                                const endOf5Days = new Date(fiveDaysLater.setHours(23, 59, 59, 999));
            
            
            
                                const expiringServers = await Server.find({ 
            
                                    expiredAt: { $gte: startOf5Days, $lte: endOf5Days },
            
                                    status: 'active' 
            
                                });
            
            
            
                                for (const srv of expiringServers) {
            
                                    await sock.sendMessage(srv.userId, { 
            
                                        text: `*REMINDER MASA AKTIF*\n\nServer Anda *${srv.planName}* (ID: ${srv.identifier}) akan expired dalam *5 hari* lagi (${srv.expiredAt.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}).\n\nSegera lakukan perpanjangan agar layanan tidak terputus.` 
            
                                    });
            
                                }
            
                            } catch (err) { logger.error('[SYSTEM] Error in reminder task:', err); }
            
                        }, { scheduled: true, timezone: "Asia/Jakarta" });
            
                        
            
                        global.isBackupScheduled = true;
            
                    }

        startPrayerScheduler(sock);
        if (!global.isGroupSchedulerStarted) {
            startGroupScheduler(() => activeSocket);
            global.isGroupSchedulerStarted = true;
        }

        if (phoneNumber && !sock.authState.creds.registered) {
            setTimeout(async () => {
                try {
                    const code = await sock.requestPairingCode(phoneNumber);
                    console.log(`\nYour Pairing Code: \x1b[32m${code}\x1b[0m\n`);
                } catch (err) {
                    logger.error(err, 'Error requesting pairing code');
                }
            }, 6000);
        }

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === 'close') {
                const statusCode = lastDisconnect.error?.output?.statusCode;
                if (statusCode === DisconnectReason.loggedOut) {
                    logger.error('Logged out. Deleting auth folder...');
                    fsExtra.emptyDirSync(authFolder);
                    process.exit(1); 
                }
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                if (shouldReconnect) {
                    if (statusCode === DisconnectReason.restartRequired || statusCode === DisconnectReason.connectionLost) {
                        setTimeout(() => connectToWhatsApp(), 5000);
                    } else { connectToWhatsApp(); }
                }
            } else if (connection === 'open') { logger.info(' Opened connection to WhatsApp'); }
        });

        sock.ev.on('creds.update', saveCreds);
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type === 'notify') {
                for (const m of messages) { await messageHandler(sock, m); }
            }
        });

        botSocket.socket.off('bot:command').on('bot:command', async (data) => {
            if (data.command === 'group:sync') {
                try {
                    const targetJid = data.jid;
                    if (targetJid) {
                        const meta = await sock.groupMetadata(targetJid);
                        await Group.findOneAndUpdate({ jid: targetJid }, { name: meta.subject, announce: !!meta.announce, restrict: !!meta.restrict }, { upsert: true });
                        botSocket.emitLog('Synced: ' + meta.subject, 'success');
                        return;
                    }
                    logger.info('Starting Smart Group Sync...');
                    const groups = await sock.groupFetchAllParticipating();
                    let count = 0;
                    for (const jid in groups) {
                        const dbGroup = await Group.findOne({ jid });
                        if (dbGroup && dbGroup.name) continue;
                        await new Promise(r => setTimeout(r, 5000));
                        try {
                            const meta = await sock.groupMetadata(jid);
                            await Group.findOneAndUpdate({ jid }, { name: meta.subject, announce: !!meta.announce, restrict: !!meta.restrict }, { upsert: true });
                            count++;
                            logger.info('Resolved: ' + meta.subject);
                        } catch (e) { logger.warn('Fail: ' + jid); if(e.message.includes('rate')) break; }
                    }
                    botSocket.emitLog('Smart Sync complete. Updated ' + count + ' groups', 'success');
                } catch (err) { logger.error(err); }
            }
        });
    };
    connectToWhatsApp();
};
startBot();
