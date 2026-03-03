import { User } from '../models/User.js';
import { Group } from '../models/Group.js';
import { Server } from '../models/Server.js';
import { Transaction } from '../models/Transaction.js';
import { Product } from '../models/Product.js';

const models = {
  users: User,
  groups: Group,
  servers: Server,
  transactions: Transaction
};

const inferTransactionSource = (tx = {}) => {
  if (tx.source) return tx.source;
  const c = String(tx.category || '').toLowerCase();
  const d = String(tx.description || '').toLowerCase();
  if (c.includes('smm')) return 'smm';
  if (c.includes('store') || d.includes('purchased ptero') || d.includes('vps plan')) return 'store';
  if (c.includes('voucher') || c.includes('general')) return 'general';
  return 'finance';
};

export const listData = async (req, res, next) => {
  try {
    const { collection } = req.params;
    const model = models[collection];
    if (!model) return res.status(404).json({ error: 'Collection not found' });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const source = (req.query.source || '').trim().toLowerCase();
    const skip = (page - 1) * limit;

    let query = {};
    if (search) {
        // Simple search logic based on collection
        if (collection === 'users' || collection === 'groups') {
            query = { $or: [{ jid: new RegExp(search, 'i') }, { name: new RegExp(search, 'i') }] };
        } else if (collection === 'servers') {
            query = { $or: [{ userId: new RegExp(search, 'i') }, { identifier: new RegExp(search, 'i') }, { planName: new RegExp(search, 'i') }] };
        } else if (collection === 'transactions') {
            query = { $or: [{ userId: new RegExp(search, 'i') }, { reference: new RegExp(search, 'i') }] };
        }
    }
    if (collection === 'transactions' && source) {
        if (source === 'smm') {
            query.$and = [...(query.$and || []), { $or: [{ source: 'smm' }, { category: /smm/i }] }];
        } else if (source === 'store') {
            query.$and = [
                ...(query.$and || []),
                { $or: [{ source: 'store' }, { category: /store/i }, { description: /purchased ptero|vps plan/i }] }
            ];
        } else if (source === 'finance') {
            query.$and = [
                ...(query.$and || []),
                {
                    $or: [
                        { source: 'finance' },
                        { category: /finance|makanan|transport|belanja|tagihan|gaji|investasi|umum/i }
                    ]
                }
            ];
        } else if (source === 'general') {
            query.$and = [...(query.$and || []), { $or: [{ source: 'general' }, { category: /voucher|general/i }] }];
        }
    }

    const [data, total] = await Promise.all([
      model.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      model.countDocuments(query)
    ]);

    // Manual population for Servers if needed
    if (collection === 'servers' && data.length > 0) {
        const userJids = [...new Set(data.map(srv => srv.userId))];
        const users = await User.find({ jid: { $in: userJids } }).select('jid name').lean();
        const productIds = [...new Set(data.map((srv) => String(srv.productId || '')).filter(Boolean))];
        const products = productIds.length > 0
          ? await Product.find({ _id: { $in: productIds } }).select('name slug serviceType').lean()
          : [];
        const userMap = users.reduce((acc, user) => {
            acc[user.jid] = user.name || user.jid.split('@')[0];
            return acc;
        }, {});
        const productMap = products.reduce((acc, p) => {
            acc[String(p._id)] = p;
            return acc;
        }, {});
        
        data.forEach(srv => {
            srv.userName = userMap[srv.userId] || srv.userId.split('@')[0];
            if (srv.productId) srv.product = productMap[String(srv.productId)] || null;
        });
    }

    if (collection === 'transactions' && data.length > 0) {
        const productIds = [...new Set(data.map((tx) => String(tx.productId || '')).filter(Boolean))];
        const products = productIds.length > 0
          ? await Product.find({ _id: { $in: productIds } }).select('name slug serviceType').lean()
          : [];
        const productMap = products.reduce((acc, p) => {
            acc[String(p._id)] = p;
            return acc;
        }, {});
        data.forEach((tx) => {
            tx.source = inferTransactionSource(tx);
            if (tx.productId) tx.product = productMap[String(tx.productId)] || null;
        });
    }

    res.json({
      data,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateData = async (req, res, next) => {
    try {
        const { collection, id } = req.params;
        const model = models[collection];
        if (!model) return res.status(404).json({ error: 'Collection not found' });

        const updates = { ...req.body };
        // Keep backward compatibility with old "user" role naming.
        if (collection === 'users' && updates.role === 'user') {
            updates.role = 'viewer';
        }

        if (collection === 'users' && updates.role) {
            const actorRole = req.session?.role || 'viewer';
            const targetUser = await model.findById(id).select('role');
            if (!targetUser) return res.status(404).json({ error: 'Document not found' });

            const normalizedTargetRole = targetUser.role === 'user' ? 'viewer' : targetUser.role;
            if (actorRole !== 'owner') {
                if (updates.role === 'owner') {
                    return res.status(403).json({ error: 'Forbidden: Cannot assign owner role' });
                }
                if (normalizedTargetRole === 'owner') {
                    return res.status(403).json({ error: 'Forbidden: Cannot modify owner account' });
                }
            }
        }

        const updated = await model.findByIdAndUpdate(id, updates, { returnDocument: 'after', runValidators: true });
        if (!updated) return res.status(404).json({ error: 'Document not found' });

        res.json(updated);
    } catch (error) {
        next(error);
    }
};

export const deleteData = async (req, res, next) => {
    try {
        const { collection, id } = req.params;
        const model = models[collection];
        if (!model) return res.status(404).json({ error: 'Collection not found' });

        const deleted = await model.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ error: 'Document not found' });

        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

export const backfillTransactionSource = async (_req, res, next) => {
  try {
    const transactions = await Transaction.find({ $or: [{ source: { $exists: false } }, { source: null }, { source: 'other' }] })
      .select('_id source category description')
      .lean();

    if (transactions.length === 0) {
      return res.json({ ok: true, message: 'No transactions need backfill.', updated: 0 });
    }

    const ops = transactions.map((tx) => ({
      updateOne: {
        filter: { _id: tx._id },
        update: { $set: { source: inferTransactionSource(tx) } }
      }
    }));

    const result = await Transaction.bulkWrite(ops);
    res.json({
      ok: true,
      message: 'Backfill source completed.',
      updated: result.modifiedCount || 0
    });
  } catch (error) {
    next(error);
  }
};
