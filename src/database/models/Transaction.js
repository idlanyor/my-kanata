import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    userName: { type: String },
    type: { type: String, enum: ['income', 'expense'], required: true },
    amount: { type: Number, required: true },
    category: { type: String, default: 'General' },
    description: { type: String },
    date: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('Transaction', TransactionSchema);
