import 'dotenv/config';
import { makeWASocket, useMultiFileAuthState, Browsers, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import pino from 'pino';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import fsExtra from 'fs-extra';
import connectDB from './config/database.js';
import { loadCommands } from './lib/commands.js';
import logger from './lib/logger.js';
import { startPrayerScheduler } from './lib/prayerScheduler.js';
import { startGroupScheduler } from './lib/groupScheduler.js';
import { botSocket } from './lib/socket.js';
import { startWebhookApi } from './lib/webhookApi.js';
import { registerRecurringTasks, registerSocketEvents } from './lib/botRuntime.js';

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

    let phoneNumber = process.env.BOT_PHONE_NUMBER || null;
    if (!state.creds.registered && !phoneNumber) {
        console.log('\x1b[33m%s\x1b[0m', 'Bot not registered. Starting fresh pairing process.');
        const input = await question('Please enter your WhatsApp number (e.g. 628123456789): ');
        phoneNumber = input.trim();
    } else if (!state.creds.registered && phoneNumber) {
        console.log('\x1b[33m%s\x1b[0m', `Bot not registered. Using BOT_PHONE_NUMBER from .env: ${phoneNumber}`);
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
        registerRecurringTasks(sock);

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
        registerSocketEvents({ sock, saveCreds, connectToWhatsApp, authFolder });
    };
    connectToWhatsApp();
};
startBot();
