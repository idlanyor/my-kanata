import { getZoneId, listDnsRecords } from '../../lib/cloudflare.js';
import { settings } from '../../config/settings.js';

export default {
    name: 'listdns',
    description: 'List DNS Records for a domain',
    category: 'Cloudflare',
    execute: async (sock, m, args) => {
        const sender = m.sender;
        const isOwner = sender === settings.ownerNumber || sender === settings.ownerLid || sender.split(':')[0] === settings.ownerNumber.split('@')[0];
        if (!isOwner) return m.reply('Access Denied. Owner only.');

        const domain = args[0];
        if (!domain) return m.reply(`Usage: ${settings.prefix}listdns <domain>\nExample: ${settings.prefix}listdns kanata.web.id`);

        await m.react('⏳');

        try {
            const zoneId = await getZoneId(domain);
            if (!zoneId) {
                await m.react('❌');
                return m.reply(`Error: Domain ${domain} not found in your Cloudflare account.`);
            }

            const records = await listDnsRecords(zoneId);
            if (records.length === 0) {
                await m.react('❌');
                return m.reply(`No DNS records found for ${domain}.`);
            }

            let msg = `DNS Records for ${domain}\n\n`;
            records.forEach((r, i) => {
                msg += `${i + 1}. [${r.type}] *${r.name}*\n`;
                msg += `   Content: ${r.content}\n`;
                msg += `   Proxied: ${r.proxied}\n\n`;
            });

            await m.reply(msg);
            await m.react('✅');
        } catch (error) {
            await m.react('❌');
            await m.reply(`Error: ${error.message}`);
        }
    }
};
