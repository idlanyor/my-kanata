import mongoose from 'mongoose';

const voucherSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  value: { type: Number, required: true },
  quota: { type: Number, default: 1 },
  usedBy: [{ type: String }],
  isPublic: { type: Boolean, default: false },
  expiredAt: { type: Date }
}, { timestamps: true });

export const Voucher = mongoose.model('Voucher', voucherSchema);
