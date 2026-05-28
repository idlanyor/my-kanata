import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

const execPromise = promisify(exec);

export default {
    name: 'gitclone',
    aliases: ['git', 'github'],
    description: 'Clone a GitHub repository and send it as a ZIP file',
    category: 'Downloader',
    execute: async (sock, m, args, text) => {
        if (!args[0]) {
            return m.reply(`Usage: .gitclone <github_url>
Example: .gitclone https://github.com/user/repo`);
        }

        const url = args[0];
        const githubRegex = /(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/\s#?]+)/;
        const match = url.match(githubRegex);

        if (!match) {
            return m.reply(' URL GitHub tidak valid.');
        }

        const user = match[1];
        const repo = match[2].replace(/\.git$/, '');
        const tempDir = path.resolve(`./temp_git_${Date.now()}`);
        const zipPath = path.resolve(`./${repo}.zip`);

        try {
            await m.react('⏳');

            // Clone repo
            await execPromise(`git clone --depth 1 ${url} ${tempDir}`);

            // Remove .git directory to save space/privacy
            const gitFolder = path.join(tempDir, '.git');
            if (fs.existsSync(gitFolder)) {
                await execPromise(`rm -rf ${gitFolder}`);
            }

            // Zip the folder
            const zip = new AdmZip();
            zip.addLocalFolder(tempDir);
            zip.writeZip(zipPath);

            // Send ZIP
            await sock.sendMessage(
                m.chat,
                {
                    document: fs.readFileSync(zipPath),
                    mimetype: 'application/zip',
                    fileName: `${repo}.zip`,
                    caption: ` *Repository:* ${user}/${repo}
 *Source:* ${url}`,
                },
                { quoted: m }
            );
            await m.react('✅');
        } catch (error) {
            console.error('GitClone Error:', error);
            await m.react('❌');
            await m.reply(` Gagal meng-clone repository: ${error.message}`);
        } finally {
            // Cleanup
            if (fs.existsSync(tempDir)) {
                await execPromise(`rm -rf ${tempDir}`);
            }
            if (fs.existsSync(zipPath)) {
                fs.unlinkSync(zipPath);
            }
        }
    },
};
