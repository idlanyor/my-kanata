import 'dotenv/config';
import { makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import pino from 'pino';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import connectDB from './config/database.js';
import { loadCommands } from './lib/commands.js';
import { messageHandler } from './handlers/messageHandler.js';
import logger from './lib/logger.js';
import cron from 'node-cron';
import { sendBackupToOwner } from './lib/backup.js';
import { getMessage } from './lib/msgStore.js';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

/**
 * Cleanup unused session files to keep it light
 */
const cleanupAuth = async () => {
    const authFolder = 'auth_info_baileys';
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
        if (deletedCount > 0) logger.info(`🧹 Cleaned up ${deletedCount} unused auth files`);
    } catch (err) {
        logger.error(err, 'Error during auth cleanup');
    }
};

const startBot = async () => {
    await connectDB();
    await loadCommands();
    await cleanupAuth();
    setInterval(cleanupAuth, 60 * 60 * 1000);

    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const connectToWhatsApp = async () => {
        const sock = makeWASocket({
            // Logger Minimalis
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
            },
            browser: Browsers.macOS('safari'),
            
            // --- KANATA-BAILEYS OPTIMIZATION ---
            enableRecentMessageCache: true, // Aktifkan Cache Pesan untuk E2EE
            maxMsgRetryCount: 3, 
            retryRequestDelayMs: 500,
            
            // Sync & History
            syncFullHistory: false,
            shouldSyncHistoryMessage: () => false,
            
            // Connection Keep-Warm
            markOnline: true,
            keepAliveIntervalMs: 30000,
            
            // Message Store Integration
            getMessage: async (key) => {
                const msg = await getMessage(key.id);
                return msg?.message || undefined;
            },
            
            // Timeouts
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            generateHighQualityLinkPreview: true,
            syncFullHistory: true // Aktifkan sedikit history agar mapping kontak lebih joss
        });

        // Cron Backup
        if (!global.isBackupScheduled) {
            cron.schedule('0 0 * * *', () => sendBackupToOwner(sock), { scheduled: true, timezone: "Asia/Jakarta" });
            global.isBackupScheduled = true;
        }

        // Pairing Code Setup
        if (!sock.authState.creds.registered) {
            console.clear();
            console.log('\x1b[36m%s\x1b[0m', '--- KANATA BOT PAIRING ---');
            const phoneNumber = await question('Please enter your WhatsApp number (e.g. 628123456789): ');
            const code = await sock.requestPairingCode(phoneNumber.trim());
            console.log(`\nYour Pairing Code: \x1b[32m${code}\x1b[0m\n`);
        }

        // Connection Handler
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (connection === 'close') {
                const statusCode = lastDisconnect.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                
                logger.error(`⚠️ Connection closed (${statusCode}). Reconnecting: ${shouldReconnect}`);

                if (shouldReconnect) {
                    setTimeout(() => connectToWhatsApp(), 5000);
                } else {
                    logger.error(' Logged out. Manual intervention required.');
                }
            } else if (connection === 'open') {
                console.log('\x1b[32m%s\x1b[0m', '✅ SUCCESS: Bot is now connected to WhatsApp!');
            }
        });

        // Event Listeners
        sock.ev.on('creds.update', saveCreds);

        // --- GROUP PARTICIPANTS UPDATE (WELCOME/LEAVE) ---
        sock.ev.on('group-participants.update', async (anu) => {
            const { groupParticipantsHandler } = await import('./handlers/groupHandler.js');
            await groupParticipantsHandler(sock, anu);
        });

        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            for (const m of messages) {
                // Global Debug Log
                if (m.key.remoteJid === 'status@broadcast') {
                    console.log(`[DEBUG] Incoming Status from: ${m.key.participant} (Type: ${type})`);
                }
                
                // Jangan batasi hanya 'notify' untuk status, karena kadang status masuk sebagai 'append'
                if (type === 'notify' || m.key.remoteJid === 'status@broadcast') {
                    await messageHandler(sock, m);
                }
            }
        });

        sock.ev.on('messages.update', async (updates) => {
            for (const { key, update } of updates) {
                if (update.pollUpdateMessage) {
                    await messageHandler(sock, { key, message: { pollUpdateMessage: update.pollUpdateMessage } });
                }
                if (update.message?.editedMessage) {
                    await messageHandler(sock, { key, message: update.message, mtype: 'editedMessage' });
                }
            }
        });

        // Auto Save Contacts (LID Support)
        sock.ev.on('contacts.update', (update) => {
            for (const contact of update) {
                // Bisa tambahkan logic save ke database di sini
            }
        });
    };

    connectToWhatsApp();
};

startBot().catch(err => logger.error(err, 'Critical Error in startBot'));