import 'dotenv/config';
import {
    makeWASocket,
    useMultiFileAuthState,
    Browsers,
    makeCacheableSignalKeyStore,
    fetchLatestBaileysVersion,
} from 'baileys';
import pino from 'pino';
import fs from 'fs';
import NodeCache from 'node-cache';
import connectDB from './config/database.js';
import { loadCommands } from './lib/commands.js';
import logger from './utils/logger.js';
import { startPrayerScheduler } from './lib/prayerScheduler.js';
import { startGroupScheduler } from './lib/groupScheduler.js';
import { startWebhookApi } from './services/webhookApi.js';
import { registerRecurringTasks, registerSocketEvents } from './lib/botRuntime.js';
import { jadibotService } from './services/jadibotService.js';
import { attachGroupStatusCompat } from './lib/groupStatusCompat.js';
import { attachListMessageCompat } from './lib/listMessageCompat.js';
import { attachGroupMetadataPatch } from './lib/groupMetadataPatch.js';
import { sanitizeAuthFolder, wrapSignalKeyStoreWithSanitizer } from './lib/authStateSanitizer.js';
import { patchInteractiveMessageForMd, installProcessGuards } from './lib/appSetup.js';

const authFolder = 'auth_info_baileys';
const msgRetryCounterCache = new NodeCache();
let activeSocket = null;
let backgroundTasksStarted = false;
let isApiStarted = false;
let isAppInitialized = false;

const startBot = async () => {
    if (!isAppInitialized) {
        await connectDB();
        await loadCommands();
        isAppInitialized = true;
    }

    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    await sanitizeAuthFolder(authFolder);
    state.keys = wrapSignalKeyStoreWithSanitizer(state.keys, authFolder); // Re-enabled on Sprint 3
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'warn' }),
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'warn' })),
        },
        browser: Browsers.macOS('safari'),
        msgRetryCounterCache,
        markOnline: true,
        generateHighQualityLinkPreview: false,
        syncFullHistory: false,
        shouldSyncHistoryMessage: () => false,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
        patchMessageBeforeSending: async (message) => patchInteractiveMessageForMd(message),
    });

    attachGroupStatusCompat(sock);
    attachListMessageCompat(sock);
    attachGroupMetadataPatch(sock);

    activeSocket = sock;
    registerRecurringTasks(sock);

    if (!isApiStarted) {
        startWebhookApi({ getSocket: () => activeSocket });
        isApiStarted = true;
    }

    registerSocketEvents({
        sock,
        saveCreds,
        connectToWhatsApp: startBot, // Pass startBot as the reconnection function
        authFolder,
        onOpen: () => {
            if (!backgroundTasksStarted) {
                startPrayerScheduler(sock);
                if (!global.isGroupSchedulerStarted) {
                    startGroupScheduler(() => activeSocket);
                    global.isGroupSchedulerStarted = true;
                }
                backgroundTasksStarted = true;
                jadibotService.init();
            }
        },
    });

    return sock;
};

installProcessGuards(
    () => {
        activeSocket = null;
        return startBot();
    },
    () => activeSocket
);

startBot().catch((err) => {
    logger.error(`Bot failed to start: ${err.message}`);
});
