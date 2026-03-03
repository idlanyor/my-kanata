import mongoose from 'mongoose';

const authIdentitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    jid: { type: String, required: true, unique: true, trim: true },
    lid: { type: String, unique: true, sparse: true, trim: true },
    passwordSalt: { type: String, required: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['owner', 'admin', 'viewer'], default: 'viewer' },
    active: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export const AuthIdentity = mongoose.model('AuthIdentity', authIdentitySchema);
