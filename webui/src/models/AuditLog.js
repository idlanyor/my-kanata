import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  adminJid: { type: String, required: true },
  action: { type: String, required: true }, // e.g., 'STOP_BOT', 'UPDATE_SETTINGS'
  details: { type: mongoose.Schema.Types.Mixed },
  ip: { type: String },
  userAgent: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
