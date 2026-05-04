import { jidNormalizedUser } from 'baileys';
import { getGroupSettings } from './messageFlow.js';
import { adContext } from '../lib/adReply.js';
import logger from '../lib/logger.js';

export const groupParticipantsUpdate = async (sock, { id, participants, action }) => {
    try {
        logger.debug(`Group Update - ID: ${id}, Action: ${action}, Participants: ${participants.join(', ')}`, 'GROUP-EVENT');
        const groupData = await getGroupSettings(id);
        if (!groupData) {
            logger.warn(`No settings found for group: ${id}`, 'GROUP-EVENT');
            return;
        }

        // Ambil metadata tambahan jika deskripsi dibutuhkan
        let groupDesc = groupData.desc || '';
        if (!groupDesc && (groupData.welcomeMsg.includes('@desc') || groupData.leaveMsg.includes('@desc'))) {
            try {
                const meta = await sock.groupMetadata(id);
                groupDesc = meta.desc || '-';
            } catch {
                groupDesc = '-';
            }
        }

        logger.debug(`Group Settings for ${id} - Welcome: ${groupData.welcome}, Left: ${groupData.left}`, 'GROUP-EVENT');

        for (const participant of participants) {
            // Baileys can send string JID or object with id property
            const rawJid = typeof participant === 'string' ? participant : (participant.id || participant.jid);
            if (!rawJid) continue;

            const userJid = jidNormalizedUser(rawJid);
            const userTag = `@${userJid.split('@')[0]}`;
            
            if (action === 'add' && groupData.welcome) {
                const message = groupData.welcomeMsg
                    .replace(/@user/g, userTag)
                    .replace(/@group/g, groupData.name || 'this group')
                    .replace(/@desc/g, groupDesc);

                const ctx = await adContext({
                    title: `WELCOME TO ${groupData.name}`,
                    body: `Hello ${userTag}!`,
                });

                await sock.sendMessage(id, {
                    text: message,
                    contextInfo: {
                        ...ctx.contextInfo,
                        mentionedJid: [userJid]
                    }
                });
            } else if (action === 'remove' && groupData.left) {
                const message = groupData.leaveMsg
                    .replace(/@user/g, userTag)
                    .replace(/@group/g, groupData.name || 'this group')
                    .replace(/@desc/g, groupDesc);

                await sock.sendMessage(id, {
                    text: message,
                    contextInfo: {
                        mentionedJid: [userJid]
                    }
                });
            }
        }
    } catch (err) {
        logger.error(err, 'Error in groupParticipantsUpdate handler');
    }
};
