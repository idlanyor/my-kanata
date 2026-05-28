import { Sticker, StickerTypes } from 'wa-sticker-formatter';
import { settings } from '../../config/settings.js';
import { createCanvas } from 'canvas';

// Helper to wrap text (reused logic)
function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    let lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + ' ' + word).width;
        if (width < maxWidth) {
            currentLine += ' ' + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
}

export default {
    name: 'brat',
    aliases: ['bratstiker'],
    description: 'Create a brat style sticker (Local)',
    category: 'Sticker',
    execute: async (sock, m, args, text) => {
        if (!text) {
            return m.reply(`Example: ${settings.prefix}brat hello world`);
        }

        try {
            await m.react('⏳');

            // 1. Create Canvas
            const size = 512;
            const canvas = createCanvas(size, size);
            const ctx = canvas.getContext('2d');

            // Background: White
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, size, size);

            // Text Config
            ctx.fillStyle = 'black';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';

            // Auto-fit Font Size Logic
            let fontSize = 100; // Start big
            let lines = [];
            const padding = 60;
            const maxWidth = size - padding * 2;

            do {
                ctx.font = `${fontSize}px sans-serif`;
                lines = wrapText(ctx, text, maxWidth);

                const lineHeight = fontSize * 1.1;
                const totalHeight = lines.length * lineHeight;

                if (totalHeight < size - padding) {
                    break;
                }

                fontSize -= 5;
            } while (fontSize > 10);

            ctx.font = `${fontSize}px sans-serif`;
            const lineHeight = fontSize * 1.1;
            const totalHeight = lines.length * lineHeight;
            let startY = (size - totalHeight) / 2 + lineHeight / 2;

            // Draw Text (Left Aligned)
            lines.forEach((line, i) => {
                ctx.fillText(line, padding, startY + i * lineHeight);
            });

            // 2. Convert to Buffer
            const buffer = canvas.toBuffer('image/png');

            // 3. Create Sticker
            const sticker = new Sticker(buffer, {
                pack: settings.botName,
                author: m.pushName || 'User',
                type: StickerTypes.FULL,
                categories: [],
                id: 'brat',
                quality: 70,
            });

            const stickerBuffer = await sticker.toBuffer();
            await sock.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: m });
            await m.react('✅');
        } catch (error) {
            console.error('Error creating local brat sticker:', error);
            await m.react('❌');
            await m.reply('Failed to create brat sticker locally.');
        }
    },
};
