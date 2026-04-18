import { commands } from '../../lib/commands.js';
import { toFancy } from '../../lib/font.js';
import { settings } from '../../config/settings.js';
import Settings from '../../database/models/Settings.js';
import fs from 'fs';

// Category mapping for better organization
const categoryOrder = [
    'AI',
    'Downloader',
    'Sticker',
    'Tools',
    'Group',
    'Finance',
    'Utility',
    'Panel',
    'Cloudflare',
    'Users',
    'General',
    'Info',
    'Owner'
];

export default {
    name: 'menu',
    aliases: ['help', 'cmd'],
    description: 'Show available commands in text format',
    category: 'Info',
    execute: async (sock, m, args, text) => {
        let botSettings = await Settings.findOne({ id: 'bot_settings' });
        const disabledList = botSettings ? botSettings.disabledCommands : [];

        const uniqueCommands = Array.from(new Set(commands.values()));
        const categories = {};
        
        uniqueCommands.forEach(cmd => {
            if (disabledList.includes(cmd.name)) return;
            if (cmd.name === 'menu') return;
            
            const cat = cmd.category || 'General';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(cmd);
        });

        const sortedCategories = Object.keys(categories).sort((a, b) => {
            const aIndex = categoryOrder.indexOf(a);
            const bIndex = categoryOrder.indexOf(b);
            return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
        });

        const date = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        const time = new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' });

        const getWeton = () => {
            const pasaran = ['Legi', 'Pahing', 'Pon', 'Wage', 'Kliwon'];
            const hari = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
            const d = new Date();
            const dayName = hari[d.getDay()];
            const baseDate = new Date('1900-01-01');
            const diffDays = Math.floor((d - baseDate) / (1000 * 60 * 60 * 24));
            const pasaranName = pasaran[(diffDays + 1) % 5];
            return `${dayName} ${pasaranName}`;
        };

        const weton = getWeton();
        const thumbBuffer = fs.existsSync('./maskot.jpeg') ? fs.readFileSync('./maskot.jpeg') : null;
        const inputCategory = args[0]?.toLowerCase();

        // ═══════════════════════════════════════════
        const botNameFancy = toFancy(settings.botName.toUpperCase());
        const header = `
╔═══════════════════════════════════╗
          ${botNameFancy}
╠═══════════════════════════════════╣
  ⏤͟͟͞͞User       : @${m.sender.split('@')[0]}
  ⏤͟͟͞͞Date       : ${toFancy(date)}
  ⏤͟͟͞͞Hari       : ${toFancy(weton)}
  ⏤͟͟͞͞Waktu      : ${toFancy(time)} WIB
  ⏤͟͟͞͞Prefix     : [ ${settings.prefix} ]
╚═══════════════════════════════════╝`;

        if (!inputCategory) {
            let menuText = `${header}\n\n`;
            menuText += `╔═══════════════════════════════════╗
║        ${toFancy('✦ CATEGORY LIST ✦')}
╠═══════════════════════════════════╣\n`;

            sortedCategories.forEach(cat => {
                const cmdCount = categories[cat].length;
                menuText += `║  ▸ ${toFancy(settings.prefix + 'MENU ' + cat.toUpperCase())}\n`;
                menuText += `║    └ Total: ${cmdCount} commands\n`;
            });
            
            menuText += `╚═══════════════════════════════════╝\n\n`;
            menuText += `${toFancy('━━━━━━━━━━━━━━━━━━━━━━━━━')}\n`;
            menuText += `  ${toFancy('Ketik .menu <category> untuk detail')}
  ${toFancy('Contoh: .menu downloader')}
${toFancy('━━━━━━━━━━━━━━━━━━━━━━━━━')}\n\n`;
            menuText += `✦ ${toFancy('Powered by Kanata API')} ✦`;

            return sock.sendMessage(m.chat, {
                text: menuText,
                mentions: [m.sender],
                contextInfo: {
                    externalAdReply: {
                        title: toFancy(settings.botName + ' v1.0'),
                        body: toFancy('The most advanced Multimodal AI Bot'),
                        mediaType: 1,
                        renderLargerThumbnail: true,
                        thumbnail: thumbBuffer,
                        sourceUrl: 'https://api.kanata.web.id'
                    }
                }
            }, { quoted: m });
        }

        const selectedCat = sortedCategories.find(c => c.toLowerCase() === inputCategory);
        if (!selectedCat) {
            return m.reply(`✗ ${toFancy('Category not found')}\n${toFancy('Type .menu to return')}`);
        }

        categories[selectedCat].sort((a, b) => a.name.localeCompare(b.name));
        
        let menuText = `
╔═══════════════════════════════════════╗
║         ${toFancy('✦ ' + selectedCat.toUpperCase() + ' ✦')}
╠═══════════════════════════════════════╣\n`;

        categories[selectedCat].forEach((cmd, index) => {
            const aliases = cmd.aliases && cmd.aliases.length > 0 ? ` ${cmd.aliases.join('/')}` : '';
            const icon = index % 2 === 0 ? '◈' : '◇';
            menuText += `║  ${icon} ${toFancy(settings.prefix + cmd.name)}${aliases ? toFancy(`[${aliases}]`) : ''}\n`;
        });
        
        menuText += `╠═══════════════════════════════════════╣
║  ${toFancy('⏤͟͟͞͞Total')} : ${categories[selectedCat].length} commands
╚═══════════════════════════════════════╝\n\n`;
        menuText += `${toFancy('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}\n`;
        menuText += `  ${toFancy('Ketik .menu untuk kembali')}
${toFancy('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}`;

        await sock.sendMessage(m.chat, {
            text: menuText,
            contextInfo: {
                externalAdReply: {
                    title: toFancy('Category: ' + selectedCat),
                    body: toFancy('Total ' + categories[selectedCat].length + ' commands'),
                    mediaType: 1,
                    renderLargerThumbnail: false,
                    thumbnail: thumbBuffer,
                    sourceUrl: 'https://api.kanata.web.id'
                }
            }
        }, { quoted: m });
    }
};
