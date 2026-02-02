import { generateWAMessageFromContent, proto } from '@whiskeysockets/baileys';
import { settings } from '../../config/settings.js';

export default {
    name: 'testbutton',
    description: 'Experimental: Native Flow Buttons',
    category: 'Owner',
    execute: async (sock, m, args) => {
        const sender = m.sender;
        const isOwner = sender === settings.ownerNumber || sender === settings.ownerLid || sender.split(':')[0] === settings.ownerNumber.split('@')[0];
        if (!isOwner) return;

        await m.reply('Sending experimental native flow buttons...');

        try {
            const msg = generateWAMessageFromContent(m.chat, {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: {
                            deviceListMetadata: {},
                            deviceListMetadataVersion: 2
                        },
                        interactiveMessage: proto.Message.InteractiveMessage.create({
                            body: proto.Message.InteractiveMessage.Body.create({
                                text: "*Native Flow Buttons Test*\n\nIni adalah contoh tampilan tombol modern di WhatsApp."
                            }),
                            footer: proto.Message.InteractiveMessage.Footer.create({
                                text: "Powered by KanataBot"
                            }),
                            header: proto.Message.InteractiveMessage.Header.create({
                                title: "INTERACTIVE TEST",
                                subtitle: "Sub-judul di sini",
                                hasMediaAttachment: false
                            }),
                            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                                buttons: [
                                    {
                                        "name": "cta_url",
                                        "buttonParamsJson": JSON.stringify({
                                            "display_text": "Kunjungi Website",
                                            "url": "https://api.kanata.web.id",
                                            "merchant_url": "https://api.kanata.web.id"
                                        })
                                    },
                                    {
                                        "name": "quick_reply",
                                        "buttonParamsJson": JSON.stringify({
                                            "display_text": "Tes Is Owner",
                                            "id": ".testowner"
                                        })
                                    },
                                    {
                                        "name": "single_select_reply",
                                        "buttonParamsJson": JSON.stringify({
                                            "title": "Pilih Menu",
                                            "sections": [
                                                {
                                                    "title": "Kategori AI",
                                                    "rows": [
                                                        {
                                                            "title": "Gemini AI",
                                                            "id": ".ai halo",
                                                            "description": "Chat dengan Gemini 2.5 Flash"
                                                        }
                                                    ]
                                                }
                                            ]
                                        })
                                    }
                                ],
                            })
                        })
                    }
                }
            }, { quoted: m });

            await sock.relayMessage(m.chat, msg.message, { 
                messageId: msg.key.id,
                additionalNodes: [
                    {
                        tag: 'biz',
                        attrs: {},
                        content: [
                            {
                                tag: 'interactive',
                                attrs: {
                                    type: 'native_flow',
                                    v: '1'
                                },
                                content: [
                                    {
                                        tag: 'native_flow',
                                        attrs: { v: '3', name: 'mixed' }
                                    }
                                ]
                            }
                        ]
                    }
                ]
            });

        } catch (error) {
            console.error('Button Error:', error);
            await m.reply(`Error: ${error.message}`);
        }
    }
};
