import 'dotenv/config';
import { makeWASocket, useMultiFileAuthState, Browsers, makeCacheableSignalKeyStore, fetchLatestBaileysVersion } from 'baileys';
import pino from 'pino';
import fs from 'fs';
import NodeCache from 'node-cache';
import connectDB from './config/database.js';
import { loadCommands } from './lib/commands.js';
import logger from './lib/logger.js';
import { startPrayerScheduler } from './lib/prayerScheduler.js';
import { startGroupScheduler } from './lib/groupScheduler.js';
import { startWebhookApi } from './lib/webhookApi.js';
import { registerRecurringTasks, registerSocketEvents } from './lib/botRuntime.js';
import { jadibotService } from './lib/jadibotService.js';
import { attachGroupStatusCompat } from './lib/groupStatusCompat.js';
import { attachListMessageCompat } from './lib/listMessageCompat.js';
import { attachGroupMetadataPatch } from './lib/groupMetadataPatch.js';
import { sanitizeAuthFolder, wrapSignalKeyStoreWithSanitizer } from './lib/authStateSanitizer.js';

const authFolder = 'auth_info_baileys';
const msgRetryCounterCache = new NodeCache();
let activeSocket = null;
let backgroundTasksStarted = false;
let isApiStarted = false;
let isAppInitialized = false;
let recoveryScheduled = false;

const patchInteractiveMessageForMd = (message) => {
    const alreadyWrapped = message?.viewOnceMessage?.message || message?.viewOnceMessageV2?.message || message?.viewOnceMessageV2Extension?.message;
    if (alreadyWrapped) {
        return message;
    }

    const requiresPatch = !!(
        message?.buttonsMessage ||
        message?.listMessage ||
        message?.interactiveMessage
    );

    if (!requiresPatch) {
        return message;
    }

    return {
        viewOnceMessage: {
            message: {
                messageContextInfo: {
                    deviceListMetadata: {},
                    deviceListMetadataVersion: 2,
                },
                ...message,
            },
        },
    };
};

const formatError = (error) => {
    if (error instanceof Error) {
        return error.stack || `${error.name}: ${error.message}`;
    }

    if (typeof error === 'string') {
        return error;
    }

    try {
        return JSON.stringify(error);
    } catch {
        return String(error);
    }
};

const isRecoverableLibsignalError = (error) => {
    const message = error instanceof Error ? `${error.message}\n${error.stack || ''}` : String(error || '');
    return message.includes('Incorrect private key length: 0') || message.includes('libsignal');
};

const scheduleSoftRecovery = (reason) => {
    if (recoveryScheduled) {
        logger.warn(`Recovery already scheduled. Ignoring duplicate trigger: ${reason}`);
        return;
    }

    recoveryScheduled = true;
    logger.warn(`Scheduling soft recovery in 5s due to: ${reason}`);

    setTimeout(async () => {
        try {
            if (activeSocket?.ws && typeof activeSocket.ws.close === 'function') {
                activeSocket.ws.close();
            }
        } catch (closeError) {
            logger.warn(`Failed to close existing socket during recovery: ${closeError.message}`);
        }

        activeSocket = null;

        try {
            await startBot();
            logger.info('Soft recovery completed');
        } catch (restartError) {
            logger.error(`Soft recovery failed: ${restartError.message}`);
        } finally {
            recoveryScheduled = false;
        }
    }, 5000);
};

const installProcessGuards = () => {
    process.on('uncaughtException', (error) => {
        logger.error(`Uncaught exception:\n${formatError(error)}`);

        if (isRecoverableLibsignalError(error)) {
            scheduleSoftRecovery('recoverable libsignal error');
            return;
        }
    });

    process.on('unhandledRejection', (reason) => {
        logger.error(`Unhandled rejection:\n${formatError(reason)}`);

        if (isRecoverableLibsignalError(reason)) {
            scheduleSoftRecovery('recoverable libsignal rejection');
        }
    });
};

const startBot = async () => {
    if (!isAppInitialized) {
        await connectDB();
        await loadCommands();
        isAppInitialized = true;
    }

    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    await sanitizeAuthFolder(authFolder);
    // state.keys = wrapSignalKeyStoreWithSanitizer(state.keys, authFolder); // Di-disable sementara karena terlalu agresif
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
        }
    });

    return sock;
};

installProcessGuards();

startBot().catch(err => {
    logger.error(`Bot failed to start: ${err.message}`);
});
