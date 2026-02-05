import Group from '../database/models/Group.js';
import logger from '../lib/logger.js';
import axios from 'axios';

/**
 * Helper untuk ambil buffer gambar dari URL
 */
async function getBuffer(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        return Buffer.from(response.data);
    } catch {
        return null;
    }
}

export const groupParticipantsHandler = async (sock, anu) => {
    const { id, participants, action } = anu;
    
    try {
        const groupData = await Group.findOne({ jid: id });
        if (!groupData) return;

        const metadata = await sock.groupMetadata(id);
        
        for (const jid of participants) {
            let targetJid = jid;

            // Mapping LID ke PN jika tersedia di metadata
            const participantInfo = metadata.participants.find(p => p.id === jid || p.lid === jid);
            if (participantInfo?.id && participantInfo.id.endsWith('@s.whatsapp.net')) {
                targetJid = participantInfo.id;
            }

            // Ambil URL Foto Profil
            const ppUrl = await sock.profilePictureUrl(jid, 'image').catch(() => 'https://ui-avatars.com/api/?name=User&background=000&color=fff&size=512');
            const ppBuffer = await getBuffer(ppUrl);
            
            if (action === 'add' && groupData.welcome) {
                const text = groupData.welcomeMsg
                    .replace('@user', `@${jid.split('@')[0]}`)
                    .replace('@group', metadata.subject)
                    .replace('@desc', metadata.desc?.toString() || '-');
                
                await sock.sendMessage(id, { 
                    text, 
                    mentions: [jid],
                    contextInfo: {
                        externalAdReply: {
                            title: `W E L C O M E  U S E R`,
                            body: `Member baru di ${metadata.subject}`,
                            mediaType: 1,
                            thumbnail: ppBuffer,
                            sourceUrl: 'https://api.kanata.web.id',
                            renderLargerThumbnail: true
                        }
                    }
                });
            } 
            
            else if (action === 'remove' && groupData.left) {
                const text = groupData.leaveMsg
                    .replace('@user', `@${jid.split('@')[0]}`)
                    .replace('@group', metadata.subject);
                
                await sock.sendMessage(id, { 
                    text, 
                    mentions: [jid],
                    contextInfo: {
                        externalAdReply: {
                            title: `G O O D  B Y E  U S E R`,
                            body: `Seseorang keluar dari ${metadata.subject}`,
                            mediaType: 1,
                            thumbnail: ppBuffer,
                            sourceUrl: 'https://api.kanata.web.id',
                            renderLargerThumbnail: true
                        }
                    }
                });
            }
        }
    } catch (err) {
        logger.error(err, 'Error in groupParticipantsHandler');
    }
};
