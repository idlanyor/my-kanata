import axios from 'axios';
import logger from '../../utils/logger.js';

export default {
    name: 'get',
    aliases: ['get'],
    description: 'Make a GET request to a URL',
    category: 'Tools',
    execute: async (sock, m, args, text) => {
        if (!text) return m.reply('Please provide a URL.');

        let url = text.trim();
        if (!url.startsWith('http')) url = 'https://' + url;

        await m.react('⏳');

        try {
            const response = await axios.get(url, {
                timeout: 30000, // Increased timeout for media
                responseType: 'arraybuffer',
            });

            const contentType = response.headers['content-type'] || '';
            const buffer = response.data;

            logger.info(`[DEBUG] GET ${url} - Type: ${contentType} - Size: ${buffer.length}`);

            if (contentType.includes('image')) {
                await sock.sendMessage(
                    m.chat,
                    { image: buffer, caption: `Status: ${response.status} ${response.statusText}` },
                    { quoted: m }
                );
            } else if (contentType.includes('video')) {
                await sock.sendMessage(
                    m.chat,
                    {
                        video: buffer,
                        caption: `Status: ${response.status} ${response.statusText}`,
                        mimetype: contentType,
                    },
                    { quoted: m }
                );
            } else if (contentType.includes('audio')) {
                await sock.sendMessage(
                    m.chat,
                    { audio: buffer, mimetype: contentType },
                    { quoted: m }
                );
            } else if (contentType.includes('application/json') || contentType.includes('text')) {
                const textData = buffer.toString('utf-8');
                let result = textData;
                try {
                    const json = JSON.parse(textData);
                    result = JSON.stringify(json, null, 2);
                } catch (e) {
                    result = textData;
                }
                try {
                    await m.reply(` *Response:* \n${result}`);
                } catch (sendErr) {
                    await sock.sendMessage(
                        m.chat,
                        {
                            document: Buffer.from(result, 'utf-8'),
                            mimetype: 'text/plain',
                            fileName: 'get-response.txt',
                            caption: `Status: ${response.status} ${response.statusText}`,
                        },
                        { quoted: m }
                    );
                }
            } else {
                // Send as document for other types
                const ext = contentType.split('/')[1]?.split(';')[0] || 'bin';
                await sock.sendMessage(
                    m.chat,
                    {
                        document: buffer,
                        mimetype: contentType,
                        fileName: `response.${ext}`,
                        caption: `Status: ${response.status} ${response.statusText}`,
                    },
                    { quoted: m }
                );
            }
            await m.react('✅');
        } catch (err) {
            logger.error(`[DEBUG] GET request failed:`, err.message);
            await m.react('❌');
            await m.reply(` *Error:* ${err.message}`);
        }
    },
};
