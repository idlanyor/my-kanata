import { serialize, decodeJid } from '../lib/serialize.js';
import { commands } from '../lib/commands.js';
import { generateAIResponse, uploadFileToGemini } from '../lib/ai.js';
import logger from '../lib/logger.js';
import fs from 'fs';
import { settings } from '../config/settings.js';
import Settings from '../database/models/Settings.js';
import Group from '../database/models/Group.js';
import Poll from '../database/models/Poll.js';
import Event from '../database/models/Event.js';
import { decryptPollVote, jidNormalizedUser } from '@whiskeysockets/baileys';
import { createHash } from 'crypto';
import { saveMessage, getMessage } from '../lib/msgStore.js';

// --- CACHING SYSTEM ---
let settingsCache = null;
let lastCacheTime = 0;
const groupCache = new Map();

const getCachedSettings = async () => {
    const now = Date.now();
    if (!settingsCache || now - lastCacheTime > 60000) {
        settingsCache = await Settings.findOne({ id: 'bot_settings' }) || await Settings.create({ id: 'bot_settings' });
        lastCacheTime = now;
    }
    return settingsCache;
};

const getGroupSettings = async (jid) => {
    const now = Date.now();
    const cached = groupCache.get(jid);
    if (cached && (now - cached.timestamp < 60000)) return cached.data;
    
    let data = await Group.findOne({ jid }) || await Group.create({ jid });
    groupCache.set(jid, { data, timestamp: now });
    return data;
};

export const clearSettingsCache = () => {
    settingsCache = null;
    groupCache.clear();
};

/**
 * MAIN MESSAGE HANDLER
 */
export const messageHandler = async (sock, m) => {
    try {
        if (!m) return;

        // 0. Handle WhatsApp Status (Stories)
        if (m.key.remoteJid === 'status@broadcast') {
            const botSettings = await getCachedSettings();
            const participant = m.key.participant;
            if (!participant) return;

            // Auto Read Status Only
            if (botSettings.autoStatusRead) {
                await sock.readMessages([m.key]);
                console.log(`[STORY] Read status from: ${participant.split('@')[0]}`);
            }
            return;
        }

        // 1. Serialization
        m = serialize(m, sock);
        if (!m.body && !m.mtype) return;

        // 2. Logging & Basic Filter
        if (m.chat?.endsWith('@newsletter')) return;
        if (m.body) saveMessage(m);

        // 3. Load Settings
        const botSettings = await getCachedSettings();
        const groupData = m.isGroup ? await getGroupSettings(m.chat) : null;

        // 4. Admin & Owner Status
        const ownerJid = decodeJid(settings.ownerNumber);
        const ownerLid = settings.ownerLid ? decodeJid(settings.ownerLid) : null;
        const botJid = decodeJid(sock.user.id);
        const botLid = sock.user.lid ? decodeJid(sock.user.lid) : null;
        const isOwner = [ownerJid, ownerLid, botJid, botLid].includes(m.sender);

        // --- SMART MODE: TRACK OWNER ACTIVITY ---
        if (isOwner && !m.key.fromMe) { 
            // Note: fromMe check is tricky if bot is used as self-bot on owner's number.
            // If message is SENT BY ME (fromMe=true), update activity.
        }
        if (m.key.fromMe) {
            global.lastOwnerActivity = Date.now();
        }

        // 5. Pre-Processing Logic (Anti-Link, Anti-Toxic, Anti-Edit)
        if (await handlePreProcessing(sock, m, groupData, isOwner)) return;

        // 6. Handle Special Messages (Poll, Event, etc.)
        await handleSpecialMessages(sock, m);

        // 7. Command Parsing
        if (m.key.fromMe && botSettings.mode !== 'self') return;

        // --- JOIN GROUP REQUIREMENT (Experimental) ---
        if (!m.isGroup && !isOwner && botSettings.mustJoinGroup) {
            try {
                // Get Group JID from Invite Link if not cached
                if (!global.targetGroupJid) {
                    const code = botSettings.groupInviteLink.split('chat.whatsapp.com/')[1];
                    const groupInfo = await sock.groupGetInviteInfo(code);
                    global.targetGroupJid = groupInfo.id;
                }

                // Check if user is member
                const groupMetadata = await sock.groupMetadata(global.targetGroupJid);
                const isMember = groupMetadata.participants.some(p => p.id === m.sender);

                if (!isMember) {
                    return m.reply(`*AKSES DITOLAK*\n\nMaaf @${m.sender.split('@')[0]}, untuk menggunakan bot ini di Private Chat, kamu wajib bergabung ke grup official kami terlebih dahulu.\n\n*Link Grup:* ${botSettings.groupInviteLink}\n\nSetelah bergabung, silakan coba lagi!`, { mentions: [m.sender] });
                }
            } catch (e) {
                console.error('Error in Join Group Check:', e);
            }
        }
        
        const prefixes = [settings.prefix, '.', '!', '/'];
        const usedPrefix = prefixes.find(p => m.body.startsWith(p));
        
        if (usedPrefix) {
            const cmdName = m.body.slice(usedPrefix.length).trim().split(/\s+/)[0].toLowerCase();
            const command = commands.get(cmdName) || [...commands.values()].find(c => c.aliases?.includes(cmdName));

            if (command) {
                if (botSettings.mode === 'self' && !isOwner) return;
                if (botSettings.mode === 'group' && !m.isGroup && !isOwner) return;

                if (command.category === 'Owner' && !isOwner) {
                    return m.reply(' Akses Ditolak. Perintah ini hanya untuk Owner.');
                }

                await sock.sendPresenceUpdate('composing', m.chat);

                try {
                    await command.execute(sock, m, m.args, m.text);
                } catch (err) {
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

        // Auto-AI Logic (Private Chat Only)
        if (!usedPrefix && !m.isGroup && botSettings?.autoAiPrivate && !m.key.fromMe) {
            
            // --- SMART MODE CHECK ---
            if (botSettings.smartMode) {
                const lastActivity = global.lastOwnerActivity || 0;
                // Jika owner aktif dalam 2 menit terakhir (120000ms), bot DIAM.
                if (Date.now() - lastActivity < 120000) return;
            }

            const isMedia = m.isImage;
            if (m.body || isMedia) {
                // --- NATURAL TYPING SIMULATION ---
                await sock.sendPresenceUpdate('composing', m.chat);
                
                // Calculate delay based on message length (min 2s, max 10s)
                // Anggap butuh 50ms per karakter + random variance
                const textLength = m.body?.length || 50;
                const typingDelay = Math.min(Math.max(textLength * 50, 2000), 10000);
                
                // Wait for the delay
                await new Promise(resolve => setTimeout(resolve, typingDelay));

                try {
                    let fileUri = null;
                    let fileMime = null;
                    let tempPath = null;

                    if (isMedia) {
                        const buffer = await m.download();
                        const fileName = `${Date.now()}.jpg`;
                        tempPath = `./${fileName}`;
                        fs.writeFileSync(tempPath, buffer);

                        const uploadResult = await uploadFileToGemini(tempPath, m.msg.mimetype || 'image/jpeg');
                        fileUri = uploadResult.uri;
                        fileMime = uploadResult.mimeType;
                    }

                    const prompt = m.body || 'Analyze this image.';
                    const response = await generateAIResponse(prompt, fileUri, fileMime, botSettings.privateAiPersona);
                    await m.reply(response);
                    await sock.sendPresenceUpdate('paused', m.chat);

                    if (tempPath && fs.existsSync(tempPath)) {
                        fs.unlinkSync(tempPath);
                    }
                } catch (e) {
                    console.error('Auto-AI Private Error:', e);
                }
            }
        }
    } catch (err) {
        logger.error(err, 'Error in messageHandler');
    }
};

async function handlePreProcessing(sock, m, groupData, isOwner) {
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
}

async function handleSpecialMessages(sock, m) {
    if (m.mtype === 'pollUpdateMessage') await handlePollUpdate(sock, m);
    if (m.mtype === 'encEventResponseMessage') await handleEventResponse(sock, m);
}

async function handlePollUpdate(sock, m) {
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
                await sock.sendMessage(m.chat, { text: `✅ *@${voterJid.split('@')[0]}* memilih *"${selectedOptionName}"*`, mentions: [voterJid] });
            }
        }
    } catch (e) {}
}

async function handleEventResponse(sock, m) {
    try {
        const encEvent = m.message.encEventResponseMessage;
        const eventId = encEvent.eventCreationMessageKey.id;
        const eventData = await Event.findOne({ eventId });
        if (!eventData) return;
        const voterJid = jidNormalizedUser(m.sender);
        await sock.sendMessage(m.chat, { 
            text: `📅 *@${voterJid.split('@')[0]}* memberikan respon pada acara: *${eventData.name}*`,
            mentions: [voterJid]
        });
    } catch (e) {}
}