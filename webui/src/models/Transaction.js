import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
    userId: { type: String, required: true }, // WhatsApp JID
    amount: { type: Number, required: true },
    type: { type: String, enum: ['income', 'expense', 'deposit', 'payment', 'refund'], required: true },
    status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
    source: { type: String, enum: ['finance', 'store', 'smm', 'general', 'other'], default: 'other', index: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null, index: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductCategory', default: null, index: true },
    serviceType: { type: String, enum: ['pterodactyl', 'lxc', 'kvm', 'manual'], default: 'manual', index: true },
    billingCycle: { type: String, enum: ['one_time', 'monthly', 'quarterly', 'yearly'], default: 'one_time' },
    description: { type: String, default: '' },
    reference: { type: String, unique: true }, // External ref (e.g. Midtrans)
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const Transaction = mongoose.model('Transaction', transactionSchema);
