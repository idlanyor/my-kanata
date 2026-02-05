import fs from 'fs';
import { glob } from 'glob';
import path from 'path';

export default {
    name: 'getplugin',
    aliases: ['gp'],
    category: 'Owner',
    description: 'Get content of a plugin file',
    execute: async (sock, m, args, text) => {
        if (!text) return m.reply('Please provide a plugin name.');

        const commandsDir = path.join(process.cwd(), 'src/commands');
        
        let query = text.trim();
        // Remove .js if present to standardize
        if (query.endsWith('.js')) query = query.slice(0, -3);

        // Construct pattern: search for query.js in any subdirectory of src/commands
        // If query is "menu", pattern is "**/menu.js"
        // If query is "general/menu", pattern is "**/general/menu.js"
        const pattern = `**/${query}.js`; 
        
        try {
            const files = await glob(pattern, { cwd: commandsDir, absolute: true });

            if (files.length === 0) {
                return m.reply(`Plugin '${text}' not found.`);
            }

            // Just pick the first match
            const fileToRead = files[0];
            const content = fs.readFileSync(fileToRead, 'utf8');
            
            await m.reply(content);
        } catch (e) {
            console.error(e);
            m.reply(`Error: ${e.message}`);
        }
    }
};
