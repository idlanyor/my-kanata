import crypto from 'crypto';
import { config } from '../config/index.js';
import { getRolePermissions } from '../config/rbac.js';
import mongoose from 'mongoose';
import { logAction } from '../services/auditService.js';
import { AuthIdentity } from '../models/AuthIdentity.js';
import { verifyPassword } from '../services/passwordService.js';

const buildCredentialCandidates = (raw = '') => {
  const trimmed = raw.trim();
  const candidates = new Set([trimmed]);

  const digits = trimmed.replace(/\D/g, '');
  if (digits) {
    const variants = new Set([digits]);
    if (digits.startsWith('0')) variants.add(`62${digits.slice(1)}`);
    if (digits.startsWith('8')) variants.add(`62${digits}`);
    if (digits.startsWith('62')) variants.add(`0${digits.slice(2)}`);

    for (const n of variants) {
      candidates.add(n);
      candidates.add(`${n}@s.whatsapp.net`);
      candidates.add(`${n}@c.us`);
      candidates.add(`${n}@lid`);
    }
  }

  return [...candidates];
};

const setSessionCookie = (res, sid) => {
  const parts = [
    `sid=${encodeURIComponent(sid)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${Math.floor(config.sessionTtlMs / 1000)}`
  ];
  if (config.isProd) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
};

const clearSessionCookie = (res) => {
  const parts = ['sid=', 'Path=/', 'HttpOnly', 'SameSite=Strict', 'Max-Age=0'];
  if (config.isProd) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
};

export const login = async (req, res, next) => {
  try {
    const credential = (req.body?.credential || req.body?.accessKey || '').trim();
    const password = (req.body?.password || '').trim();
    if (!credential || !password) {
      return res.status(401).json({ error: 'Credential salah' });
    }

    const escaped = credential.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const candidates = buildCredentialCandidates(credential);
    const identity = await AuthIdentity.findOne({
      active: true,
      $or: [
        { jid: { $in: candidates } },
        { lid: { $in: candidates } },
        { name: { $regex: `^${escaped}$`, $options: 'i' } }
      ]
    });

    if (!identity) return res.status(401).json({ error: 'Credential salah' });
    if (!identity.passwordSalt || !identity.passwordHash) {
      return res.status(401).json({ error: 'Credential belum terinisialisasi' });
    }
    const passOk = await verifyPassword(password, identity.passwordSalt, identity.passwordHash);
    if (!passOk) return res.status(401).json({ error: 'Credential salah' });
    const role = identity.role || 'viewer';

    const sid = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + config.sessionTtlMs);
    
    const sessionData = { 
        sid, 
        createdAt: now, 
        expiresAt,
        role,
        jid: identity.jid || identity.lid || `${role}@system`
    };

    const sessionStore = mongoose.connection.db.collection(config.sessionCollection);
    await sessionStore.insertOne(sessionData);
    console.log(`[Login] Session saved: ${sid.slice(0, 8)}... for ${sessionData.jid}`);
    
    setSessionCookie(res, sid);
    
    // Attach session to req temporarily for logAction
    req.session = sessionData;
    await logAction({ req, action: 'LOGIN', details: { success: true } });
    await AuthIdentity.updateOne({ _id: identity._id }, { $set: { lastLoginAt: now } });

    return res.json({ ok: true, role });
  } catch (error) {
    return next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    if (req.session?.sid) {
        const sessionStore = mongoose.connection.db.collection(config.sessionCollection);
        await sessionStore.deleteOne({ sid: req.session.sid });
    }
    clearSessionCookie(res);
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
};

export const me = (req, res) => {
  const role = req.session.role || 'viewer';
  res.json({ 
      authenticated: true, 
      role,
      permissions: getRolePermissions(role),
      jid: req.session.jid
  });
};
