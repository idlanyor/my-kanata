import { AuditLog } from '../models/AuditLog.js';

export const logAction = async ({ req, action, details }) => {
  try {
    const adminJid = req?.session?.jid || 'unknown';
    const ip = req?.ip || req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '0.0.0.0';
    const userAgent = req?.headers?.['user-agent'] || 'unknown';

    await AuditLog.create({
      adminJid,
      action,
      details,
      ip,
      userAgent
    });
  } catch (error) {
    console.error('Failed to log audit action:', error);
  }
};
