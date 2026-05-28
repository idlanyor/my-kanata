import fs from 'fs';
import { glob } from 'glob';
import path from 'path';

export default {
    name: 'getplugin',
    aliases: ['gp'],
    category: 'Owner',
    description: 'Get content of a plugin file',
    execute: async (sock, m, args, text) => {
        if (!text) return m.reply('Please provide a plugin name.');

        const commandsDir = path.join(process.cwd(), 'src/commands');

        let query = text.trim();
        // Remove .js if present to standardize
        if (query.endsWith('.js')) query = query.slice(0, -3);

        // Construct pattern: search for query.js in any subdirectory of src/commands
        // If query is "menu", pattern is "**/menu.js"
        // If query is "general/menu", pattern is "**/general/menu.js"
        const pattern = `**/${query}.js`;

        try {
            const files = await glob(pattern, { cwd: commandsDir, absolute: true });

            if (files.length === 0) {
                return m.reply(`Plugin '${text}' not found.`);
            }

            // Just pick the first match
            const fileToRead = files[0];
            const content = fs.readFileSync(fileToRead, 'utf8');

            const tokenizeCode = (codeStr) => {
                const lines = codeStr.split('\n');
                const blocks = [];
                const jsKeywords = new Set([
                    'import',
                    'export',
                    'default',
                    'const',
                    'let',
                    'var',
                    'async',
                    'await',
                    'if',
                    'else',
                    'return',
                    'try',
                    'catch',
                    'for',
                    'while',
                    'switch',
                    'case',
                    'break',
                    'continue',
                    'function',
                    'class',
                    'extends',
                    'new',
                    'this',
                    'super',
                    'true',
                    'false',
                    'null',
                    'undefined',
                ]);

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    const nl = i === lines.length - 1 ? '' : '\n';

                    if (!line.trim()) {
                        blocks.push({ highlightType: 0, codeContent: line + nl });
                        continue;
                    }

                    if (line.trim().startsWith('//') || line.trim().startsWith('/*')) {
                        blocks.push({ highlightType: 5, codeContent: line + nl });
                        continue;
                    }

                    const regex =
                        /(\/\/.*$|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*')|(`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|(\b[a-zA-Z_$][\w$]*\b)|([^\s\w$\"'`]+)|(\s+)/g;
                    let match;
                    while ((match = regex.exec(line)) !== null) {
                        const val = match[0];
                        if (match[1]) blocks.push({ highlightType: 5, codeContent: val });
                        else if (match[2] || match[3] || match[4])
                            blocks.push({ highlightType: 3, codeContent: val });
                        else if (match[5]) blocks.push({ highlightType: 4, codeContent: val });
                        else if (match[6]) {
                            if (jsKeywords.has(val))
                                blocks.push({ highlightType: 1, codeContent: val });
                            else {
                                const after = line.slice(regex.lastIndex).trimStart();
                                if (after.startsWith('('))
                                    blocks.push({ highlightType: 2, codeContent: val });
                                else blocks.push({ highlightType: 0, codeContent: val });
                            }
                        } else blocks.push({ highlightType: 0, codeContent: val });
                    }
                    blocks[blocks.length - 1].codeContent += nl;
                }
                return blocks;
            };

            const msg = {
                botForwardedMessage: {
                    message: {
                        richResponseMessage: {
                            messageType: 1,
                            submessages: [
                                {
                                    messageType: 2,
                                    messageText: `📄 *PLUGIN:* ${path.basename(fileToRead)}`,
                                },
                                {
                                    messageType: 5,
                                    codeMetadata: {
                                        codeLanguage: 'javascript',
                                        codeBlocks: tokenizeCode(content),
                                    },
                                },
                            ],
                            contextInfo: {
                                forwardingScore: 999,
                                isForwarded: true,
                                forwardedAiBotMessageInfo: { botJid: '867051314767696@bot' },
                                forwardOrigin: 4,
                                stanzaId: m.key.id,
                                participant: m.sender,
                                quotedMessage: m.message,
                            },
                        },
                    },
                },
            };

            await sock.relayMessage(m.chat, msg, { messageId: sock.generateMessageTag() });
        } catch (e) {
            console.error(e);
            m.reply(`Error: ${e.message}`);
        }
    },
};
