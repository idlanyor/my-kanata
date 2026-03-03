import { getZoneId, addDnsRecord } from '../../lib/cloudflare.js';
import { settings } from '../../config/settings.js';

export default {
    name: 'adddns',
    aliases: ['subdomain', 'dns'],
    description: 'Add DNS Record to Cloudflare',
    category: 'Cloudflare',
    execute: async (sock, m, args) => {
        const sender = m.sender;
        const isOwner = sender === settings.ownerNumber || sender === settings.ownerLid || sender.split(':')[0] === settings.ownerNumber.split('@')[0];
        if (!isOwner) return m.reply('Access Denied. Owner only.');

        // Usage: .adddns <type> <name> <domain> <content> <proxied:true/false>
        // Example: .adddns A panel kanata.web.id 1.2.3.4 true
        if (args.length < 4) {
            return m.reply(`Usage: ${settings.prefix}adddns <type> <subdomain> <domain> <ip/content> [proxied:true/false]\n\nExample: ${settings.prefix}adddns A panel kanata.web.id 1.2.3.4 true`);
        }

        const type = args[0].toUpperCase();
        const name = args[1];
        const domain = args[2];
        const content = args[3];
        const proxied = args[4] === 'true';

        await m.reply(`Searching zone ID for ${domain}...`);

        try {
            const zoneId = await getZoneId(domain);
            if (!zoneId) return m.reply(`Error: Domain ${domain} not found in your Cloudflare account.`);

            await m.reply(`Creating ${type} record for ${name}.${domain}...`);
            const result = await addDnsRecord(zoneId, type, `${name}.${domain}`, content, proxied);

            let msg = `DNS Record Created Successfully\n\n`;
            msg += `Type: ${result.type}\n`;
            msg += `Name: ${result.name}\n`;
            msg += `Content: ${result.content}\n`;
            msg += `Proxied: ${result.proxied}\n`;
            msg += `ID: ${result.id}`;

            await m.reply(msg);
        } catch (error) {
            await m.reply(`Error: ${error.message}`);
        }
    }
};
