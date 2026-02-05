import os from 'os';
import { settings } from '../../config/settings.js';
import axios from 'axios';

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
                const sysUptimeString = `${sysDays}h ${sysHours}j ${sysMinutes}m`;

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
                info += `➛ *Memory Usage:* ${ramUsage} MB\n`; info += `➛ *Total RAM:* ${totalRam} GB\n`;
                info += `➛ *Free RAM:* ${freeRam} GB\n`;
                info += `➛ *CPU:* ${os.cpus()[0].model} (${os.cpus().length} Cores)\n\n`;
                info += `*© ${settings.botName}*`;

                // Ambil PP Bot sebagai Buffer (Banner)
                const ppUrl = await sock.profilePictureUrl(sock.user.id, 'image').catch(() => null);
                let ppBuffer = null;
                if (ppUrl) {
                        try {
                                const res = await axios.get(ppUrl, { responseType: 'arraybuffer' });
                                ppBuffer = Buffer.from(res.data);
                        } catch (e) {
                                console.error('Failed to fetch PP buffer', e.message);
                        }
                }

                await m.reply(info, {
                        contextInfo: {
                                externalAdReply: {
                                        title: `SYSTEM STATUS: ${settings.botName}`,
                                        body: `Uptime: ${uptimeString}`,
                                        mediaType: 1,
                                        thumbnail: ppBuffer,
                                        sourceUrl: 'https://api.kanata.web.id',
                                        renderLargerThumbnail: true
                                },
                                stanzaId: 'VERIFIED',
                                participant: '0@s.whatsapp.net',
                                quotedMessage: {
                                        conversation: 'Kanata Bot Official'
                                }
                        },
                });
        }
};