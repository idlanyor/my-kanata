import { jidNormalizedUser } from '@whiskeysockets/baileys';

export default {
    name: 'add',
    description: 'Add a member to the group',
    category: 'Group',
    execute: async (sock, m, args, text) => {
        if (!m.isGroup) return m.reply('This command can only be used in groups.');
        
        const groupMetadata = await sock.groupMetadata(m.chat);
        const participants = groupMetadata.participants;
        
        const botJid = jidNormalizedUser(sock.user.id);
        const botLid = sock.user.lid ? jidNormalizedUser(sock.user.lid) : null;
        
        const userAdmin = participants.find(p => jidNormalizedUser(p.id) === jidNormalizedUser(m.sender));
        const botAdmin = participants.find(p => {
            const pid = jidNormalizedUser(p.id);
            return pid === botJid || pid === botLid;
        });

        const isAdmin = userAdmin && (userAdmin.admin === 'admin' || userAdmin.admin === 'superadmin');
        const botIsAdmin = botAdmin && (botAdmin.admin === 'admin' || botAdmin.admin === 'superadmin');

        if (!isAdmin) return m.reply('This command is only for group admins.');
        if (!botIsAdmin) return m.reply('I need to be an admin to add members.');

        let users = [];

        // 1. From Arguments (Numbers)
        if (args.length > 0) {
            args.forEach(arg => {
                let num = arg.replace(/[^0-9]/g, '');
                if (num.length >= 10) {
                    users.push(num + '@s.whatsapp.net');
                }
            });
        }

        // 2. From Quoted Message (vCard or Mention)
        const quoted = m.msg.contextInfo ? m.msg.contextInfo.quotedMessage : null;
        if (quoted) {
            const contact = quoted.contactMessage || quoted.contactsArrayMessage;
            if (contact) {
                if (quoted.contactMessage) {
                    const vcard = quoted.contactMessage.vcard;
                    const num = vcard.split('waid=')[1]?.split(':')[0];
                    if (num) users.push(num + '@s.whatsapp.net');
                } else if (quoted.contactsArrayMessage) {
                    quoted.contactsArrayMessage.contacts.forEach(c => {
                        const num = c.vcard.split('waid=')[1]?.split(':')[0];
                        if (num) users.push(num + '@s.whatsapp.net');
                    });
                }
            } else if (m.msg.contextInfo.mentionedJid) {
                users.push(...m.msg.contextInfo.mentionedJid);
            }
        }

        if (users.length === 0) return m.reply('Usage: !add 628123456789 or reply to a contact/vcard');

        // Remove duplicates
        users = [...new Set(users)];

        // console.log(`[DEBUG] Adding users: ${users.join(', ')}`);
        
        try {
            const response = await sock.groupParticipantsUpdate(m.chat, users, 'add');
            
            // Response details: [{ jid: '...', status: '200' }, ...]
            let success = [];
            let failed = [];

            for (let res of response) {
                if (res.status === '200') success.push(res.jid);
                else failed.push(res.jid);
            }

            let replyMsg = '';
            if (success.length > 0) replyMsg += ` Successfully added: ${success.length} member(s).
`;
            if (failed.length > 0) replyMsg += ` Failed to add: ${failed.length} member(s). (Maybe they have privacy settings or are already in the group)`;

            await m.reply(replyMsg || 'No members were added.');
        } catch (err) {
            console.error('[DEBUG] Add command error:', err);
            await m.reply(' An error occurred while adding members.');
        }
    }
};
