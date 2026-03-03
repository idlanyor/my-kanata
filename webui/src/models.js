import mongoose from 'mongoose';

const serverSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    pteroId: { type: Number, required: true },
    identifier: { type: String, required: true },
    planName: { type: String, required: true },
    price: { type: Number, required: true },
    status: { type: String, default: 'active' },
    expiredAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export const Server = mongoose.model('Server', serverSchema);
