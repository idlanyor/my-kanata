import mongoose from 'mongoose';

const serverSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    pteroId: { type: Number, required: true },
    identifier: { type: String, required: true },
    planName: { type: String, required: true },
    price: { type: Number, required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null, index: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductCategory', default: null, index: true },
    serviceType: { type: String, enum: ['pterodactyl', 'lxc', 'kvm'], default: 'pterodactyl', index: true },
    billingCycle: { type: String, enum: ['monthly', 'quarterly', 'yearly'], default: 'monthly' },
    status: { type: String, default: 'active' },
    expiredAt: { type: Date, required: true },
    autoRenewEnabled: { type: Boolean, default: true, index: true },
    autoRenewCycleDays: { type: Number, default: 30, min: 1 },
    lastAutoRenewFor: { type: String, default: '' }, // YYYY-MM-DD key of previous expiredAt
    lastAutoRenewAt: { type: Date, default: null },
    lastRenewalNotifyFor: { type: String, default: '' }, // prevent repeated insufficient notifications
    suspendedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const Server = mongoose.model('Server', serverSchema);
