import mongoose from 'mongoose';

const cyclePriceSchema = new mongoose.Schema(
  {
    monthly: { type: Number, default: 0, min: 0 },
    quarterly: { type: Number, default: 0, min: 0 },
    yearly: { type: Number, default: 0, min: 0 }
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductCategory', required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    description: { type: String, default: '', trim: true },
    serviceType: { type: String, enum: ['pterodactyl', 'lxc', 'kvm'], required: true, index: true },
    billingType: { type: String, enum: ['fixed', 'metered'], default: 'fixed' },
    prices: { type: cyclePriceSchema, default: () => ({}) },
    specs: { type: mongoose.Schema.Types.Mixed, default: {} },
    providerMapping: { type: mongoose.Schema.Types.Mixed, default: {} },
    isActive: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

productSchema.index({ createdAt: -1 });

export const Product = mongoose.model('Product', productSchema);
