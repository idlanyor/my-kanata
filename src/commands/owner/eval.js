import { exec } from 'child_process';
import { settings } from '../../config/settings.js';
import util from 'util';

export default {
    name: 'eval',
    aliases: ['exec', 'x', '>'],
    description: 'Evaluate JavaScript code or execute shell commands (Owner Only)',
    category: 'Owner',
    execute: async (sock, m, args, text) => {
        // Strict Owner Check
        const sender = m.sender;
        const isOwner = sender === settings.ownerNumber || sender === settings.ownerLid || sender.split(':')[0] === settings.ownerNumber.split('@')[0];
        if (!isOwner) return; // Silent return for unauthorized users

        const command = m.body.slice(settings.prefix.length).trim().split(' ')[0].toLowerCase();

        if (command === 'exec' || command === 'x') {
            if (!text) return m.reply('Provide a shell command.');
            exec(text, (err, stdout, stderr) => {
                if (err) return m.reply(util.format(err));
                if (stdout) m.reply(util.format(stdout));
                if (stderr) m.reply(util.format(stderr));
            });
        } 
        
        else if (command === 'eval' || command === '>') {
            if (!text) return m.reply('Provide JS code.');
            try {
                let evaled = await eval(text);
                if (typeof evaled !== 'string') evaled = util.inspect(evaled);
                await m.reply(evaled);
            } catch (err) {
                await m.reply(util.format(err));
            }
        }
    }
};
