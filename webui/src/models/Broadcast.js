import mongoose from 'mongoose';

const broadcastSchema = new mongoose.Schema({
  target: { type: String, enum: ['all_users', 'all_groups'], required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['pending', 'scheduled', 'sending', 'sent', 'failed'], default: 'pending' },
  scheduledAt: { type: Date },
  sentAt: { type: Date },
  sent: { type: Number, default: 0 },
  failed: { type: Number, default: 0 },
  adminJid: { type: String }
}, { timestamps: true });

export const Broadcast = mongoose.model('Broadcast', broadcastSchema);
