import { getUserServers } from '../../lib/pterodactyl.js';
import { settings } from '../../config/settings.js';

export default {
    name: 'mysrv',
    aliases: ['listsrv', 'vpsku'],
    description: 'List your Pterodactyl servers',
    category: 'Panel',
    execute: async (sock, m, args, text) => {
        try {
            await m.reply('Fetching your servers...');
            const servers = await getUserServers(m.sender);

            if (servers.length === 0) {
                return m.reply(`You don't have any servers yet or your account is not linked. Use ${settings.prefix}bind if you already have an account.`);
            }

            let msg = `*YOUR SERVERS*\n\n`;
            servers.forEach((s, i) => {
                msg += `${i + 1}. *${s.name}*\n`;
                msg += `   ID: ${s.identifier}\n`;
                msg += `   RAM: ${s.limits.memory}MB\n`;
                msg += `   Disk: ${s.limits.disk}MB\n`;
                msg += `   Status: ${s.suspended ? 'Suspended' : 'Active'}\n`;
                msg += `--------------------------\n`;
            });

            msg += `\nTo manage a server, use: ${settings.prefix}vps <identifier> <action>\nActions: start, stop, restart, status`;
            
            await m.reply(msg);
        } catch (error) {
            console.error(error);
            await m.reply(`Error: ${error.message}`);
        }
    }
};
