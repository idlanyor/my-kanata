import { listRules } from '../../lib/cloudflare.js';
import { settings } from '../../config/settings.js';

export default {
    name: 'cflist',
    description: 'List Cloudflare Access Rules',
    category: 'Panel',
    execute: async (sock, m, args) => {
        const sender = m.sender;
        const isOwner = sender === settings.ownerNumber || sender === settings.ownerLid || sender.split(':')[0] === settings.ownerNumber.split('@')[0];
        if (!isOwner) return m.reply('Access Denied. Owner only.');

        await m.reply('Fetching rules...');
        try {
            const mode = args[0] ? args[0].toLowerCase() : null;
            const rules = await listRules(mode);
            
            if (rules.length === 0) return m.reply('No rules found.');

            let msg = `*Cloudflare Access Rules*\n\n`;
            rules.forEach((r, i) => {
                msg += `${i + 1}. *${r.configuration.value}* - [${r.mode.toUpperCase()}]\n`;
                msg += `   Notes: ${r.notes || '-'}\n`;
                msg += `   Date: ${new Date(r.created_on).toLocaleDateString()}\n\n`;
            });
            await m.reply(msg);
        } catch (error) {
            await m.reply(`Error: ${error.message}`);
        }
    }
};
