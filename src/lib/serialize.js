import { getContentType, jidNormalizedUser, downloadContentFromMessage } from '@whiskeysockets/baileys';

/**
 * Normalisasi JID (Support LID & PN)
 */
export const decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
        const decode = jidNormalizedUser(jid);
        return decode || jid;
    }
    return jid;
};

export const serialize = (m, sock) => {
    if (!m) return m;

    /**
     * Helper untuk download media secara instant
     */
    m.download = async () => {
        return await m.downloadMediaMessage(m);
    };

    m.downloadMediaMessage = async (message = m) => {
        let msg = message.msg || message;
        let mime = msg.mimetype || '';
        let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
        const stream = await downloadContentFromMessage(msg, messageType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        return buffer;
    };

    if (m.key) {
        m.id = m.key.id;
        m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16;
        m.chat = decodeJid(m.key.remoteJid);
        m.fromMe = m.key.fromMe;
        m.isGroup = m.chat.endsWith('@g.us');
        m.sender = decodeJid(m.fromMe ? jidNormalizedUser(sock.user.id) : (m.isGroup ? m.key.participant : m.chat));
    }

    if (m.message) {
        m.mtype = getContentType(m.message);
        m.msg = (m.mtype == 'viewOnceMessage' ? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)] : m.message[m.mtype]);
        
        // Extracting Body/Text
        m.body = m.message.conversation || m.msg?.caption || m.msg?.text || (m.mtype == 'listResponseMessage') && m.msg.singleSelectReply.selectedRowId || (m.mtype == 'buttonsResponseMessage') && m.msg.selectedButtonId || (m.mtype == 'viewOnceMessage') && m.msg.caption || m.text || "";
        m.arg = m.body.trim().split(/\s+/);
        m.args = m.body.trim().split(/\s+/).slice(1);
        m.text = m.args.join(" ");

        // Media Helpers
        m.isImage = m.mtype === 'imageMessage';
        m.isVideo = m.mtype === 'videoMessage';
        m.isAudio = m.mtype === 'audioMessage';
        m.isSticker = m.mtype === 'stickerMessage';
        m.isDocument = m.mtype === 'documentMessage';
        m.isViewOnce = m.mtype === 'viewOnceMessage' || m.mtype === 'viewOnceMessageV2' || !!m.msg?.viewOnce;
        
        m.mentionedJid = m.msg?.contextInfo ? m.msg.contextInfo.mentionedJid : [];

        // Quoted Handling
        const contextInfo = m.msg?.contextInfo || m.message?.extendedTextMessage?.contextInfo;
        const quoted = contextInfo?.quotedMessage;

        if (quoted) {
            let type = getContentType(quoted);
            let isViewOnce = false;
            m.quoted = quoted[type];
            
            if (['viewOnceMessage', 'viewOnceMessageV2', 'documentWithCaptionMessage'].includes(type)) {
                isViewOnce = true;
                const messageContent = m.quoted.message || m.quoted;
                const innerType = getContentType(messageContent);
                m.quoted = messageContent[innerType];
                type = innerType;
            }

            if (typeof m.quoted === 'string') {
                m.quoted = { text: m.quoted };
            }

            m.quoted.mtype = type;
            m.quoted.id = contextInfo.stanzaId;
            m.quoted.chat = decodeJid(contextInfo.remoteJid || m.chat);
            m.quoted.isBaileys = m.quoted.id ? m.quoted.id.startsWith('BAE5') && m.quoted.id.length === 16 : false;
            m.quoted.sender = decodeJid(contextInfo.participant);
            const botJid = decodeJid(sock.user.id);
            const botLid = sock.user.lid ? decodeJid(sock.user.lid) : botJid;
            m.quoted.fromMe = m.quoted.sender === botJid || m.quoted.sender === botLid;
            
            m.quoted.text = m.quoted.conversation || m.quoted.caption || m.quoted.text || m.quoted.description || '';
            m.quoted.msg = m.quoted;
            
            // Quoted Media Helpers
            m.quoted.isImage = m.quoted.mtype === 'imageMessage';
            m.quoted.isVideo = m.quoted.mtype === 'videoMessage';
            m.quoted.isAudio = m.quoted.mtype === 'audioMessage';
            m.quoted.isSticker = m.quoted.mtype === 'stickerMessage';
            m.quoted.isDocument = m.quoted.mtype === 'documentMessage';
            m.quoted.isViewOnce = isViewOnce || !!m.quoted?.viewOnce;

            m.quoted.download = () => m.downloadMediaMessage(m.quoted);
        } else {
            m.quoted = null;
        }
    }
    
    /**
     * Smart Reply with Global Fake Quote Verified
     */
    m.reply = async (text, options = {}) => {
        const chat = options.chat || m.chat;
        
        // Merging contextInfo for Verified Fake Quote
        const contextInfo = {
            stanzaId: 'VERIFIED',
            participant: '0@s.whatsapp.net',
            quotedMessage: {
                conversation: 'Kanata Bot Official'
            },
            ...(options.contextInfo || {})
        };

        return sock.sendMessage(chat, { 
            text: text, 
            ...options,
            contextInfo 
        }); // Hapus { quoted } agar tidak dioverwrite
    };

    /**
     * React Helper
     */
    m.react = (emoji) => {
        return sock.sendMessage(m.chat, { react: { text: emoji, key: m.key } });
    };

    return m;
};
