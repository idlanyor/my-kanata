import http from 'http';
import crypto from 'crypto';
import logger from './logger.js';

const DEFAULT_PORT = 8787;
const MAX_BODY_BYTES = 256 * 1024;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 60;

const rateStore = new Map();

const readJsonBody = (req) => new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    req.on('data', (chunk) => {
        size += chunk.length;
        if (size > MAX_BODY_BYTES) {
            reject(new Error('Payload too large'));
            req.destroy();
            return;
        }
        body += chunk;
    });
    req.on('end', () => {
        if (!body) return resolve({});
        try {
            resolve(JSON.parse(body));
        } catch {
            reject(new Error('Invalid JSON body'));
        }
    });
    req.on('error', reject);
});

const respond = (res, statusCode, payload) => {
    res.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(payload));
};

const getClientIp = (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
        return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress || 'unknown';
};

const normalizeJid = (to) => {
    if (!to || typeof to !== 'string') return null;
    const trimmed = to.trim();
    if (!trimmed) return null;
    if (trimmed.includes('@')) return trimmed;
    const digits = trimmed.replace(/\D/g, '');
    if (!digits) return null;
    return `${digits}@s.whatsapp.net`;
};

const decodeBase64Data = (value) => {
    if (typeof value !== 'string' || !value.trim()) return null;
    const raw = value.includes(',') ? value.split(',').pop() : value;
    try {
        return Buffer.from(raw, 'base64');
    } catch {
        return null;
    }
};

const validateToken = (incoming, expected) => {
    if (!incoming || !expected) return false;
    const a = Buffer.from(incoming);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
};

const checkRateLimit = (key) => {
    const now = Date.now();
    const current = rateStore.get(key);
    if (!current || now > current.resetAt) {
        rateStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return true;
    }
    if (current.count >= RATE_LIMIT_MAX) return false;
    current.count += 1;
    return true;
};

export const startWebhookApi = ({ getSocket }) => {
    const port = Number(process.env.BOT_WEBHOOK_PORT || DEFAULT_PORT);
    const token = process.env.BOT_WEBHOOK_TOKEN;
    const allowList = (process.env.BOT_WEBHOOK_ALLOWLIST || '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);

    if (!token) {
        logger.warn('BOT_WEBHOOK_TOKEN is not set, webhook API will not start', 'WEBHOOK');
        return null;
    }

    const server = http.createServer(async (req, res) => {
        const url = req.url || '/';
        const method = req.method || 'GET';

        if (method === 'GET' && url === '/health') {
            return respond(res, 200, { ok: true, service: 'webhook-api' });
        }

        const isSendText = method === 'POST' && url === '/api/webhook/send-text';
        const isSendDocument = method === 'POST' && url === '/api/webhook/send-document';
        if (!isSendText && !isSendDocument) {
            return respond(res, 404, { ok: false, error: 'Not found' });
        }

        const ip = getClientIp(req);
        if (allowList.length > 0 && !allowList.includes(ip)) {
            return respond(res, 403, { ok: false, error: 'IP not allowed' });
        }

        const authHeader = req.headers.authorization || '';
        const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
        if (!validateToken(bearer, token)) {
            return respond(res, 401, { ok: false, error: 'Unauthorized' });
        }

        if (!checkRateLimit(`${ip}:${bearer}`)) {
            return respond(res, 429, { ok: false, error: 'Too many requests' });
        }

        try {
            const body = await readJsonBody(req);
            const sock = getSocket();
            if (!sock) {
                return respond(res, 503, { ok: false, error: 'Bot socket unavailable' });
            }

            const to = normalizeJid(body.to);
            if (!to) {
                return respond(res, 400, { ok: false, error: 'Invalid payload. Required: to' });
            }

            let result;
            if (isSendText) {
                const text = typeof body.text === 'string' ? body.text.trim() : '';
                if (!text) {
                    return respond(res, 400, { ok: false, error: 'Invalid payload. Required: text' });
                }
                result = await sock.sendMessage(to, { text });
            } else {
                const documentBuffer = decodeBase64Data(body.data);
                const fileName = typeof body.fileName === 'string' && body.fileName.trim() ? body.fileName.trim() : 'document.pdf';
                const mimetype = typeof body.mimetype === 'string' && body.mimetype.trim() ? body.mimetype.trim() : 'application/pdf';
                const caption = typeof body.caption === 'string' ? body.caption : '';

                if (!documentBuffer || documentBuffer.length === 0) {
                    return respond(res, 400, { ok: false, error: 'Invalid payload. Required: base64 data' });
                }

                result = await sock.sendMessage(to, {
                    document: documentBuffer,
                    mimetype,
                    fileName,
                    caption
                });
            }

            return respond(res, 200, {
                ok: true,
                data: { to, messageId: result?.key?.id || null }
            });
        } catch (err) {
            const status = err.message === 'Payload too large' || err.message === 'Invalid JSON body' ? 400 : 500;
            return respond(res, status, { ok: false, error: err.message || 'Failed to send message' });
        }
    });

    server.listen(port, () => {
        logger.success(`Webhook API listening on :${port}`, 'WEBHOOK');
    });

    server.on('error', (err) => {
        logger.error(`Webhook API error: ${err.message}`, 'WEBHOOK');
    });

    return server;
};
