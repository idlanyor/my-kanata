import { commands } from '../../lib/commands.js';
import { toFancy } from '../../lib/font.js';
import { settings } from '../../config/settings.js';
import Settings from '../../database/models/Settings.js';
import fs from 'fs';
import os from 'os';

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
        const time = new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' });
        
        // Javanese Calendar Calculation (Pasaran)
        const getWeton = () => {
            const pasaran = ['Legi', 'Pahing', 'Pon', 'Wage', 'Kliwon'];
            const hari = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
            const d = new Date();
            const dayName = hari[d.getDay()];
            // Base date: 1900-01-01 is Monday Pahing (pasaran index 1)
            const baseDate = new Date('1900-01-01');
            const diffDays = Math.floor((d - baseDate) / (1000 * 60 * 60 * 24));
            const pasaranName = pasaran[(diffDays + 1) % 5];
            return `${dayName} ${pasaranName}`;
        };

        const weton = getWeton();
        const thumbBuffer = fs.existsSync('./maskot.jpeg') ? fs.readFileSync('./maskot.jpeg') : null;

        const inputCategory = args[0]?.toLowerCase();

        // ════════ [ HEADER STYLE ] ════════
        const header = ` ${toFancy(settings.botName.toUpperCase())} 
* ${toFancy('User')} : @${m.sender.split('@')[0]}
* ${toFancy('Date')} : ${toFancy(date)} 
* ${toFancy('Hari/Pasaran')} : ${toFancy(weton)}
* ${toFancy('Waktu')} : ${toFancy(time)} WIB
* ${toFancy('Prefix')} : [ ${settings.prefix} ]`
        // IF SHOW CATEGORY LIST
        if (!inputCategory) {
            let menuText = `${header}\n\n`;
            menuText += `*╭── ${toFancy('CATEGORY LIST')} ──╮*\n`;
            
            sortedCategories.forEach(cat => {
                const cmdCount = categories[cat].length;
                menuText += ` • ${toFancy(settings.prefix + 'MENU ' + cat.toUpperCase())} (${cmdCount})\n`;
            });
            menuText += `╰────────────────╯\n`;

            menuText += `\n${toFancy('Select category to see commands')}\n`;
            menuText += `\n${toFancy('Powered by Kanata API')}`;

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

        // IF SHOW SPECIFIC CATEGORY
        const selectedCat = sortedCategories.find(c => c.toLowerCase() === inputCategory);
        if (!selectedCat) {
            return m.reply(`${toFancy('Category not found')}\n${toFancy('Type ' + settings.prefix + 'menu to return')}`);
        }

        let menuText = `╭──┈ ${toFancy(selectedCat.toUpperCase())} ┈──╮\n`;
        categories[selectedCat].sort((a, b) => a.name.localeCompare(b.name)).forEach(cmd => {
            menuText += `│  ${toFancy(settings.prefix + cmd.name)}\n`;
        });
        menuText += `╰─────────────────╯\n`;

        menuText += `\n${toFancy('Type ' + settings.prefix + 'menu to go back')}`;

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