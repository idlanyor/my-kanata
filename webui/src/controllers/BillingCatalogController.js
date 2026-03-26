import { ProductCategory } from '../models/ProductCategory.js';
import { Product } from '../models/Product.js';
import { logAction } from '../services/auditService.js';

const toSlug = (value = '') =>
  value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const DEFAULT_PTERO_PLANS = [
  { id: 1, name: '100%', ram: 3072, disk: 3072, cpu: 100, price: 15000, desc: '3 GB RAM · 3 GB Storage' },
  { id: 2, name: '200%', ram: 5120, disk: 5120, cpu: 200, price: 20000, desc: '5 GB RAM · 5 GB Storage' },
  { id: 3, name: '300%', ram: 7168, disk: 7168, cpu: 300, price: 25000, desc: '7 GB RAM · 7 GB Storage' },
  { id: 4, name: '400%', ram: 9216, disk: 10240, cpu: 400, price: 30000, desc: '9 GB RAM · 10 GB Storage' },
  { id: 5, name: '500%', ram: 12288, disk: 12288, cpu: 500, price: 35000, desc: '12 GB RAM · 12 GB Storage' },
  { id: 6, name: '600%', ram: 15360, disk: 20480, cpu: 600, price: 40000, desc: '15 GB RAM · 20 GB Storage' },
  { id: 7, name: '700%', ram: 20480, disk: 25600, cpu: 700, price: 50000, desc: '20 GB RAM · 25 GB Storage' }
];

export const listCategories = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const search = (req.query.search || '').trim();
    const skip = (page - 1) * limit;

    const query = search
      ? {
          $or: [{ name: new RegExp(search, 'i') }, { slug: new RegExp(search, 'i') }]
        }
      : {};

    const [categories, total] = await Promise.all([
      ProductCategory.find(query).sort({ sortOrder: 1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      ProductCategory.countDocuments(query)
    ]);

    res.json({ categories, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const { name, description = '', isActive = true, sortOrder = 0 } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Category name is required' });

    const category = await ProductCategory.create({
      name: name.trim(),
      slug: toSlug(req.body.slug || name),
      description,
      isActive: !!isActive,
      sortOrder: Number(sortOrder) || 0
    });

    await logAction({ req, action: 'CREATE_PRODUCT_CATEGORY', details: { categoryId: String(category._id), slug: category.slug } });
    res.status(201).json(category);
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ error: 'Category slug already exists' });
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const updates = { ...req.body };
    if (updates.slug) updates.slug = toSlug(updates.slug);
    if (updates.name && !updates.slug) updates.slug = toSlug(updates.name);

    const category = await ProductCategory.findByIdAndUpdate(req.params.id, updates, {
      returnDocument: 'after',
      runValidators: true
    });
    if (!category) return res.status(404).json({ error: 'Category not found' });

    await logAction({ req, action: 'UPDATE_PRODUCT_CATEGORY', details: { categoryId: String(category._id) } });
    res.json(category);
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ error: 'Category slug already exists' });
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const linkedProducts = await Product.countDocuments({ categoryId: req.params.id });
    if (linkedProducts > 0) {
      return res.status(400).json({ error: 'Category has linked products. Move/delete products first.' });
    }

    const deleted = await ProductCategory.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Category not found' });

    await logAction({ req, action: 'DELETE_PRODUCT_CATEGORY', details: { categoryId: String(deleted._id), slug: deleted.slug } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const listProducts = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;
    const search = (req.query.search || '').trim();
    const serviceType = (req.query.serviceType || '').trim();
    const categoryId = (req.query.categoryId || '').trim();

    const query = {};
    if (serviceType) query.serviceType = serviceType;
    if (categoryId) query.categoryId = categoryId;
    if (search) {
      query.$or = [{ name: new RegExp(search, 'i') }, { slug: new RegExp(search, 'i') }];
    }

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('categoryId', 'name slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query)
    ]);

    res.json({ products, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req, res, next) => {
  try {
    const {
      categoryId,
      name,
      slug,
      description = '',
      serviceType,
      billingType = 'fixed',
      prices = {},
      specs = {},
      providerMapping = {},
      isActive = true
    } = req.body;

    if (!categoryId || !name?.trim() || !serviceType) {
      return res.status(400).json({ error: 'categoryId, name, and serviceType are required' });
    }

    const categoryExists = await ProductCategory.exists({ _id: categoryId });
    if (!categoryExists) return res.status(400).json({ error: 'Invalid categoryId' });

    const product = await Product.create({
      categoryId,
      name: name.trim(),
      slug: toSlug(slug || name),
      description,
      serviceType,
      billingType,
      prices,
      specs,
      providerMapping,
      isActive: !!isActive
    });

    await logAction({ req, action: 'CREATE_PRODUCT', details: { productId: String(product._id), slug: product.slug } });
    res.status(201).json(product);
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ error: 'Product slug already exists' });
    next(error);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const updates = { ...req.body };
    if (updates.slug) updates.slug = toSlug(updates.slug);
    if (updates.name && !updates.slug) updates.slug = toSlug(updates.name);

    if (updates.categoryId) {
      const categoryExists = await ProductCategory.exists({ _id: updates.categoryId });
      if (!categoryExists) return res.status(400).json({ error: 'Invalid categoryId' });
    }

    const product = await Product.findByIdAndUpdate(req.params.id, updates, {
      returnDocument: 'after',
      runValidators: true
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    await logAction({ req, action: 'UPDATE_PRODUCT', details: { productId: String(product._id) } });
    res.json(product);
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ error: 'Product slug already exists' });
    next(error);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Product not found' });

    await logAction({ req, action: 'DELETE_PRODUCT', details: { productId: String(deleted._id), slug: deleted.slug } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const seedDefaultPterodactylPlans = async (req, res, next) => {
  try {
    const categorySlug = 'panel-pterodactyl';
    let category = await ProductCategory.findOne({ slug: categorySlug });
    if (!category) {
      category = await ProductCategory.create({
        name: 'Panel Pterodactyl',
        slug: categorySlug,
        description: 'Default package catalog for Pterodactyl panel plans',
        sortOrder: 10,
        isActive: true
      });
    }

    let created = 0;
    let updated = 0;
    for (const plan of DEFAULT_PTERO_PLANS) {
      const slug = `pterodactyl-${toSlug(plan.name)}`;
      const updates = {
        categoryId: category._id,
        name: `Pterodactyl ${plan.name}`,
        description: plan.desc,
        serviceType: 'pterodactyl',
        billingType: 'fixed',
        prices: { monthly: plan.price, quarterly: plan.price * 3, yearly: plan.price * 12 },
        specs: {
          cpu: plan.cpu,
          ramMb: plan.ram,
          diskMb: plan.disk,
          summary: plan.desc
        },
        providerMapping: {
          internalPlanId: plan.id
        },
        isActive: true
      };

      const existing = await Product.findOne({ slug }).select('_id').lean();
      await Product.findOneAndUpdate({ slug }, { $set: updates, $setOnInsert: { slug } }, { upsert: true, new: true });
      if (existing) updated += 1;
      else created += 1;
    }

    await logAction({
      req,
      action: 'SEED_DEFAULT_PTERODACTYL_PRODUCTS',
      details: { categoryId: String(category._id), created, updated, total: DEFAULT_PTERO_PLANS.length }
    });

    res.json({
      ok: true,
      message: `Seed complete. ${created} created, ${updated} updated.`,
      data: { created, updated, total: DEFAULT_PTERO_PLANS.length, categoryId: String(category._id) }
    });
  } catch (error) {
    next(error);
  }
};
