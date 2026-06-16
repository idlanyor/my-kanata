import { decodeJid } from '../utils/serialize.js';
import { settings } from '../config/settings.js';
import { getRequiredGroupParticipants } from '../handlers/messageFlow.js';
import logger from '../utils/logger.js';

let botIdentityCache = null;

export const getBotIdentity = (sock) => {
    if (botIdentityCache) return botIdentityCache;

    const ownerJid = decodeJid(settings.ownerNumber);
    const ownerLid = settings.ownerLid ? decodeJid(settings.ownerLid) : null;
    const botJid = decodeJid(sock.user.id);
    const botLid = sock.user.lid ? decodeJid(sock.user.lid) : null;

    botIdentityCache = { ownerJid, ownerLid, botJid, botLid };
    return botIdentityCache;
};

export const checkOwner = (m, sock, botSettings) => {
    const { ownerJid, ownerLid, botJid, botLid } = getBotIdentity(sock);
    const staticOwners = [ownerJid, ownerLid, botJid, botLid];
    const dbOwners = botSettings?.owners || [];
    return m.sender ? [...staticOwners, ...dbOwners].includes(m.sender) : false;
};

export const checkJoinGroup = async (sock, m, isOwner, botSettings, buildJidCandidates) => {
    if (!m.isGroup && !isOwner && botSettings?.mustJoinGroup) {
        try {
            if (
                !global.targetGroupJid ||
                global.targetGroupInviteLink !== botSettings.groupInviteLink
            ) {
                const code = botSettings.groupInviteLink.split('chat.whatsapp.com/')[1];
                const groupInfo = await sock.groupGetInviteInfo(code);
                global.targetGroupJid = groupInfo.id;
                global.targetGroupInviteLink = botSettings.groupInviteLink;
            }

            const senderCandidates = buildJidCandidates(
                m.sender,
                m.key?.participant,
                m.key?.remoteJid
            );
            let participants = await getRequiredGroupParticipants(sock, global.targetGroupJid);
            let isMember = senderCandidates.some((candidate) => participants.has(candidate));

            if (!isMember) {
                participants = await getRequiredGroupParticipants(
                    sock,
                    global.targetGroupJid,
                    true
                );
                isMember = senderCandidates.some((candidate) => participants.has(candidate));
            }

            if (!isMember) {
                await m.reply(
                    `*AKSES DITOLAK*\n\nMaaf @${m.sender.split('@')[0]}, untuk menggunakan bot ini di Private Chat, kamu wajib bergabung ke grup official kami terlebih dahulu.\n\n*Link Grup:* ${botSettings.groupInviteLink}\n\nSetelah bergabung, silakan coba lagi!`,
                    { mentions: [m.sender] }
                );
                return false;
            }
        } catch (e) {
            logger.error('Join Group Check failed:', e.message);
        }
    }
    return true;
};
