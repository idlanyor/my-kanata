import { commands } from '../../lib/commands.js';
import { toFancy } from '../../lib/font.js';
import { settings } from '../../config/settings.js';
import Settings from '../../database/models/Settings.js';
import fs from 'fs';

export default {
    name: 'menu',
    aliases: ['help', 'cmd'],
    description: 'Show available commands in text format',
    execute: async (sock, m, args, text) => {
        let botSettings = await Settings.findOne({ id: 'bot_settings' });
        const disabledList = botSettings ? botSettings.disabledCommands : [];

        const uniqueCommands = Array.from(new Set(commands.values()));
        const categories = {};
        uniqueCommands.forEach(cmd => {
            if (disabledList.includes(cmd.name)) return;
            const cat = cmd.category || 'General';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(cmd);
        });

        const sortedCategories = Object.keys(categories).sort();
        const date = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

        let menuText = `*${toFancy('KANATA BOT MENU')}*\n\n`;
        menuText += `╭━━━━〔 *${settings.botName}* 〕━━━━╮\n`;
        menuText += `┃\n`;
        menuText += `┃  🎀 ${toFancy('Hi')} : @${m.sender.split('@')[0]}\n`;
        menuText += `┃  🎀 ${toFancy('Date')} : ${toFancy(date)}\n`;
        menuText += `┃  🎀 ${toFancy('Mode')} : Public\n`;
        menuText += `┃\n`;
        menuText += `╰━━━━━━━━━━━━━━━━━━━━━╯\n\n`;

        sortedCategories.forEach(cat => {
            menuText += `▸ ִֶָ  ❨ #${toFancy(cat.toUpperCase())} ❩ ! ◗\n`;
            menuText += `╚═══╗🎀╔═══╝\n`;
            categories[cat].sort((a, b) => a.name.localeCompare(b.name)).forEach(cmd => {
                menuText += `│ •➤ ${settings.prefix}${toFancy(cmd.name)}\n`;
            });
            menuText += `\n`;
        });

        menuText += `· · · · ﹏‌﹏‌﹏‌﹏‌﹏‌﹏‌﹏‌﹏‌﹏‌﹏‌﹏‌﹏‌﹏‌ ༅˻\n`;
        menuText += `@KanataAPI`;

        // Read local mascot image
        const thumbBuffer = fs.existsSync('./maskot.jpeg') ? fs.readFileSync('./maskot.jpeg') : null;

        // Send with Large Banner AdReply and Mention
        await sock.sendMessage(m.chat, {
            text: menuText,
            mentions: [m.sender],
            contextInfo: {
                externalAdReply: {
                    title: `© ${settings.botName} v1.0`,
                    body: `The most advanced Multimodal AI Bot`,
                    mediaType: 1,
                    previewType: 0,
                    renderLargerThumbnail: true,
                    thumbnail: thumbBuffer,
                    sourceUrl: 'https://api.kanata.web.id'
                }
            }
        }, { quoted: m });
    }
};