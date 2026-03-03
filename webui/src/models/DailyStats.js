import mongoose from 'mongoose';

const dailyStatsSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // YYYY-MM-DD
  users: { type: Number, default: 0 },
  newUsers: { type: Number, default: 0 },
  groups: { type: Number, default: 0 },
  servers: { type: Number, default: 0 },
  commands: { type: Number, default: 0 },
  messages: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 },
  transactions: { type: Number, default: 0 }
}, { timestamps: true });

export const DailyStats = mongoose.model('DailyStats', dailyStatsSchema);
