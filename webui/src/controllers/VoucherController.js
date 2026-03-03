import { Voucher } from '../models/Voucher.js';
import { logAction } from '../services/auditService.js';
import crypto from 'crypto';

export const listVouchers = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const [vouchers, total] = await Promise.all([
      Voucher.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Voucher.countDocuments()
    ]);

    res.json({
      vouchers,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

export const createVoucher = async (req, res, next) => {
  try {
    const { code, value, quota, isPublic, expiredAt } = req.body;
    if (!code || !value) return res.status(400).json({ error: 'Code and value are required' });

    const voucher = await Voucher.create({
      code: code.toUpperCase(),
      value,
      quota: quota || 1,
      isPublic: !!isPublic,
      expiredAt: expiredAt ? new Date(expiredAt) : undefined
    });

    await logAction({ req, action: 'CREATE_VOUCHER', details: { code: voucher.code, value } });
    res.status(201).json(voucher);
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ error: 'Voucher code already exists' });
    next(error);
  }
};

export const batchCreate = async (req, res, next) => {
  try {
    const { count = 5, value, quota = 1, isPublic = false, prefix = 'PROMO', expiredAt } = req.body;
    if (!value) return res.status(400).json({ error: 'Value is required' });
    const num = Math.min(Math.max(count, 1), 100);

    const vouchers = [];
    for (let i = 0; i < num; i++) {
      const suffix = crypto.randomBytes(4).toString('hex').toUpperCase();
      vouchers.push({
        code: `${prefix}-${suffix}`,
        value,
        quota,
        isPublic,
        expiredAt: expiredAt ? new Date(expiredAt) : undefined
      });
    }

    const created = await Voucher.insertMany(vouchers, { ordered: false });
    await logAction({ req, action: 'BATCH_CREATE_VOUCHER', details: { count: created.length, value, prefix } });
    res.status(201).json({ created: created.length, vouchers: created });
  } catch (error) {
    next(error);
  }
};

export const deleteVoucher = async (req, res, next) => {
  try {
    const voucher = await Voucher.findByIdAndDelete(req.params.id);
    if (!voucher) return res.status(404).json({ error: 'Voucher not found' });
    await logAction({ req, action: 'DELETE_VOUCHER', details: { code: voucher.code } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};
