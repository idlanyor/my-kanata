export default {
    name: 'kick',
    description: 'Kick a member from the group',
    category: 'Group',
    execute: async (sock, m, args, text) => {
        if (!m.isGroup) return m.reply('This command can only be used in groups.');
        
        const groupMetadata = await sock.groupMetadata(m.chat);
        const participants = groupMetadata.participants;
        
        const botJid = sock.user.id.split(':')[0].split('@')[0];
        const botLid = sock.user.lid ? sock.user.lid.split(':')[0].split('@')[0] : null;
        
        const userAdmin = participants.find(p => p.id === m.sender);
        const botAdmin = participants.find(p => {
            const pid = p.id.split(':')[0].split('@')[0];
            return pid === botJid || (botLid && pid === botLid);
        });

        // console.log(`[DEBUG] Group Management - Chat: ${m.chat}`);
        // console.log(`[DEBUG] Sender: ${m.sender}, isAdmin: ${userAdmin?.admin}`);
        // console.log(`[DEBUG] Bot JID: ${botJid}, Bot LID: ${botLid}`);
        // console.log(`[DEBUG] Bot Found in Participants: ${botAdmin ? 'Yes (' + botAdmin.id + ')' : 'No'}`);
        // console.log(`[DEBUG] Bot Admin Status: ${botAdmin?.admin}`);

        if (!botAdmin) {
            // console.log(`[DEBUG] Participants IDs: ${participants.map(p => p.id).join(', ')}`);
        }

        const isAdmin = userAdmin && (userAdmin.admin === 'admin' || userAdmin.admin === 'superadmin');
        const botIsAdmin = botAdmin && (botAdmin.admin === 'admin' || botAdmin.admin === 'superadmin');

        if (!isAdmin) return m.reply('This command is only for group admins.');
        if (!botIsAdmin) return m.reply('I need to be an admin to kick members.');

        let users = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : [];
        if (m.msg.contextInfo && m.msg.contextInfo.quotedMessage) {
            users.push(m.msg.contextInfo.participant);
        }

        if (users.length === 0) return m.reply('Please tag the user you want to kick.');

        for (let user of users) {
            await sock.groupParticipantsUpdate(m.chat, [user], 'remove');
        }
        
        await m.reply(' Success');
    }
};
