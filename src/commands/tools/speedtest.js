import { exec } from 'child_process';
import { promisify } from 'util';
import { performance } from 'perf_hooks';

const execAsync = promisify(exec);
const CLI_TIMEOUT_MS = 120000;
const HTTP_TIMEOUT_MS = 30000;

const formatMbps = (value) => {
    if (!Number.isFinite(value)) return '-';
    return `${value.toFixed(2)} Mbps`;
};

const formatMs = (value) => {
    if (!Number.isFinite(value)) return '-';
    return `${value.toFixed(2)} ms`;
};

const runCliSpeedtest = async () => {
    const commands = ['speedtest --accept-license --accept-gdpr -f json', 'speedtest-cli --json'];

    for (const command of commands) {
        try {
            const { stdout } = await execAsync(command, {
                timeout: CLI_TIMEOUT_MS,
                maxBuffer: 1024 * 1024,
            });
            const raw = stdout?.trim();
            if (!raw) continue;

            const data = JSON.parse(raw);

            if (command.startsWith('speedtest ')) {
                return {
                    source: 'Ookla CLI',
                    ping: Number(data?.ping?.latency),
                    download: (Number(data?.download?.bandwidth) * 8) / 1_000_000,
                    upload: (Number(data?.upload?.bandwidth) * 8) / 1_000_000,
                    serverName: data?.server?.name || null,
                    isp: data?.isp || null,
                };
            }

            return {
                source: 'speedtest-cli',
                ping: Number(data?.ping),
                download: Number(data?.download) / 1_000_000,
                upload: Number(data?.upload) / 1_000_000,
                serverName: data?.server || null,
                isp: data?.client?.isp || null,
            };
        } catch (error) {
            continue;
        }
    }

    throw new Error('Speedtest CLI tidak tersedia');
};

const measureLatency = async (url) => {
    const start = performance.now();
    const response = await fetch(url, {
        method: 'HEAD',
        cache: 'no-store',
        signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
    });

    if (!response.ok) {
        throw new Error(`Latency check gagal (${response.status})`);
    }

    return performance.now() - start;
};

const measureDownload = async (url) => {
    const start = performance.now();
    const response = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
    });

    if (!response.ok) {
        throw new Error(`Download check gagal (${response.status})`);
    }

    const buffer = await response.arrayBuffer();
    const durationSeconds = (performance.now() - start) / 1000;

    if (durationSeconds <= 0) {
        throw new Error('Durasi download tidak valid');
    }

    return (buffer.byteLength * 8) / durationSeconds / 1_000_000;
};

const runFallbackSpeedtest = async () => {
    const latency = await measureLatency('https://www.google.com/generate_204');
    const download = await measureDownload('https://speed.cloudflare.com/__down?bytes=25000000');

    return {
        source: 'HTTP fallback',
        ping: latency,
        download,
        upload: null,
        serverName: 'Cloudflare',
        isp: null,
    };
};

const buildMessage = (result, fallbackUsed = false) => {
    const lines = [
        '*SPEEDTEST SERVER*',
        '',
        `• Ping: ${formatMs(result.ping)}`,
        `• Download: ${formatMbps(result.download)}`,
        `• Upload: ${result.upload == null ? '-' : formatMbps(result.upload)}`,
        `• Metode: ${result.source}`,
    ];

    if (result.serverName) lines.push(`• Server: ${result.serverName}`);
    if (result.isp) lines.push(`• ISP: ${result.isp}`);
    if (fallbackUsed)
        lines.push('', '_Upload tidak tersedia karena CLI speedtest tidak ditemukan._');

    return lines.join('\n');
};

export default {
    name: 'speedtest',
    aliases: ['speed'],
    description: 'Tes kecepatan internet server bot.',
    category: 'Tools',
    execute: async (sock, m) => {
        await m.react('⏳');

        try {
            const cliResult = await runCliSpeedtest();
            await sock.sendMessage(m.chat, { text: buildMessage(cliResult) }, { quoted: m });
            await m.react('✅');
        } catch (cliError) {
            try {
                const fallbackResult = await runFallbackSpeedtest();
                await sock.sendMessage(
                    m.chat,
                    { text: buildMessage(fallbackResult, true) },
                    { quoted: m }
                );
                await m.react('✅');
            } catch (fallbackError) {
                console.error('Speedtest failed:', {
                    cliError: cliError.message,
                    fallbackError: fallbackError.message,
                });
                await m.react('❌');
                await m.reply(
                    `Speedtest gagal dijalankan.\n\nCLI: ${cliError.message}\nFallback: ${fallbackError.message}`
                );
            }
        }
    },
};
