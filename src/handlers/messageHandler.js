import { serialize } from '../lib/serialize.js';
import { commands } from '../lib/commands.js';
import logger from '../lib/logger.js';
import { settings } from '../config/settings.js';
import Settings from '../database/models/Settings.js';

export const messageHandler = async (sock, m) => {
    try {
        if (!m) return;
        // Don't process system messages or status updates usually
        if (m.key.fromMe) return;

        m = serialize(m, sock);
        if (!m.body) return;

        // Fetch Bot Settings from DB
        let botSettings = await Settings.findOne({ id: 'bot_settings' });
        if (!botSettings) {
            botSettings = await Settings.create({ id: 'bot_settings' });
        }

        // --- Leveling System Removed ---
        // -----------------------

        const isCmd = m.body.startsWith(settings.prefix);
        const cmdName = isCmd ? m.body.slice(settings.prefix.length).trim().split(' ')[0].toLowerCase() : '';
        const args = m.body.trim().split(' ').slice(1);
        const text = args.join(' ');

        if (isCmd) {
            const command = commands.get(cmdName);
            if (command) {
                // Check if command is disabled
                if (botSettings.disabledCommands.includes(command.name)) {
                    return m.reply(`The command *${command.name}* is currently disabled by the owner.`);
                }

                logger.info(`Executing command: ${cmdName} from ${m.sender}`);
                try {
                    await command.execute(sock, m, args, text);
                } catch (err) {
                    logger.error(err, `Error executing command ${cmdName}`);
                    await m.reply(' An error occurred while executing that command.');
                }
            }
        }

    } catch (err) {
        logger.error(err, 'Error in messageHandler');
    }
};
