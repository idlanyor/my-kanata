import fs from 'fs';
import { decryptPollVote, jidNormalizedUser } from '@whiskeysockets/baileys';
import { createHash } from 'crypto';
import { settings } from '../config/settings.js';
import Settings from '../database/models/Settings.js';
import Group from '../database/models/Group.js';
import Poll from '../database/models/Poll.js';
import { getMessage } from '../lib/msgStore.js';
import { generateAIResponse, uploadFileToGemini } from '../lib/ai.js';

let settingsCache = null;
let lastCacheTime = 0;
const groupCache = new Map();
const requiredGroupParticipantsCache = new Map();
const SETTINGS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes (was 1 minute)
const GROUP_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes (was 1 minute)
const REQUIRED_GROUP_PARTICIPANTS_TTL_MS = 5 * 60 * 1000; // 5 minutes (was 2 minutes)

export const getCachedSettings = async () => {
    const now = Date.now();
    if (!settingsCache || now - lastCacheTime > SETTINGS_CACHE_TTL_MS) {
        settingsCache = await Settings.findOne({ id: 'bot_settings' }) || await Settings.create({ id: 'bot_settings' });
        lastCacheTime = now;
    }
    return settingsCache;
};

export const getGroupSettings = async (jid, subject = '') => {
    const now = Date.now();
    const cached = groupCache.get(jid);
    if (cached && (now - cached.timestamp < GROUP_CACHE_TTL_MS)) return cached.data;

    let data = await Group.findOne({ jid });
    if (!data) {
        data = await Group.create({ jid, name: subject || '' });
    } else if (subject && !data.name) {
        data = await Group.findOneAndUpdate(
            { jid },
            { name: subject },
            { new: true }
        );
    }

    groupCache.set(jid, { data, timestamp: now });
    return data;
};

export const clearSettingsCache = () => {
    settingsCache = null;
    groupCache.clear();
    requiredGroupParticipantsCache.clear();
};

/**
 * Periodic cleanup for stale cache entries
 */
export const cleanupCaches = () => {
    const now = Date.now();
    let cleaned = 0;
    
    // Cleanup group cache
    for (const [jid, cached] of groupCache.entries()) {
        if (now - cached.timestamp > GROUP_CACHE_TTL_MS * 2) {
            groupCache.delete(jid);
            cleaned++;
        }
    }
    
    // Cleanup required group participants cache
    for (const [jid, cached] of requiredGroupParticipantsCache.entries()) {
        if (now - cached.timestamp > REQUIRED_GROUP_PARTICIPANTS_TTL_MS * 2) {
            requiredGroupParticipantsCache.delete(jid);
            cleaned++;
        }
    }
    
    return cleaned;
};

export const getRequiredGroupParticipants = async (sock, groupJid) => {
    const now = Date.now();
    const cached = requiredGroupParticipantsCache.get(groupJid);
    if (cached && now - cached.timestamp < REQUIRED_GROUP_PARTICIPANTS_TTL_MS) {
        return cached.participants;
    }

    const groupMetadata = await sock.groupMetadata(groupJid);
    const participants = new Set(groupMetadata.participants.map((p) => jidNormalizedUser(p.id)));
    requiredGroupParticipantsCache.set(groupJid, { participants, timestamp: now });
    return participants;
};

export const handlePreProcessing = async (sock, m, groupData, isOwner) => {
    if (!m.isGroup || isOwner || m.key.fromMe) return false;

    if (groupData?.antilink) {
        const linkRegex = /chat.whatsapp.com\/(?:invite\/)?([0-9A-Za-z]{20,26})/i;
        if (linkRegex.test(m.body)) {
            await sock.sendMessage(m.chat, { delete: m.key });
            await m.reply(`*── 「 ANTI LINK 」 ──*\n\nMaaf @${m.sender.split('@')[0]}, link grup dilarang!`, { mentions: [m.sender] });
            return true;
        }
    }

    if (groupData?.antitoxic) {
        const toxicWords = ['anjing', 'babi', 'monyet', 'memek', 'kontol', 'ajg', 'kntl', 'peler'];
        if (toxicWords.some(word => m.body.toLowerCase().includes(word))) {
            await sock.sendMessage(m.chat, { delete: m.key });
            await m.reply(`*── 「 ANTI TOXIC 」 ──*\n\nJaga ucapanmu @${m.sender.split('@')[0]}!`, { mentions: [m.sender] });
            return true;
        }
    }

    if (m.mtype === 'editedMessage') {
        const original = getMessage(m.key.id);
        const newText = m.message.editedMessage.message.conversation || m.message.editedMessage.message.extendedTextMessage?.text;
        if (original && original.body !== newText) {
            await m.reply(`*── 「 PESAN DIEDIT 」 ──*\n\n*Dari:* @${m.sender.split('@')[0]}\n*Sebelum:* ${original.body}\n*Sesudah:* ${newText}`, { mentions: [m.sender] });
        }
        return true;
    }

    return false;
};

export const handleSpecialMessages = async (sock, m) => {
    if (m.mtype === 'pollUpdateMessage') await handlePollUpdate(sock, m);
};

const handlePollUpdate = async (sock, m) => {
    try {
        const pollUpdate = m.message.pollUpdateMessage;
        const pollId = pollUpdate.pollCreationMessageKey.id;
        const pollData = await Poll.findOne({ pollId });
        if (!pollData) return;

        const meJid = jidNormalizedUser(sock.user.id);
        const meLid = sock.user.lid ? jidNormalizedUser(sock.user.lid) : meJid;
        const voterJid = jidNormalizedUser(m.sender);

        let pollCreatorJid = pollUpdate.pollCreationMessageKey.fromMe ? meLid : jidNormalizedUser(pollUpdate.pollCreationMessageKey.participant || pollUpdate.pollCreationMessageKey.remoteJid);

        let vote;
        try {
            vote = decryptPollVote(pollUpdate.vote, { pollCreatorJid, pollMsgId: pollId, pollEncKey: pollData.messageSecret, voterJid });
        } catch (e) {
            if (pollUpdate.pollCreationMessageKey.fromMe && pollCreatorJid === meLid && meLid !== meJid) {
                vote = decryptPollVote(pollUpdate.vote, { pollCreatorJid: meJid, pollMsgId: pollId, pollEncKey: pollData.messageSecret, voterJid });
            }
        }

        if (vote?.selectedOptions?.length > 0) {
            const selectedHash = Buffer.from(vote.selectedOptions[0]).toString('hex').toLowerCase();
            let selectedOptionName = pollData.options.find(opt => createHash('sha256').update(opt).digest('hex').toLowerCase() === selectedHash);

            if (selectedOptionName) {
                if (pollData.question.startsWith('CONFIRM_DELETE_SRV:')) {
                    const ownerJid = jidNormalizedUser(settings.ownerNumber);
                    const ownerLid = settings.ownerLid ? jidNormalizedUser(settings.ownerLid) : null;
                    if (![ownerJid, ownerLid].includes(voterJid)) {
                        return sock.sendMessage(m.chat, { text: '❌ Hanya Owner yang bisa memberikan konfirmasi ini.' });
                    }

                    if (selectedOptionName === 'YA, HAPUS SEKARANG') {
                        const parts = pollData.question.split(':');
                        const pteroId = parts[1];
                        const force = parts.includes('FORCE');

                        await sock.sendMessage(m.chat, { text: `⏳ Memproses penghapusan server ${pteroId}...` });

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

                            await sock.sendMessage(m.chat, {
                                text: `✅ *SERVER BERHASIL DIHAPUS*\n\nID: ${pteroId}\nDB: ${deletedDb.deletedCount > 0 ? 'Terhapus' : 'Tidak di DB'}`
                            });
                        } catch (err) {
                            await sock.sendMessage(m.chat, { text: `❌ Gagal menghapus server: ${err.message}` });
                        }
                    } else {
                        await sock.sendMessage(m.chat, { text: '❌ Penghapusan server dibatalkan.' });
                    }

                    await Poll.deleteOne({ pollId });
                    return;
                }

                await sock.sendMessage(m.chat, { text: `✅ *@${voterJid.split('@')[0]}* memilih *"${selectedOptionName}"*`, mentions: [voterJid] });
            }
        }
    } catch {}
};

export const handleAutoAiPrivate = async (sock, m, botSettings) => {
    if (!botSettings?.autoAiPrivate || m.isGroup || m.key.fromMe) return;

    const isMedia = m.isImage;
    if (!(m.body || isMedia)) return;

    const textLength = m.body?.length || 50;
    const configuredDelay = Number(process.env.AUTO_AI_TYPING_DELAY_MS);
    // Reduced default delay: 10ms per char, min 100ms, max 1000ms (was 20ms, 300-2000ms)
    const typingDelay = Number.isFinite(configuredDelay) && configuredDelay >= 0
        ? configuredDelay
        : Math.min(Math.max(textLength * 10, 100), 1000);

    if (typingDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, typingDelay));
    }

    await sock.sendPresenceUpdate('composing', m.chat);

    let tempPath = null;
    try {
        let fileUri = null;
        let fileMime = null;

        if (isMedia) {
            const buffer = await m.download();
            const fileName = `tmp_ai_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
            tempPath = `./${fileName}`;
            await fs.promises.writeFile(tempPath, buffer);

            const uploadResult = await uploadFileToGemini(tempPath, m.msg.mimetype || 'image/jpeg');
            fileUri = uploadResult.uri;
            fileMime = uploadResult.mimeType;
        }

        const prompt = m.body || 'Analyze this image.';
        const response = await generateAIResponse(prompt, fileUri, fileMime, botSettings.privateAiPersona, m.chat);
        await m.reply(response);
        await sock.sendPresenceUpdate('paused', m.chat);
    } catch (e) {
        console.error('Auto-AI Private Error:', e);
    } finally {
        if (tempPath && fs.existsSync(tempPath)) {
            await fs.promises.unlink(tempPath).catch(() => {});
        }
    }
};
