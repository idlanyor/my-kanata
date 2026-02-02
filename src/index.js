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

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

const cleanupAuth = async () => {
    const authFolder = 'auth_info_baileys';
    if (!fs.existsSync(authFolder)) return;

    try {
        const files = await fs.promises.readdir(authFolder);
        let deletedCount = 0;
        const now = Date.now();
        const ONE_DAY = 24 * 60 * 60 * 1000;

        for (const file of files) {
            // JANGAN hapus file krusial
            if (file === 'creds.json' || file.startsWith('app-state-sync-key-')) continue;

            const filePath = path.join(authFolder, file);
            const stats = await fs.promises.stat(filePath);

            // Hapus file yang tidak tersentuh lebih dari 24 jam
            if (now - stats.mtimeMs > ONE_DAY) {
                await fs.promises.unlink(filePath);
                deletedCount++;
            }
        }

        if (deletedCount > 0) {
            logger.info(`Cleaned up ${deletedCount} unused auth files`);
        }
    } catch (err) {
        logger.error(err, 'Error during auth cleanup');
    }
};

const startBot = async () => {
    // Connect Database
    await connectDB();
    
    // Load Commands
    await loadCommands();

    // Initial Cleanup
    await cleanupAuth();
    // Run cleanup every hour
    setInterval(cleanupAuth, 60 * 60 * 1000);

    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

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
            keepAliveIntervalMs: 30000,
        });

        // Pairing Code logic
        if (!sock.authState.creds.registered) {
            const phoneNumber = await question('Please enter your WhatsApp number (e.g. 628123456789): ');
            const code = await sock.requestPairingCode(phoneNumber.trim());
            console.log(`\nYour Pairing Code: \x1b[32m${code}\x1b[0m\n`);
        }

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'close') {
                const statusCode = lastDisconnect.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                
                logger.error(`Connection closed. Reason: ${statusCode}, Reconnecting: ${shouldReconnect}`);

                if (shouldReconnect) {
                    if (statusCode === DisconnectReason.restartRequired || statusCode === DisconnectReason.connectionLost) {
                        logger.info('Restarting connection in 5 seconds...');
                        setTimeout(() => connectToWhatsApp(), 5000);
                    } else {
                        connectToWhatsApp();
                    }
                } else {
                    logger.error('Logged out. Please delete auth folder and scan again.');
                    if (fs.existsSync('auth_info_baileys')) {
                        // Optional: fs.rmSync('auth_info_baileys', { recursive: true, force: true });
                    }
                }
            } else if (connection === 'open') {
                logger.info(' Opened connection to WhatsApp');
            }
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type === 'notify') {
                for (const m of messages) {
                    // Raw Message Logging for Analysis
                    console.log('--- RAW MESSAGE START ---');
                    console.log(JSON.stringify(m, null, 2));
                    console.log('--- RAW MESSAGE END ---');
                    
                    await messageHandler(sock, m);
                }
            }
        });
    };

    connectToWhatsApp();
};

startBot();
