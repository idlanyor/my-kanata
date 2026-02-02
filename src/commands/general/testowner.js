import { settings } from '../../config/settings.js';

export default {
    name: 'testowner',
    description: 'Test if owner check works',
    category: 'General',
    execute: async (sock, m, args) => {
        const sender = m.sender;
        // Check standard JID and LID
        const isOwner = sender === settings.ownerNumber || sender === settings.ownerLid || sender.split(':')[0] === settings.ownerNumber.split('@')[0];

        if (isOwner) {
            await m.reply(`Confirmed. You are identified as the owner: ${settings.ownerName}`);
        } else {
            await m.reply(`Access denied. You are not the owner. Your ID: ${sender}`);
        }
    }
};
