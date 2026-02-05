import { proto, prepareWAMessageMedia, generateWAMessageFromContent } from '@whiskeysockets/baileys';
import ytSearch from 'yt-search';

export default {
    name: 'yts',
    aliases: ['ytsearch'],
    description: 'Cari Video dari YouTube dengan tampilan Carousel',
    category: 'Downloader',
    execute: async (sock, m, args, text) => {
        if (!text) return m.reply(`Mau cari apa?
Ketik *yts <query>*
Contoh: *yts himawari*`);

        await sock.sendMessage(m.chat, { react: { text: '', key: m.key } });

        try {
            const search = await ytSearch(text);
            const results = search.videos.slice(0, 10); // Ambil 10 hasil teratas

            if (results.length === 0) {
                return m.reply(' Tidak ada hasil ditemukan.');
            }

            const cards = await Promise.all(results.map(async (video) => {
                const media = await prepareWAMessageMedia({ image: { url: video.thumbnail } }, { upload: sock.waUploadToServer });
                
                return {
                    body: proto.Message.InteractiveMessage.Body.fromObject({
                        text: `*Duration:* ${video.timestamp}
*Views:* ${video.views}
*Uploaded:* ${video.ago}`
                    }),
                    footer: proto.Message.InteractiveMessage.Footer.fromObject({
                        text: `© ${video.author.name}`
                    }),
                    header: proto.Message.InteractiveMessage.Header.fromObject({
                        title: `*${video.title}*`,
                        hasMediaAttachment: true,
                        ...media
                    }),
                    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                        buttons: [
                            {
                                name: "quick_reply",
                                buttonParamsJson: JSON.stringify({
                                    display_text: " Video HD",
                                    id: `.ytmp4 ${video.url}`
                                })
                            },
                            {
                                name: "quick_reply",
                                buttonParamsJson: JSON.stringify({
                                    display_text: " Audio",
                                    id: `.ytmp3 ${video.url}`
                                })
                            },
                            {
                                name: "cta_url",
                                buttonParamsJson: JSON.stringify({
                                    display_text: " Tonton di YT",
                                    url: video.url,
                                    merchant_url: video.url
                                })
                            }
                        ]
                    })
                };
            }));

            const message = generateWAMessageFromContent(m.chat, {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: {
                            deviceListMetadata: {},
                            deviceListMetadataVersion: 2
                        },
                        interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                            body: proto.Message.InteractiveMessage.Body.fromObject({
                                text: ` *YouTube Search Result*

Query: _${text}_`
                            }),
                            footer: proto.Message.InteractiveMessage.Footer.fromObject({
                                text: 'Geser kartu untuk melihat hasil lainnya'
                            }),
                            header: proto.Message.InteractiveMessage.Header.fromObject({
                                hasMediaAttachment: false
                            }),
                            carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({
                                cards
                            })
                        })
                    }
                }
            }, { quoted: m });

            await sock.relayMessage(m.chat, message.message, { messageId: message.key.id });
            await sock.sendMessage(m.chat, { react: { text: '', key: m.key } });

        } catch (err) {
            console.error('[ERROR] yts carousel failed:', err);
            await sock.sendMessage(m.chat, { react: { text: '', key: m.key } });
            m.reply(` Terjadi kesalahan: ${err.message}`);
        }
    }
};
