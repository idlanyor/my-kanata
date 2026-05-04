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

const getBotIdentity = (sock) => {
    const ownerJid = decodeJid(settings.ownerNumber);
    const ownerLid = settings.ownerLid ? decodeJid(settings.ownerLid) : null;
    const botJid = decodeJid(sock.user.id);
    const botLid = sock.user.lid ? decodeJid(sock.user.lid) : null;
    return { ownerJid, ownerLid, botJid, botLid };
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
        if (m.key.remoteJid === 'status@broadcast') {
            const botSettings = await getCachedSettings();
            const participant = m.key.participant;
            if (!participant) return;

            if (botSettings.autoStatusRead) {
                await sock.readMessages([m.key]);
                logger.debug(`Read status from: ${participant.split('@')[0]}`, 'STORY');
            }
            return;
        }

        m = serialize(m, sock);

        if (!m.body && !m.mtype) return;

        if (m.chat?.endsWith('@newsletter')) return;

        const usedPrefix = m.body ? prefixes.find((p) => m.body.startsWith(p)) : undefined;
        const cachedMetadata = m.isGroup ? getCachedGroupMetadata(m.chat) : null;
        m.metadata = cachedMetadata?.data || {};

        if (m.isGroup && !cachedMetadata?.isFresh) {
            refreshGroupMetadata(sock, m.chat).catch(() => {});
        }

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

        const botSettings = await getCachedSettings();
        const { ownerJid, ownerLid, botJid, botLid } = getBotIdentity(sock);
        
        // Define isOwner including DB owners
        const staticOwners = [ownerJid, ownerLid, botJid, botLid];
        const dbOwners = botSettings.owners || [];
        const isOwner = m.sender ? [...staticOwners, ...dbOwners].includes(m.sender) : false;

        logger.debug(`Sender: ${m.sender} | isOwner: ${isOwner}`, 'HANDLER');

        if (!m.sender) return;

        // --- SESSION HANDLER INTERCEPTION ---
        const activeSession = sessionManager.get(m.sender);
        if (activeSession && !m.body.startsWith(settings.prefix)) {
            const command = commands.get(activeSession.data.commandName);
            if (command && typeof command.handleSession === 'function') {
                logger.debug(`Delegating message to session handler: ${activeSession.data.commandName}`, 'HANDLER');
                await command.handleSession(sock, m, activeSession);
                return;
            }
        }
        // ------------------------------------

        // Check for delete server confirmation early (owner only)
        if (isOwner && global.confirmDelete?.has(m.sender)) {
            await handleDeleteServerConfirmation(m);
            return;
        }

        if (m.key.fromMe) {
            global.lastOwnerActivity = Date.now();
        }

        const shouldLoadGroupData = m.isGroup && !isOwner && !m.key.fromMe;
        const groupData = shouldLoadGroupData
            ? await getGroupSettings(m.chat, m.metadata?.subject || '')
            : null;

        if (!m.isGroup && !isOwner) {
            logger.debug(`Private Chat Check - mustJoinGroup: ${botSettings.mustJoinGroup}, Link: ${botSettings.groupInviteLink}`, 'HANDLER');
        }

        if (await handlePreProcessing(sock, m, groupData, isOwner)) return;
        await handleSpecialMessages(sock, m);

        // --- UNIVERSAL BUTTON DISPATCHER ---
        if (await handleButtons(sock, m, isOwner)) return;

        if (m.key.fromMe && botSettings.mode !== 'self') return;

        if (!m.isGroup && !isOwner && botSettings.mustJoinGroup) {
            try {
                if (global.targetGroupInviteLink !== botSettings.groupInviteLink) {
                    global.targetGroupJid = null;
                    global.targetGroupInviteLink = botSettings.groupInviteLink;
                }

                if (!global.targetGroupJid) {
                    const code = botSettings.groupInviteLink.split('chat.whatsapp.com/')[1];
                    const groupInfo = await sock.groupGetInviteInfo(code);
                    global.targetGroupJid = groupInfo.id;
                }

                const senderCandidates = buildJidCandidates(m.sender, m.key?.participant, m.key?.remoteJid);
                let participants = await getRequiredGroupParticipants(sock, global.targetGroupJid);
                let isMember = senderCandidates.some((candidate) => participants.has(candidate));

                if (!isMember) {
                    // Refresh cache and try again, in case the user just joined
                    participants = await getRequiredGroupParticipants(sock, global.targetGroupJid, true);
                    isMember = senderCandidates.some((candidate) => participants.has(candidate));
                }

                if (!isMember) {
                    logger.debug(`Access denied for ${m.sender}, not a member of required group`, 'HANDLER');
                    return m.reply(`*AKSES DITOLAK*\n\nMaaf @${m.sender.split('@')[0]}, untuk menggunakan bot ini di Private Chat, kamu wajib bergabung ke grup official kami terlebih dahulu.\n\n*Link Grup:* ${botSettings.groupInviteLink}\n\nSetelah bergabung, silakan coba lagi!`, { mentions: [m.sender] });
                }
            } catch (e) {
                console.error('Error in Join Group Check:', e);
            }
        }

        logger.debug(`usedPrefix: ${usedPrefix} | body: ${m.body} | total commands: ${commands.size}`, 'HANDLER');

        if (usedPrefix) {
            if (m.isGroup && !m.metadata?.subject) {
                try {
                    m.metadata = await refreshGroupMetadata(sock, m.chat);
                } catch {}
            }

            const cmdName = m.body.slice(usedPrefix.length).trim().split(/\s+/)[0].toLowerCase();
            const command = commands.get(cmdName) || [...commands.values()].find((c) => c.aliases?.includes(cmdName));
            logger.debug(`cmdName: ${cmdName} | found: ${!!command}`, 'HANDLER');

            if (command) {
                logger.command({
                    phase: 'RUN',
                    name: cmdName,
                    sender: m.sender,
                    chat: m.isGroup ? (m.metadata?.subject || m.chat) : m.chat,
                    extra: `mode=${botSettings.mode}`,
                });
                logger.debug(`Executing command: ${cmdName} | Mode: ${botSettings.mode} | isOwner: ${isOwner}`, 'HANDLER');
                if (botSettings.mode === 'self' && !isOwner) {
                    logger.debug(`Ignored: Self mode and not owner`, 'HANDLER');
                    return;
                }
                if (botSettings.mode === 'group' && !m.isGroup && !isOwner) {
                    logger.debug(`Ignored: Group mode and not in group`, 'HANDLER');
                    return;
                }

                if (command.category === 'Owner' && !isOwner) {
                    logger.debug(`Command ${cmdName} rejected: Owner only`, 'HANDLER');
                    return m.reply(' Akses Ditolak. Perintah ini hanya untuk Owner.');
                }

                await sock.sendPresenceUpdate('composing', m.chat).catch(() => {});

                try {
                    logger.debug(`Executing ${cmdName} for ${m.sender} (MsgID: ${m.id})`, 'HANDLER');
                    await command.execute(sock, m, m.args, m.text);
                    logger.command({
                        phase: 'DONE',
                        name: cmdName,
                        sender: m.sender,
                        chat: m.isGroup ? (m.metadata?.subject || m.chat) : m.chat,
                    });
                    logger.debug(`Command ${cmdName} execution finished`, 'HANDLER');
                } catch (err) {
                    logger.command({
                        phase: 'FAIL',
                        name: cmdName,
                        sender: m.sender,
                        chat: m.isGroup ? (m.metadata?.subject || m.chat) : m.chat,
                        extra: err.message,
                    });
                    logger.error(err, `Error in command: ${cmdName}`);
                    const errorMsg = ` *COMMAND ERROR REPORT*\n\n` +
                        `➛ *Command:* ${cmdName}\n` +
                        `➛ *Sender:* @${m.sender.split('@')[0]}\n` +
                        `➛ *Error:* ${err.message}\n\n` +
                        `\`\`\`${err.stack}\`\`\``;
                    await sock.sendMessage(ownerJid, { text: errorMsg, mentions: [m.sender] });
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
