import mongoose from 'mongoose';

const productCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    description: { type: String, default: '', trim: true },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 }
  },
  { timestamps: true }
);

productCategorySchema.index({ sortOrder: 1, createdAt: -1 });

export const ProductCategory = mongoose.model('ProductCategory', productCategorySchema);
