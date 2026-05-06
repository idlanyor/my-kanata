import { serialize, decodeJid } from '../lib/serialize.js';
import { commands } from '../lib/commands.js';
import logger from '../lib/logger.js';
import { settings } from '../config/settings.js';
import chalk from 'chalk';
import { saveMessage } from '../lib/msgStore.js';
import {
    clearSettingsCache,
    getCachedSettings,
    getGroupSettings,
    getRequiredGroupParticipants,
    handlePreProcessing,
    handleSpecialMessages,
    handleAutoAiPrivate
} from './messageFlow.js';
import { handleButtons } from './buttonHandler.js';
import { sessionManager } from '../lib/session.js';

export { clearSettingsCache } from './messageFlow.js';

const processingMessages = new Set();
const metadataCache = new Map();
const metadataPromiseCache = new Map();
const METADATA_TTL = 5 * 60 * 1000; // 5 minutes
const prefixes = [settings.prefix, '.', '!', '/'];

const buildJidCandidates = (...values) => {
    const candidates = new Set();

    for (const value of values) {
        if (!value || typeof value !== 'string') continue;
        candidates.add(value);

        const decoded = decodeJid(value);
        if (decoded) candidates.add(decoded);

        const userPart = value.split('@')[0];
        if (userPart) candidates.add(userPart);

        if (decoded && decoded.includes('@')) {
            const decodedUserPart = decoded.split('@')[0];
            if (decodedUserPart) candidates.add(decodedUserPart);
        }
    }

    return [...candidates];
};

let botIdentityCache = null;
const getBotIdentity = (sock) => {
    if (botIdentityCache) return botIdentityCache;
    
    const ownerJid = decodeJid(settings.ownerNumber);
    const ownerLid = settings.ownerLid ? decodeJid(settings.ownerLid) : null;
    const botJid = decodeJid(sock.user.id);
    const botLid = sock.user.lid ? decodeJid(sock.user.lid) : null;
    
    botIdentityCache = { ownerJid, ownerLid, botJid, botLid };
    return botIdentityCache;
};

const getCachedGroupMetadata = (jid) => {
    const cached = metadataCache.get(jid);
    if (!cached) return null;

    const isFresh = Date.now() - cached.time < METADATA_TTL;
    return {
        data: cached.data,
        isFresh,
    };
};

const refreshGroupMetadata = async (sock, jid) => {
    const existingPromise = metadataPromiseCache.get(jid);
    if (existingPromise) {
        return existingPromise;
    }

    const promise = (async () => {
        try {
            const data = await sock.groupMetadata(jid);
            metadataCache.set(jid, { data, time: Date.now() });
            return data;
        } finally {
            metadataPromiseCache.delete(jid);
        }
    })();

    metadataPromiseCache.set(jid, promise);
    return promise;
};

const handleDeleteServerConfirmation = async (m) => {
    const confirm = global.confirmDelete.get(m.sender);
    const body = m.body?.toLowerCase();

    if (body === 'y' || body === 'ya') {
        const { pteroId, force, timeout } = confirm;
        clearTimeout(timeout);
        global.confirmDelete.delete(m.sender);

        await m.reply(`⏳ Memproses penghapusan server ${pteroId}...`);

        try {
            const PTERO_URL = process.env.PTERO_URL;
            const PTERO_API_KEY = process.env.PTERO_API_KEY;
            const axios = (await import('axios')).default;

            const ptero = axios.create({
                baseURL: `${PTERO_URL}/api/application`,
                headers: {
                    'Authorization': `Bearer ${PTERO_API_KEY}`,
                    'Content-Type': 'application/json',
                    'Accept': 'Application/vnd.pterodactyl.v1+json',
                }
            });

            try {
                await ptero.delete(force ? `/servers/${pteroId}/force` : `/servers/${pteroId}`);
            } catch (e) {
                if (e.response?.status !== 404) throw e;
            }

            const Server = (await import('../database/models/Server.js')).default;
            const deletedDb = await Server.deleteOne({ pteroId });

            await m.reply(`✅ *SERVER BERHASIL DIHAPUS*\n\nID: ${pteroId}\nDB: ${deletedDb.deletedCount > 0 ? 'Terhapus' : 'Tidak di DB'}`);
        } catch (err) {
            await m.reply(`❌ Gagal menghapus server: ${err.message}`);
        }
        return;
    }

    if (body) {
        const { timeout } = confirm;
        clearTimeout(timeout);
        global.confirmDelete.delete(m.sender);
        await m.reply('❌ Penghapusan dibatalkan.');
    }
};

export const messageHandler = async (sock, m) => {
    if (!m || !m.key || !m.key.id) return;
    if (processingMessages.has(m.key.id)) return;
    processingMessages.add(m.key.id);

    try {
        // Parallelized Initial Data Fetching
        const [botSettings, mSerialized] = await Promise.all([
            getCachedSettings(),
            (async () => {
                if (m.key.remoteJid === 'status@broadcast') return null;
                return serialize(m, sock);
            })()
        ]);

        if (m.key.remoteJid === 'status@broadcast') {
            if (botSettings?.autoStatusRead) {
                const participant = m.key.participant;
                if (participant) {
                    await sock.readMessages([m.key]);
                    logger.debug(`Read status from: ${participant.split('@')[0]}`, 'STORY');
                }
            }
            return;
        }

        m = mSerialized;
        if (!m || (!m.body && !m.mtype)) return;
        if (m.chat?.endsWith('@newsletter')) return;

        // 1. Setup metadata and prefixes in parallel
        const usedPrefix = m.body ? prefixes.find((p) => m.body.startsWith(p)) : undefined;
        const cachedMetadata = m.isGroup ? getCachedGroupMetadata(m.chat) : null;
        m.metadata = cachedMetadata?.data || {};

        if (m.isGroup && !cachedMetadata?.isFresh) {
            refreshGroupMetadata(sock, m.chat).catch(() => {});
        }

        // 2. Parallelize logging, message saving and further data requirements
        const { ownerJid, ownerLid, botJid, botLid } = getBotIdentity(sock);
        const staticOwners = [ownerJid, ownerLid, botJid, botLid];
        const dbOwners = botSettings.owners || [];
        const isOwner = m.sender ? [...staticOwners, ...dbOwners].includes(m.sender) : false;

        const groupDataPromise = (m.isGroup && !isOwner && !m.key.fromMe)
            ? getGroupSettings(m.chat, m.metadata?.subject || '')
            : Promise.resolve(null);

        if (m.body) {
            saveMessage(m);
            const senderName = m.pushName || (m.sender ? m.sender.split('@')[0] : 'Unknown');
            logger.chat({
                chatType: m.isGroup ? 'GROUP' : 'PRIVATE',
                chatName: m.isGroup ? (m.metadata?.subject || 'Group') : 'Private Chat',
                sender: senderName,
                body: m.body,
            });
        }

        const groupData = await groupDataPromise;

        if (!m.sender) return;

        // --- SESSION HANDLER INTERCEPTION ---
        const activeSession = sessionManager.get(m.sender);
        if (activeSession && !m.body.startsWith(settings.prefix)) {
            const command = commands.get(activeSession.data.commandName);
            if (command && typeof command.handleSession === 'function') {
                await command.handleSession(sock, m, activeSession);
                return;
            }
        }

        // Check for delete server confirmation early (owner only)
        if (isOwner && global.confirmDelete?.has(m.sender)) {
            await handleDeleteServerConfirmation(m);
            return;
        }

        if (m.key.fromMe) {
            global.lastOwnerActivity = Date.now();
        }

        if (await handlePreProcessing(sock, m, groupData, isOwner)) return;
        await handleSpecialMessages(sock, m);

        // --- UNIVERSAL BUTTON DISPATCHER ---
        if (await handleButtons(sock, m, isOwner)) return;

        if (m.key.fromMe && botSettings.mode !== 'self') return;

        // Optimized Join Group Check
        if (!m.isGroup && !isOwner && botSettings.mustJoinGroup) {
            try {
                if (!global.targetGroupJid || global.targetGroupInviteLink !== botSettings.groupInviteLink) {
                    const code = botSettings.groupInviteLink.split('chat.whatsapp.com/')[1];
                    const groupInfo = await sock.groupGetInviteInfo(code);
                    global.targetGroupJid = groupInfo.id;
                    global.targetGroupInviteLink = botSettings.groupInviteLink;
                }

                const senderCandidates = buildJidCandidates(m.sender, m.key?.participant, m.key?.remoteJid);
                let participants = await getRequiredGroupParticipants(sock, global.targetGroupJid);
                let isMember = senderCandidates.some((candidate) => participants.has(candidate));

                if (!isMember) {
                    participants = await getRequiredGroupParticipants(sock, global.targetGroupJid, true);
                    isMember = senderCandidates.some((candidate) => participants.has(candidate));
                }

                if (!isMember) return m.reply(`*AKSES DITOLAK*\n\nMaaf @${m.sender.split('@')[0]}, untuk menggunakan bot ini di Private Chat, kamu wajib bergabung ke grup official kami terlebih dahulu.\n\n*Link Grup:* ${botSettings.groupInviteLink}\n\nSetelah bergabung, silakan coba lagi!`, { mentions: [m.sender] });
            } catch (e) {
                console.error('Join Group Check failed:', e.message);
            }
        }

        if (usedPrefix) {
            const cmdName = m.body.slice(usedPrefix.length).trim().split(/\s+/)[0].toLowerCase();
            const command = commands.get(cmdName) || [...commands.values()].find((c) => c.aliases?.includes(cmdName));

            if (command) {
                if (botSettings.mode === 'self' && !isOwner) return;
                if (botSettings.mode === 'group' && !m.isGroup && !isOwner) return;
                if (command.category === 'Owner' && !isOwner) return m.reply(' Akses Ditolak. Perintah ini hanya untuk Owner.');

                // Fire and forget presence
                sock.sendPresenceUpdate('composing', m.chat).catch(() => {});

                try {
                    logger.command({ phase: 'RUN', name: cmdName, sender: m.sender, chat: m.isGroup ? (m.metadata?.subject || m.chat) : m.chat, extra: `mode=${botSettings.mode}` });
                    await command.execute(sock, m, m.args, m.text);
                    logger.command({ phase: 'DONE', name: cmdName, sender: m.sender, chat: m.isGroup ? (m.metadata?.subject || m.chat) : m.chat });
                } catch (err) {
                    logger.command({ phase: 'FAIL', name: cmdName, sender: m.sender, chat: m.isGroup ? (m.metadata?.subject || m.chat) : m.chat, extra: err.message });
                    logger.error(err, `Error in command: ${cmdName}`);
                    
                    const errorMsg = ` *COMMAND ERROR REPORT*\n\n➛ *Command:* ${cmdName}\n➛ *Sender:* @${m.sender.split('@')[0]}\n➛ *Error:* ${err.message}\n\n\`\`\`${err.stack}\`\`\``;
                    await sock.sendMessage(ownerJid, { text: errorMsg, mentions: [m.sender] }).catch(() => {});
                    m.reply(` Terjadi kesalahan. Detail error telah dikirim ke Owner.`);
                }
            }
        }

        await handleAutoAiPrivate(sock, m, botSettings);
    } catch (err) {
        logger.error(err, 'Error in messageHandler');
    } finally {
        processingMessages.delete(m.key.id);
    }
};
