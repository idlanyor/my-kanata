import axios from 'axios';
import FormData from 'form-data';
import { settings } from '../../config/settings.js';

export default {
    name: 'tourl',
    aliases: ['upload', 'toimageurl'],
    description: 'Upload media (image, video, audio, sticker) to get a public URL',
    category: 'Tools',
    execute: async (sock, m, args) => {
        try {
            const quoted = m.quoted ? m.quoted : m;
            const msg = quoted.msg || quoted;
            const mime = msg.mimetype || '';
            
            if (!mime) {
                return m.reply(`Reply to an image, video, audio, or sticker with *${settings.prefix}tourl*`);
            }

            await m.reply('Uploading media, please wait...');

            const buffer = await quoted.downloadMediaMessage();
            
            const formData = new FormData();
            // Extension mapping
            const ext = mime.split('/')[1]?.split(';')[0] || 'bin';
            const filename = `file_${Date.now()}.${ext}`;
            
            formData.append('file', buffer, { 
                filename, 
                contentType: mime 
            });

            const response = await axios.post('https://api.kanata.web.id/upload', formData, {
                headers: {
                    ...formData.getHeaders(),
                    'accept': 'application/json'
                }
            });

            if (response.data && response.data.url) {
                const { url, filename, content_type, original_filename } = response.data;
                const caption = ` *Upload Success*\n\n` +
                                ` *URL:* ${url}\n` +
                                ` *File Name:* ${original_filename || filename}\n` +
                                ` *Mime Type:* ${content_type}`;
                
                await m.reply(caption);
            } else {
                throw new Error('Failed to get URL from response');
            }

        } catch (error) {
            console.error('Error in tourl command:', error);
            await m.reply(' Failed to upload media. Please try again later.');
        }
    }
};
