import { listRules, createRule, deleteRule } from '../../lib/cloudflare.js';
import { settings } from '../../config/settings.js';

export default {
    name: 'cf',
    aliases: ['cfban', 'cfunban', 'cfwhitelist', 'cflist'],
    description: 'Cloudflare Account Firewall Management',
    category: 'Owner',
    execute: async (sock, m, args, text) => {
        // Security: Owner Only
        const sender = m.sender;
        const isOwner = sender === settings.ownerNumber || sender === settings.ownerLid || sender.split(':')[0] === settings.ownerNumber.split('@')[0];
        
        if (!isOwner) return m.reply('Access Denied. Owner only.');

        const command = m.body.slice(settings.prefix.length).trim().split(' ')[0].toLowerCase();

        try {
            if (command === 'cf') {
                let menu = `*Cloudflare Firewall Manager*\n\n`;
                menu += `• *${settings.prefix}cflist [mode]* - List firewall rules (mode: block/whitelist)\n`;
                menu += `• *${settings.prefix}cfban <ip> [notes]* - Ban an IP address\n`;
                menu += `• *${settings.prefix}cfwhitelist <ip> [notes]* - Whitelist an IP address\n`;
                menu += `• *${settings.prefix}cfunban <ip>* - Remove an IP from rules\n`;
                return m.reply(menu);
            }

            if (command === 'cflist') {
                await m.reply('Fetching rules...');
                const mode = args[0] ? args[0].toLowerCase() : null; // 'block' or 'whitelist'
                const rules = await listRules(mode);
                
                if (rules.length === 0) return m.reply('No rules found.');

                let msg = `*Cloudflare Access Rules*\n\n`;
                rules.forEach((r, i) => {
                    msg += `${i + 1}. *${r.configuration.value}* - [${r.mode.toUpperCase()}]\n`;
                    msg += `   Notes: ${r.notes || '-'}\n`;
                    msg += `   Date: ${new Date(r.created_on).toLocaleDateString()}\n\n`;
                });
                await m.reply(msg);
            } 
            
            else if (command === 'cfban') {
                const ip = args[0];
                const notes = args.slice(1).join(' ');
                if (!ip) return m.reply(`Usage: ${settings.prefix}cfban <ip> <notes>`);

                await m.reply('Blocking IP...');
                const result = await createRule(ip, 'block', notes);
                await m.reply(`Successfully BANNED IP: *${result.configuration.value}*\nID: ${result.id}`);
            } 
            
            else if (command === 'cfwhitelist') {
                const ip = args[0];
                const notes = args.slice(1).join(' ');
                if (!ip) return m.reply(`Usage: ${settings.prefix}cfwhitelist <ip> <notes>`);

                await m.reply('Whitelisting IP...');
                const result = await createRule(ip, 'whitelist', notes);
                await m.reply(`Successfully WHITELISTED IP: *${result.configuration.value}*\nID: ${result.id}`);
            }

            else if (command === 'cfunban') {
                const ip = args[0];
                if (!ip) return m.reply(`Usage: ${settings.prefix}cfunban <ip>`);

                await m.reply('Deleting rule...');
                const result = await deleteRule(ip);
                
                if (result) {
                    await m.reply(`Successfully removed rule for IP: *${result.ip}*`);
                } else {
                    await m.reply(`IP not found in firewall rules.`);
                }
            }

        } catch (error) {
            console.error(error);
            await m.reply(`❌ Error: ${error.message || 'Unknown error'}`);
        }
    }
};
