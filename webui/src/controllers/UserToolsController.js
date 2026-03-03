import crypto from 'crypto';
import { User } from '../models/User.js';
import * as pteroService from '../services/pteroService.js';
import { logAction } from '../services/auditService.js';

const normalizeJid = (jid = '') => {
  const trimmed = String(jid).trim();
  if (!trimmed) return '';
  return trimmed.includes('@') ? trimmed : `${trimmed}@s.whatsapp.net`;
};

const parsePteroError = (error) => {
  return error?.response?.data?.errors?.[0]?.detail || error?.message || 'Unknown error';
};

const findByExternalId = async (externalId) => {
  if (typeof pteroService.findPteroUserByExternalId === 'function') {
    return pteroService.findPteroUserByExternalId(externalId);
  }
  const users = await pteroService.listAllUsers();
  return users.find((u) => u.external_id === externalId) || null;
};

const findByEmail = async (email) => {
  if (typeof pteroService.findPteroUserByEmail === 'function') {
    return pteroService.findPteroUserByEmail(email);
  }
  const users = await pteroService.listAllUsers();
  return users.find((u) => String(u.email || '').toLowerCase() === String(email).toLowerCase()) || null;
};

const buildUsername = (name = '', jid = '') => {
  const seed = (name || `user${jid.split('@')[0].slice(-4)}`)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  return `${seed.slice(0, 12) || 'user'}${crypto.randomBytes(2).toString('hex')}`;
};

export const getUserProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dbUser = await User.findById(id).lean();
    if (!dbUser) return res.status(404).json({ error: 'User not found' });

    const pteroUser = await findByExternalId(dbUser.jid);

    res.json({
      dbUser,
      pteroUser: pteroUser || null,
      summary: {
        isBound: Boolean(pteroUser),
        balance: dbUser.balance || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

export const registerUserPanel = async (req, res, next) => {
  try {
    const jid = normalizeJid(req.body?.jid);
    const email = String(req.body?.email || '').trim().toLowerCase();
    const name = String(req.body?.name || '').trim();

    if (!jid || !email || !email.includes('@')) {
      return res.status(400).json({ error: 'jid and valid email are required' });
    }

    const existingByJid = await findByExternalId(jid);
    if (existingByJid) {
      return res.status(409).json({ error: `WhatsApp already registered to ${existingByJid.username} (${existingByJid.email})` });
    }

    const password = `${crypto.randomBytes(4).toString('hex')}Aa1!`;
    const created = await pteroService.createPteroUser({
      username: buildUsername(name, jid),
      email,
      firstName: name || 'WhatsApp',
      lastName: 'User',
      externalId: jid,
      password
    });

    const userDoc = await User.findOneAndUpdate(
      { jid },
      {
        $setOnInsert: { jid, createdAt: new Date() },
        $set: {
          name: name || created.first_name || '',
          emailCloud: created.email || email
        }
      },
      { upsert: true, returnDocument: 'after', runValidators: true }
    );

    await logAction({ req, action: 'REGISTER_USER_PANEL', details: { jid, email, pteroId: created.id } });

    res.status(201).json({
      ok: true,
      message: 'User registered successfully',
      credentials: {
        panelUrl: process.env.PTERO_URL,
        username: created.username,
        email: created.email,
        password
      },
      user: userDoc
    });
  } catch (error) {
    const detail = parsePteroError(error);
    if (detail.toLowerCase().includes('already exists')) {
      return res.status(409).json({ error: detail });
    }
    next(error);
  }
};

export const bindUserPanel = async (req, res, next) => {
  try {
    const jid = normalizeJid(req.body?.jid);
    const email = String(req.body?.email || '').trim().toLowerCase();

    if (!jid || !email || !email.includes('@')) {
      return res.status(400).json({ error: 'jid and valid email are required' });
    }

    const existingByJid = await findByExternalId(jid);
    if (existingByJid) {
      return res.status(409).json({ error: `JID already bound to ${existingByJid.username} (${existingByJid.email})` });
    }

    const pteroUser = await findByEmail(email);
    if (!pteroUser) {
      return res.status(404).json({ error: 'Pterodactyl account with that email not found' });
    }

    if (pteroUser.external_id) {
      return res.status(409).json({ error: 'Pterodactyl account already bound to another WhatsApp JID' });
    }

    const updatedPtero = await pteroService.updatePteroUser(pteroUser.id, {
      email: pteroUser.email,
      username: pteroUser.username,
      first_name: pteroUser.first_name,
      last_name: pteroUser.last_name,
      external_id: jid
    });

    const userDoc = await User.findOneAndUpdate(
      { jid },
      {
        $setOnInsert: { jid, createdAt: new Date() },
        $set: {
          name: updatedPtero.first_name || '',
          emailCloud: updatedPtero.email || email
        }
      },
      { upsert: true, returnDocument: 'after', runValidators: true }
    );

    await logAction({ req, action: 'BIND_USER_PANEL', details: { jid, email, pteroId: pteroUser.id } });

    res.json({ ok: true, message: 'Account bound successfully', user: userDoc, pteroUser: updatedPtero });
  } catch (error) {
    next(error);
  }
};

export const addUserBalance = async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const amount = Number(req.body?.amount);

    if (!email || !email.includes('@') || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'valid email and positive amount are required' });
    }

    const pteroUser = await findByEmail(email);
    if (!pteroUser) {
      return res.status(404).json({ error: 'Email not found in Pterodactyl' });
    }

    const targetJid = pteroUser.external_id;
    if (!targetJid || !targetJid.includes('@')) {
      return res.status(409).json({ error: 'Pterodactyl account is not bound to WhatsApp. Bind first.' });
    }

    const updated = await User.findOneAndUpdate(
      { jid: targetJid },
      {
        $setOnInsert: { jid: targetJid, createdAt: new Date() },
        $set: {
          name: pteroUser.first_name || '',
          emailCloud: pteroUser.email || email
        },
        $inc: { balance: amount }
      },
      { upsert: true, returnDocument: 'after', runValidators: true }
    );

    await logAction({ req, action: 'ADD_BALANCE_USER', details: { email, jid: targetJid, amount } });

    res.json({
      ok: true,
      message: 'Balance added successfully',
      user: updated,
      ptero: {
        id: pteroUser.id,
        email: pteroUser.email,
        username: pteroUser.username,
        externalId: targetJid
      }
    });
  } catch (error) {
    next(error);
  }
};
