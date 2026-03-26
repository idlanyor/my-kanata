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

export { clearSettingsCache } from './messageFlow.js';

const getBotIdentity = (sock) => {
    const ownerJid = decodeJid(settings.ownerNumber);
    const ownerLid = settings.ownerLid ? decodeJid(settings.ownerLid) : null;
    const botJid = decodeJid(sock.user.id);
    const botLid = sock.user.lid ? decodeJid(sock.user.lid) : null;
    return { ownerJid, ownerLid, botJid, botLid };
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
    try {
        if (!m) return;

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
        if (m.body) {
            saveMessage(m);
            const senderName = m.pushName || m.sender.split('@')[0];
            const chatInfo = m.isGroup ? `[${m.metadata?.subject || 'Group'}]` : '[Private]';
            logger.info(`${chalk.bold(senderName)}: ${chalk.white(m.body.slice(0, 50))}${m.body.length > 50 ? '...' : ''}`, chatInfo);
        }

        const botSettings = await getCachedSettings();
        const groupData = m.isGroup ? await getGroupSettings(m.chat, m.metadata?.subject || '') : null;
        const { ownerJid, ownerLid, botJid, botLid } = getBotIdentity(sock);
        const isOwner = [ownerJid, ownerLid, botJid, botLid].includes(m.sender);
        logger.debug(`Sender: ${m.sender} | isOwner: ${isOwner}`, 'HANDLER');

        if (isOwner && global.confirmDelete?.has(m.sender)) {
            await handleDeleteServerConfirmation(m);
            return;
        }

        if (m.key.fromMe) {
            global.lastOwnerActivity = Date.now();
        }

        if (await handlePreProcessing(sock, m, groupData, isOwner)) return;
        await handleSpecialMessages(sock, m);

        if (m.key.fromMe && botSettings.mode !== 'self') return;

        if (!m.isGroup && !isOwner && botSettings.mustJoinGroup) {
            try {
                if (!global.targetGroupJid) {
                    const code = botSettings.groupInviteLink.split('chat.whatsapp.com/')[1];
                    const groupInfo = await sock.groupGetInviteInfo(code);
                    global.targetGroupJid = groupInfo.id;
                }

                const participants = await getRequiredGroupParticipants(sock, global.targetGroupJid);
                const isMember = participants.has(decodeJid(m.sender));

                if (!isMember) {
                    return m.reply(`*AKSES DITOLAK*\n\nMaaf @${m.sender.split('@')[0]}, untuk menggunakan bot ini di Private Chat, kamu wajib bergabung ke grup official kami terlebih dahulu.\n\n*Link Grup:* ${botSettings.groupInviteLink}\n\nSetelah bergabung, silakan coba lagi!`, { mentions: [m.sender] });
                }
            } catch (e) {
                console.error('Error in Join Group Check:', e);
            }
        }

        const prefixes = [settings.prefix, '.', '!', '/'];
        const usedPrefix = prefixes.find((p) => m.body.startsWith(p));
        logger.debug(`usedPrefix: ${usedPrefix} | body: ${m.body} | total commands: ${commands.size}`, 'HANDLER');

        if (usedPrefix) {
            const cmdName = m.body.slice(usedPrefix.length).trim().split(/\s+/)[0].toLowerCase();
            const command = commands.get(cmdName) || [...commands.values()].find((c) => c.aliases?.includes(cmdName));
            logger.debug(`cmdName: ${cmdName} | found: ${!!command}`, 'HANDLER');

            if (command) {
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

        await handleAutoAiPrivate(sock, m, botSettings);
    } catch (err) {
        logger.error(err, 'Error in messageHandler');
    }
};
