export default {
    name: 'ping',
    aliases: ['p'],
    description: 'Pong!',
    execute: async (sock, m, args) => {
        await m.reply('Pong! ');
    }
};
