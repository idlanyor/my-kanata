import { AuthIdentity } from '../models/AuthIdentity.js';
import { hashPassword } from '../services/passwordService.js';
import { logAction } from '../services/auditService.js';

export const listAdmins = async (_req, res, next) => {
  try {
    const admins = await AuthIdentity.find()
      .select('-passwordHash -passwordSalt')
      .sort({ createdAt: 1 })
      .lean();
    res.json(admins);
  } catch (error) {
    next(error);
  }
};

export const createAdmin = async (req, res, next) => {
  try {
    const { name, jid, password, role } = req.body;
    if (!name || !jid || !password) {
      return res.status(400).json({ error: 'Name, JID, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await AuthIdentity.findOne({ jid });
    if (existing) return res.status(400).json({ error: 'JID already registered' });

    const { salt, hash } = await hashPassword(password);
    const admin = await AuthIdentity.create({
      name,
      jid,
      passwordSalt: salt,
      passwordHash: hash,
      role: role || 'viewer'
    });

    await logAction({ req, action: 'CREATE_ADMIN', details: { name, jid, role: admin.role } });

    const result = admin.toObject();
    delete result.passwordHash;
    delete result.passwordSalt;
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const updateAdmin = async (req, res, next) => {
  try {
    const { role, active, name } = req.body;
    const updates = {};
    if (role) updates.role = role;
    if (active !== undefined) updates.active = active;
    if (name) updates.name = name;

    const admin = await AuthIdentity.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    ).select('-passwordHash -passwordSalt');

    if (!admin) return res.status(404).json({ error: 'Admin not found' });

    await logAction({ req, action: 'UPDATE_ADMIN', details: { id: req.params.id, updates } });
    res.json(admin);
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const admin = await AuthIdentity.findById(req.params.id);
    if (!admin) return res.status(404).json({ error: 'Admin not found' });

    const { salt, hash } = await hashPassword(password);
    admin.passwordSalt = salt;
    admin.passwordHash = hash;
    await admin.save();

    await logAction({ req, action: 'RESET_ADMIN_PASSWORD', details: { id: req.params.id, name: admin.name } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const deleteAdmin = async (req, res, next) => {
  try {
    const admin = await AuthIdentity.findByIdAndDelete(req.params.id);
    if (!admin) return res.status(404).json({ error: 'Admin not found' });

    await logAction({ req, action: 'DELETE_ADMIN', details: { name: admin.name, jid: admin.jid } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};
