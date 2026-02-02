import { proto, getContentType } from '@whiskeysockets/baileys';

export const serialize = (m, sock) => {
    if (!m) return m;
    let M = proto.WebMessageInfo;
    
    if (m.key) {
        m.id = m.key.id;
        m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16;
        m.chat = m.key.remoteJid;
        m.fromMe = m.key.fromMe;
        m.isGroup = m.chat.endsWith('@g.us');
        m.sender = m.fromMe ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : (m.isGroup ? m.key.participant : m.chat);
    }

    if (m.message) {
        m.mtype = getContentType(m.message);
        m.msg = (m.mtype == 'viewOnceMessage' ? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)] : m.message[m.mtype]);
        
        // Extract text body
        m.body = m.message.conversation || m.msg.caption || m.msg.text || (m.mtype == 'listResponseMessage') && m.msg.singleSelectReply.selectedRowId || (m.mtype == 'buttonsResponseMessage') && m.msg.selectedButtonId || (m.mtype == 'viewOnceMessage') && m.msg.caption || m.text;
        
        m.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : [];

        // Quoted message handling
        // Context info can be in m.msg (if it's a specific message type) or just in the message structure
        const contextInfo = m.msg?.contextInfo || m.message?.extendedTextMessage?.contextInfo;
        const quoted = contextInfo?.quotedMessage;

        if (quoted) {
            let type = getContentType(quoted);
            m.quoted = quoted[type];
            
            // Handle viewOnce and documentWithCaption
            if (['viewOnceMessage', 'viewOnceMessageV2', 'documentWithCaptionMessage'].includes(type)) {
                const messageContent = m.quoted.message || m.quoted;
                const innerType = getContentType(messageContent);
                m.quoted = messageContent[innerType];
                type = innerType;
            }

            // Create a safe object if it's just a string (rare but possible in old protocols) or ensure it's an object
            if (typeof m.quoted === 'string') {
                m.quoted = { text: m.quoted };
            } else if (!m.quoted) {
                m.quoted = {}; // Fallback
            }

            m.quoted.mtype = type;
            m.quoted.id = contextInfo.stanzaId;
            m.quoted.chat = contextInfo.remoteJid || m.chat;
            m.quoted.isBaileys = m.quoted.id ? m.quoted.id.startsWith('BAE5') && m.quoted.id.length === 16 : false;
            m.quoted.sender = contextInfo.participant;
            m.quoted.fromMe = m.quoted.sender === (sock.user && sock.user.id);
            
            // Extract text from quoted safely
            m.quoted.text = m.quoted.conversation || m.quoted.caption || m.quoted.text || m.quoted.description || (m.quoted.extendedTextMessage?.text) || '';
            m.quoted.mimetype = m.quoted.mimetype || m.quoted.msg?.mimetype || '';
            m.quoted.fileName = m.quoted.fileName || m.quoted.filename || '';
            m.quoted.msg = m.quoted; // Self reference for compatibility
        } else {
            m.quoted = null;
        }
    }
    
    // Reply helper
    m.reply = (text, quoted = m) => {
        return sock.sendMessage(m.chat, { text: text }, { quoted: quoted });
    };

    return m;
};
