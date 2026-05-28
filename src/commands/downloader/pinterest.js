import axios from 'axios';
import { proto, prepareWAMessageMedia, generateWAMessageFromContent } from 'baileys';

/**
 * Pinterest Search using Ryzumi API
 * @param {string} query - Search term
 * @returns {Promise<Object[]>} - Array of objects containing link and directLink
 */
export const pinterest = async (query) => {
    try {
        const { data } = await axios.get(
            `https://api.ryzumi.net/api/search/pinterest?query=${encodeURIComponent(query)}`,
            {
                headers: { accept: 'application/json' },
            }
        );
        return data || [];
    } catch (err) {
        console.error('Pinterest API Error:', err.message);
        return [];
    }
};

export default {
    name: 'pinterest',
    aliases: ['pin', 'pinter'],
    description: 'Cari gambar dari Pinterest dengan tampilan Carousel',
    category: 'Downloader',
    execute: async (sock, m, args, text) => {
        if (!text)
            return m.reply(`Mau cari apa?
Ketik *pinterest <query>*
Contoh: *pinterest mirai kuriyama*`);

        await m.react('⏳');

        try {
            const results = await pinterest(text);
            const pins = results.slice(0, 10); // Ambil 10 hasil teratas

            if (pins.length === 0) {
                await m.react('❌');
                return m.reply(' Tidak ada hasil ditemukan.');
            }

            const cards = await Promise.all(
                pins.map(async (pin, i) => {
                    const media = await prepareWAMessageMedia(
                        { image: { url: pin.directLink } },
                        { upload: sock.waUploadToServer }
                    );

                    return {
                        body: proto.Message.InteractiveMessage.Body.fromObject({
                            text: `Pin hasil pencarian ke-${i + 1} untuk: ${text}`,
                        }),
                        footer: proto.Message.InteractiveMessage.Footer.fromObject({
                            text: `Pinterest via Kanata Bot`,
                        }),
                        header: proto.Message.InteractiveMessage.Header.fromObject({
                            title: `*Image Result ${i + 1}*`,
                            hasMediaAttachment: true,
                            ...media,
                        }),
                        nativeFlowMessage:
                            proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                                buttons: [
                                    {
                                        name: 'cta_url',
                                        buttonParamsJson: JSON.stringify({
                                            display_text: ' Buka di Web',
                                            url: pin.link,
                                            merchant_url: pin.link,
                                        }),
                                    },
                                ],
                            }),
                    };
                })
            );

            const message = generateWAMessageFromContent(
                m.chat,
                {
                    viewOnceMessage: {
                        message: {
                            messageContextInfo: {
                                deviceListMetadata: {},
                                deviceListMetadataVersion: 2,
                            },
                            interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                                body: proto.Message.InteractiveMessage.Body.fromObject({
                                    text: ` *Pinterest Search Results*

Query: _${text}_`,
                                }),
                                footer: proto.Message.InteractiveMessage.Footer.fromObject({
                                    text: 'Geser kartu untuk melihat hasil lainnya',
                                }),
                                header: proto.Message.InteractiveMessage.Header.fromObject({
                                    hasMediaAttachment: false,
                                }),
                                carouselMessage:
                                    proto.Message.InteractiveMessage.CarouselMessage.fromObject({
                                        cards,
                                    }),
                            }),
                        },
                    },
                },
                { quoted: m }
            );

            await sock.relayMessage(m.chat, message.message, { messageId: message.key.id });
            await m.react('✅');
        } catch (err) {
            console.error('[ERROR] pinterest carousel failed:', err);
            await m.react('❌');
            await m.reply(` Terjadi kesalahan: ${err.message}`);
        }
    },
};
