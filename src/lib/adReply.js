import Jimp from "jimp";
import path from "path";

// Penampung cache biar nggak download/resize terus-menerus
const cache = new Map();

/**
 * Membuat buffer gambar yang sudah di-resize untuk thumbnail WA (Banner Style)
 * @param {string} source - URL atau Path gambar
 */
const getThumbnailBuffer = async (source) => {
    if (cache.has(source)) return cache.get(source);
    try {
        const image = await Jimp.read(source);
        // Menggunakan .cover agar gambar memenuhi area 480x270 tanpa distorsi (crop tengah)
        const buffer = await image.cover(480, 270).getBufferAsync("image/jpeg");
        cache.set(source, buffer);
        return buffer;
    } catch (e) {
        console.error("[AdReply Error]", e.message);
        return Buffer.alloc(0);
    }
};

/**
 * Menghasilkan object contextInfo untuk externalAdReply tanpa link
 * @param {object} options - { title, body, thumbnail }
 */
export const adContext = async ({ title = "", body = "", thumbnail = "" } = {}) => {
    // Jika thumbnail kosong, gunakan maskot.jpeg sebagai default
    const imgSource = thumbnail || path.join(process.cwd(), "maskot.jpeg");
    const thumbBuffer = await getThumbnailBuffer(imgSource);
    
    return {
        externalAdReply: {
            title: title,
            body: body,
            mediaType: 1,
            renderLargerThumbnail: true,
            thumbnail: thumbBuffer,
            sourceUrl: "", 
            showAdAttribution: false 
        }
    };
};
