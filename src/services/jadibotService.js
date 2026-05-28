import {
    makeWASocket,
    useMultiFileAuthState,
    Browsers,
    makeCacheableSignalKeyStore,
    fetchLatestBaileysVersion,
    DisconnectReason,
} from 'baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import fsExtra from 'fs-extra';
import logger from '\.\./utils/logger\.js';
import { messageHandler } from '../handlers/messageHandler.js';
import { attachGroupMetadataPatch } from '\.\./lib/groupMetadataPatch\.js';

class JadibotService {
    constructor() {
        this.sessions = new Map(); // stores { sock, status, pairingCode, phoneNumber }
        this.baseAuthPath = 'sessions_jadibot';
        this.io = null;
        if (!fs.existsSync(this.baseAuthPath)) {
            fs.mkdirSync(this.baseAuthPath, { recursive: true });
        }
    }

    setIo(io) {
        this.io = io;
    }

    emitUpdate(phoneNumber, update) {
        if (this.io) {
            this.io.emit('jadibot:update', { phoneNumber, ...update });
        }
    }

    async startSession(phoneNumber) {
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        const authPath = path.join(this.baseAuthPath, cleanNumber);

        // Re-init auth state for fresh connection attempt (Stable Pattern)
        const { state, saveCreds } = await useMultiFileAuthState(authPath);
        const { version } = await fetchLatestBaileysVersion();

        // Check if session exists in memory, if yes, close old one first
        if (this.sessions.has(cleanNumber)) {
            const oldSession = this.sessions.get(cleanNumber);
            if (oldSession.sock && oldSession.status !== 'open') {
                try {
                    oldSession.sock.end();
                } catch (e) {}
            }
        }

        const sock = makeWASocket({
            version,
            logger: pino({ level: 'warn' }),
            printQRInTerminal: false,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'warn' })),
            },
            browser: Browsers.macOS('safari'),
            markOnline: true,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 30000,
        });

        attachGroupMetadataPatch(sock);

        const sessionData = {
            sock,
            status: 'connecting',
            phoneNumber: cleanNumber,
            qr: null,
            pairingCode: null,
        };
        this.sessions.set(cleanNumber, sessionData);

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr, pairingCode } = update;

            if (connection) {
                sessionData.status = connection;
                this.emitUpdate(cleanNumber, { status: connection });
            }

            if (qr) {
                sessionData.qr = qr;
                this.emitUpdate(cleanNumber, { qr });
            }

            if (pairingCode) {
                sessionData.pairingCode = pairingCode;
                this.emitUpdate(cleanNumber, { pairingCode });
            }

            if (connection === 'open') {
                logger.info(`Jadibot session opened: ${cleanNumber}`, 'JADIBOT');
                sessionData.qr = null;
                sessionData.pairingCode = null;
                this.emitUpdate(cleanNumber, { qr: null, pairingCode: null });
            } else if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                logger.warn(
                    `Jadibot session closed: ${cleanNumber}. Status: ${statusCode}`,
                    'JADIBOT'
                );

                if (!shouldReconnect) {
                    logger.error(
                        `Jadibot logged out: ${cleanNumber}. Purging session...`,
                        'JADIBOT'
                    );
                    this.sessions.delete(cleanNumber);
                    this.emitUpdate(cleanNumber, { status: 'removed' });
                    setTimeout(() => {
                        if (fs.existsSync(authPath)) fsExtra.removeSync(authPath);
                    }, 2000);
                } else {
                    // Stable Recursive Reconnect
                    logger.info(`Reconnecting Jadibot: ${cleanNumber}...`, 'JADIBOT');
                    setTimeout(() => this.startSession(cleanNumber), 5000);
                }
            }
        });

        sock.ev.on('messages.upsert', async (chatUpdate) => {
            try {
                const m = chatUpdate.messages[0];
                if (!m.message) return;
                await messageHandler(sock, m);
            } catch (err) {
                logger.error(err, 'Error in jadibot message handler');
            }
        });

        return { success: true, phoneNumber: cleanNumber };
    }

    async stopSession(phoneNumber) {
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        const session = this.sessions.get(cleanNumber);
        const authPath = path.join(this.baseAuthPath, cleanNumber);

        logger.info(`Stopping jadibot session: ${cleanNumber}`, 'JADIBOT');

        if (session) {
            try {
                await session.sock.logout().catch(() => {});
            } catch (e) {}
            try {
                session.sock.end();
            } catch (e) {}
            this.sessions.delete(cleanNumber);
        }

        if (fs.existsSync(authPath)) {
            try {
                fsExtra.removeSync(authPath);
            } catch (err) {
                logger.error(
                    `Error removing auth path for ${cleanNumber}: ${err.message}`,
                    'JADIBOT'
                );
            }
        }

        this.emitUpdate(cleanNumber, { status: 'removed' });
        return { success: true };
    }

    listSessions() {
        return Array.from(this.sessions.values()).map((s) => ({
            phoneNumber: s.phoneNumber,
            status: s.status,
            qr: s.qr,
            pairingCode: s.pairingCode,
            registered: s.sock?.authState?.creds?.registered || false,
        }));
    }

    async init() {
        if (!fs.existsSync(this.baseAuthPath)) return;
        const folders = fs.readdirSync(this.baseAuthPath);
        for (const folder of folders) {
            const fullPath = path.join(this.baseAuthPath, folder);
            if (fs.statSync(fullPath).isDirectory()) {
                logger.info(`Resuming jadibot session: ${folder}`, 'JADIBOT');
                this.startSession(folder);
            }
        }
    }
}

export const jadibotService = new JadibotService();
