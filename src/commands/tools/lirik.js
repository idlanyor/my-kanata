import axios from 'axios';

const lrclib = axios.create({
    baseURL: 'https://lrclib.net/api',
    timeout: 30000,
    headers: {
        'User-Agent': 'mybot/1.0 (lyrics lookup via LRCLIB)'
    }
});

const MAX_MESSAGE_LENGTH = 3500;

const formatDuration = (durationSeconds) => {
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return '-';
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = Math.floor(durationSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const chunkText = (text, maxLength = MAX_MESSAGE_LENGTH) => {
    const chunks = [];
    let remaining = text.trim();

    while (remaining.length > maxLength) {
        let sliceIndex = remaining.lastIndexOf('\n', maxLength);
        if (sliceIndex < maxLength * 0.5) sliceIndex = maxLength;
        chunks.push(remaining.slice(0, sliceIndex).trim());
        remaining = remaining.slice(sliceIndex).trim();
    }

    if (remaining) chunks.push(remaining);
    return chunks;
};

const buildHeader = (song, note = '') => {
    const lines = [
        '*LIRIK DITEMUKAN*',
        '',
        `• Judul: ${song.trackName || song.name || '-'}`,
        `• Artis: ${song.artistName || '-'}`,
        `• Album: ${song.albumName || '-'}`,
        `• Durasi: ${formatDuration(Number(song.duration))}`,
        `• Instrumental: ${song.instrumental ? 'Ya' : 'Tidak'}`
    ];

    if (note) lines.push(`• Info: ${note}`);
    return lines.join('\n');
};

const parseInput = (text = '') => {
    const trimmed = text.trim();
    if (!trimmed) return null;

    if (trimmed.includes('|')) {
        const [trackName, artistName] = trimmed.split('|').map(part => part.trim());
        if (trackName && artistName) {
            return { mode: 'exact', trackName, artistName };
        }
    }

    return { mode: 'search', query: trimmed };
};

const getExactLyrics = async ({ trackName, artistName }) => {
    const { data } = await lrclib.get('/get', {
        params: {
            track_name: trackName,
            artist_name: artistName
        }
    });

    return data;
};

const searchLyrics = async (query) => {
    const { data } = await lrclib.get('/search', {
        params: { q: query }
    });

    return Array.isArray(data) ? data : [];
};

export default {
    name: 'lirik',
    aliases: ['lyrics', 'lyric'],
    description: 'Cari lirik lagu dari LRCLIB.',
    category: 'Tools',
    execute: async (sock, m, args, text) => {
        const fallbackText = m.quoted?.text || m.quoted?.message?.conversation || '';
        const rawInput = text?.trim() || fallbackText.trim();

        if (!rawInput) {
            return m.reply(
                '*PENCARI LIRIK*\n\n' +
                'Gunakan:\n' +
                '• .lirik <judul atau potongan lirik>\n' +
                '• .lirik <judul> | <artis>\n\n' +
                'Contoh:\n' +
                '• .lirik bohemian rhapsody\n' +
                '• .lirik bohemian rhapsody | queen'
            );
        }

        await m.react('⏳');

        try {
            const input = parseInput(rawInput);
            let song = null;
            let note = '';

            if (input?.mode === 'exact') {
                try {
                    song = await getExactLyrics(input);
                    note = 'Pencocokan presisi berdasarkan judul + artis';
                } catch (error) {
                    if (error.response?.status !== 404) throw error;
                    const searchResults = await searchLyrics(`${input.trackName} ${input.artistName}`);
                    song = searchResults[0] || null;
                    note = 'Hasil presisi tidak ketemu, menampilkan hasil pencarian terdekat';
                }
            } else {
                const searchResults = await searchLyrics(input.query);
                song = searchResults[0] || null;
                if (searchResults.length > 1) {
                    note = `Ditemukan ${searchResults.length} hasil, menampilkan yang paling relevan`;
                }
            }

            if (!song) {
                await m.react('❌');
                return m.reply(`Lirik tidak ditemukan untuk: ${rawInput}`);
            }

            const lyrics = song.plainLyrics || song.syncedLyrics;
            if (!lyrics) {
                await m.react('❌');
                return m.reply('Data lagu ditemukan, tapi lirik belum tersedia di LRCLIB.');
            }

            const header = buildHeader(song, note);
            const lyricChunks = chunkText(lyrics);

            await m.reply(header);

            for (let index = 0; index < lyricChunks.length; index += 1) {
                const prefix = lyricChunks.length > 1 ? `*LIRIK (${index + 1}/${lyricChunks.length})*\n\n` : '*LIRIK*\n\n';
                await m.reply(prefix + lyricChunks[index]);
            }
            await m.react('✅');
        } catch (error) {
            console.error('Lirik command error:', error.response?.data || error.message);

            if (error.response?.status === 404) {
                await m.react('❌');
                return m.reply(`Lirik tidak ditemukan untuk: ${rawInput}`);
            }

            if (error.response?.status === 429) {
                await m.react('❌');
                return m.reply('LRCLIB sedang membatasi request. Coba lagi beberapa saat.');
            }

            await m.react('❌');
            return m.reply(`Gagal mencari lirik: ${error.message}`);
        }
    }
};
