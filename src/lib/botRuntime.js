import { DisconnectReason } from '@whiskeysockets/baileys';
import cron from 'node-cron';
import axios from 'axios';
import fsExtra from 'fs-extra';
import { messageHandler, clearSettingsCache } from '../handlers/messageHandler.js';
import logger from './logger.js';
import { sendBackupToOwner } from './backup.js';
import Server from '../database/models/Server.js';
import Group from '../database/models/Group.js';
import { botSocket } from './socket.js';
import { cleanupCaches } from '../handlers/messageFlow.js';
import { cleanupChatHistories } from '../lib/ai.js';

const safeAck = (ack, payload) => {
    if (typeof ack === 'function') ack(payload);
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isAlreadyLeftError = (message) => /not\s+a?\s*participant|not\s*found|404|bad request|forbidden|group.*not.*found/i.test(message);

const runGroupSync = async (sock, data, ack) => {
    try {
        const targetJid = data.jid;
        if (targetJid) {
            const meta = await sock.groupMetadata(targetJid);
            await Group.findOneAndUpdate(
                { jid: targetJid },
                { name: meta.subject, announce: !!meta.announce, restrict: !!meta.restrict },
                { upsert: true }
            );
            botSocket.emitLog('Synced: ' + meta.subject, 'success');
            safeAck(ack, { ok: true });
            return;
        }

        logger.info('Starting Smart Group Sync...');
        const groups = await sock.groupFetchAllParticipating();
        let count = 0;

        for (const jid in groups) {
            const dbGroup = await Group.findOne({ jid });
            if (dbGroup && dbGroup.name) continue;

            await delay(5000);
            try {
                const meta = await sock.groupMetadata(jid);
                await Group.findOneAndUpdate(
                    { jid },
                    { name: meta.subject, announce: !!meta.announce, restrict: !!meta.restrict },
                    { upsert: true }
                );
                count++;
                logger.info('Resolved: ' + meta.subject);
            } catch (e) {
                logger.warn('Fail: ' + jid);
                if (e.message.includes('rate')) break;
            }
        }

        botSocket.emitLog('Smart Sync complete. Updated ' + count + ' groups', 'success');
        safeAck(ack, { ok: true, updated: count });
    } catch (err) {
        logger.error(err);
        safeAck(ack, { ok: false, error: err.message });
    }
};

const runGroupDelete = async (sock, data, ack) => {
    const targetJid = data.jid;
    if (!targetJid) {
        safeAck(ack, { ok: false, error: 'Group JID is required' });
        return;
    }

    try {
        await sock.groupLeave(targetJid);
        botSocket.emitLog(`Left group: ${data.groupName || targetJid}`, 'success');
        safeAck(ack, { ok: true, alreadyLeft: false });
    } catch (err) {
        const message = String(err?.message || err || '');
        if (isAlreadyLeftError(message)) {
            botSocket.emitLog(`Group leave skipped (already left): ${data.groupName || targetJid}`, 'warning');
            safeAck(ack, { ok: true, alreadyLeft: true });
            return;
        }
        logger.error(err);
        safeAck(ack, { ok: false, error: err.message || 'Failed to leave group' });
    }
};

const registerBotSocketCommands = (sock) => {
    botSocket.socket.off('bot:command').on('bot:command', async (data, ack) => {
        if (data.command === 'group:sync') {
            await runGroupSync(sock, data, ack);
            return;
        }

        if (data.command === 'group:delete') {
            await runGroupDelete(sock, data, ack);
        }
    });
};

export const registerSocketEvents = ({ sock, saveCreds, connectToWhatsApp, authFolder }) => {
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
                } else {
                    connectToWhatsApp();
                }
            }
        } else if (connection === 'open') {
            logger.info(' Opened connection to WhatsApp');
        }
    });

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type === 'notify' && Array.isArray(messages) && messages.length > 0) {
            await Promise.allSettled(messages.map((m) => messageHandler(sock, m)));
        }
    });

    registerBotSocketCommands(sock);
};

const scheduleBackup = (sock) => {
    cron.schedule('0 0 * * *', () => {
        logger.info('Running automated database backup...');
        sendBackupToOwner(sock);
    }, { scheduled: true, timezone: 'Asia/Jakarta' });
};

const scheduleAutoSuspend = (sock) => {
    cron.schedule('0 * * * *', async () => {
        try {
            const sevenDaysAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
            const expiredServers = await Server.find({ expiredAt: { $lt: sevenDaysAgo }, status: 'active' });
            if (expiredServers.length === 0) return;

            const ptero = axios.create({
                baseURL: `${process.env.PTERO_URL}/api/application`,
                headers: {
                    Authorization: `Bearer ${process.env.PTERO_API_KEY}`,
                    'Content-Type': 'application/json',
                    Accept: 'Application/vnd.pterodactyl.v1+json',
                },
            });

            for (const srv of expiredServers) {
                try {
                    await ptero.post(`/servers/${srv.pteroId}/suspend`);
                    srv.status = 'suspended';
                    await srv.save();
                    await sock.sendMessage(srv.userId, {
                        text: `*LAYANAN DI-SUSPEND*\n\nServer Anda *${srv.planName}* (ID: ${srv.identifier}) telah ditangguhkan karena melewati jatuh tempo lebih dari 7 hari.\nSilakan perpanjang untuk mengaktifkan kembali.`,
                    });
                } catch (err) {
                    logger.error(`[SYSTEM] Failed to suspend server ${srv.pteroId}: ${err.message}`);
                }
            }
        } catch (err) {
            logger.error('[SYSTEM] Error in auto-suspend task:', err);
        }
    }, { scheduled: true, timezone: 'Asia/Jakarta' });
};

const scheduleExpiryReminder = (sock) => {
    cron.schedule('0 8 * * *', async () => {
        try {
            const fiveDaysLater = new Date();
            fiveDaysLater.setDate(fiveDaysLater.getDate() + 5);
            const startOf5Days = new Date(fiveDaysLater.setHours(0, 0, 0, 0));
            const endOf5Days = new Date(fiveDaysLater.setHours(23, 59, 59, 999));

            const expiringServers = await Server.find({
                expiredAt: { $gte: startOf5Days, $lte: endOf5Days },
                status: 'active',
            });

            for (const srv of expiringServers) {
                await sock.sendMessage(srv.userId, {
                    text: `*REMINDER MASA AKTIF*\n\nServer Anda *${srv.planName}* (ID: ${srv.identifier}) akan expired dalam *5 hari* lagi (${srv.expiredAt.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}).\n\nSegera lakukan perpanjangan agar layanan tidak terputus.`,
                });
            }
        } catch (err) {
            logger.error('[SYSTEM] Error in reminder task:', err);
        }
    }, { scheduled: true, timezone: 'Asia/Jakarta' });
};

/**
 * Schedule periodic cache cleanup (every 10 minutes)
 */
const scheduleCacheCleanup = () => {
    cron.schedule('*/10 * * * *', () => {
        try {
            const chatCleaned = cleanupChatHistories();
            const cacheCleaned = cleanupCaches();
            
            if (chatCleaned > 0 || cacheCleaned > 0) {
                logger.info(`[CACHE] Cleaned up ${chatCleaned} chat histories and ${cacheCleaned} cache entries`);
            }
        } catch (err) {
            logger.error('[SYSTEM] Error in cache cleanup task:', err);
        }
    }, { scheduled: true, timezone: 'Asia/Jakarta' });
};

export const registerRecurringTasks = (sock) => {
    if (global.isBackupScheduled) return;
    scheduleBackup(sock);
    // scheduleAutoSuspend(sock); // Dimatikan sementara karena menyebabkan error 404
    scheduleExpiryReminder(sock);
    scheduleCacheCleanup(); // Add cache cleanup
    global.isBackupScheduled = true;
};
