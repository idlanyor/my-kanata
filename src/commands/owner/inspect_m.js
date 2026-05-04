import { settings } from '../../config/settings.js';

export default {
    name: 'inspect-m',
    aliases: ['debugm', 'checkm'],
    description: 'Debug message object (m) to console',
    category: 'Owner',
    execute: async (sock, m, args, text) => {
        console.log('--- [ DEBUG MESSAGE OBJECT (m) ] ---');
        
        // Kita gunakan util.inspect agar object nested terlihat jelas dan tidak circular error
        const util = await import('util');
        console.log(util.inspect(m, { showHidden: false, depth: 3, colors: true }));
        
        console.log('--- [ END OF DEBUG ] ---');
        
        await m.reply('✅ Struktur object `m` sudah dikirim ke console log server.');
    }
};
