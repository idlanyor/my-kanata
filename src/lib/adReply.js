import sharp from 'sharp';
import path from 'path';

// Penampung cache biar nggak resize terus-menerus
const cache = new Map();

/**
 * Membuat buffer gambar yang sudah di-resize untuk thumbnail WA (Banner Style) menggunakan SHARP (Fast)
 * @param {string} source - URL atau Path gambar
 */
const getThumbnailBuffer = async (source) => {
    if (cache.has(source)) return cache.get(source);
    try {
        // Menggunakan sharp untuk performa maksimal
        const buffer = await sharp(source)
            .resize(480, 270, {
                fit: 'cover',
                position: 'center'
            })
            .jpeg({ quality: 80 })
            .toBuffer();
            
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
            thumbnail: thumbBuffer,
            renderLargerThumbnail: true,
            sourceUrl: "", 
            showAdAttribution: false 
        }
    };
};
