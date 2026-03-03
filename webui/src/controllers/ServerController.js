import { Server } from '../models/Server.js';
import { Product } from '../models/Product.js';
import { logAction } from '../services/auditService.js';

export const getAllServers = async (req, res, next) => {
  try {
    const data = await Server.find()
      .populate('productId', 'name slug serviceType')
      .populate('categoryId', 'name slug')
      .sort({ createdAt: -1 })
      .lean();
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const createServer = async (req, res, next) => {
  try {
    const payload = req.body;
    let selectedProduct = null;
    if (payload.productId) {
      selectedProduct = await Product.findById(payload.productId).lean();
      if (!selectedProduct) return res.status(400).json({ error: 'Invalid productId' });
    }

    const cycle = payload.billingCycle || 'monthly';
    const productPrice = selectedProduct?.prices?.[cycle];
    const planName = payload.planName || selectedProduct?.name;
    if (!planName) return res.status(400).json({ error: 'planName is required when productId is not provided' });
    const created = await Server.create({
      userId: payload.userId,
      pteroId: Number(payload.pteroId),
      identifier: payload.identifier,
      planName,
      price: Number(payload.price ?? productPrice ?? 0),
      productId: payload.productId || null,
      categoryId: payload.categoryId || selectedProduct?.categoryId || null,
      serviceType: payload.serviceType || selectedProduct?.serviceType || 'pterodactyl',
      billingCycle: cycle,
      status: payload.status || 'active',
      expiredAt: payload.expiredAt
    });

    await logAction({ req, action: 'CREATE_SERVER', details: { id: created._id, identifier: created.identifier } });

    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
};

export const updateServer = async (req, res, next) => {
  try {
    const updates = { ...req.body };
    if (updates.pteroId !== undefined) updates.pteroId = Number(updates.pteroId);
    if (updates.price !== undefined) updates.price = Number(updates.price);
    if (updates.productId !== undefined && updates.productId) {
      const selectedProduct = await Product.findById(updates.productId).lean();
      if (!selectedProduct) return res.status(400).json({ error: 'Invalid productId' });
      const cycle = updates.billingCycle || 'monthly';
      if (updates.planName === undefined) updates.planName = selectedProduct.name;
      if (updates.price === undefined) updates.price = Number(selectedProduct?.prices?.[cycle] || 0);
      if (updates.categoryId === undefined) updates.categoryId = selectedProduct.categoryId;
      if (updates.serviceType === undefined) updates.serviceType = selectedProduct.serviceType;
    }

    const updated = await Server.findByIdAndUpdate(req.params.id, updates, {
      returnDocument: 'after',
      runValidators: true
    });

    if (!updated) {
      return res.status(404).json({ error: 'Server not found' });
    }

    await logAction({ req, action: 'UPDATE_SERVER', details: { id: req.params.id, updates } });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const deleteServer = async (req, res, next) => {
  try {
    const deleted = await Server.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Server not found' });
    }

    await logAction({ req, action: 'DELETE_SERVER', details: { id: req.params.id, identifier: deleted.identifier } });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
