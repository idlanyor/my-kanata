import os from 'os';
import { settings } from '../../config/settings.js';
import { adContext } from '../../lib/adReply.js';

export default {
    name: 'is',
    aliases: ['system', 'status', 'botstat'],
    description: 'Menampilkan informasi sistem bot',
    category: 'Info',
    execute: async (sock, m, args, text) => {
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);

        const uptimeString = `${hours}j ${minutes}m ${seconds}d`;

        // System Uptime
        const sysUptime = os.uptime();
        const sysDays = Math.floor(sysUptime / 86400);
        const sysHours = Math.floor((sysUptime % 86400) / 3600);
        const sysMinutes = Math.floor((sysUptime % 3600) / 60);
        const sysUptimeString = `${sysDays}d ${sysHours}j ${sysMinutes}m`;

        const ramUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
        const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
        const freeRam = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);

        let info = `*── 「 SYSTEM STATUS 」 ──*\n\n`;
        info += `➛ *OS:* ${os.type()} (${os.release()})\n`;
        info += `➛ *Architecture:* ${os.arch()}\n`;
        info += `➛ *Platform:* ${os.platform()}\n`;
        info += `➛ *Node.js:* ${process.version}\n`;
        info += `➛ *Bot Uptime:* ${uptimeString}\n`;
        info += `➛ *System Uptime:* ${sysUptimeString}\n`;
        info += `➛ *Memory Usage:* ${ramUsage} MB\n`; 
        info += `➛ *Total RAM:* ${totalRam} GB\n`;
        info += `➛ *Free RAM:* ${freeRam} GB\n`;
        info += `➛ *CPU:* ${os.cpus()[0].model} (${os.cpus().length} Cores)\n\n`;
        info += `*© ${settings.botName}*`;

        const ctx = await adContext({
            title: `SYSTEM STATUS: ${settings.botName}`,
            body: `Uptime: ${uptimeString} | RAM: ${ramUsage}MB`,
        });

        await sock.sendMessage(m.chat, { 
            text: info,
            contextInfo: ctx
        }, { quoted: m });
    }
};
