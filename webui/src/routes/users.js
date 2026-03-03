import express from 'express';
import * as UserToolsController from '../controllers/UserToolsController.js';
import { authenticate, authorizePermission } from '../middlewares/auth.js';
import { User } from '../models/User.js';
import { Server } from '../models/Server.js';
import { Transaction } from '../models/Transaction.js';
import { logAction } from '../services/auditService.js';

const router = express.Router();

router.use(authenticate);

// User detail page - returns user + servers + transactions
router.get('/:id', authorizePermission('users.read'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [servers, transactions] = await Promise.all([
      Server.find({ owner: user.jid }).sort({ createdAt: -1 }).lean(),
      Transaction.find({ userId: user.jid }).sort({ createdAt: -1 }).limit(50).lean()
    ]);

    res.json({ user, servers, transactions });
  } catch (error) {
    next(error);
  }
});

// Update user
router.patch('/:id', authorizePermission('users.update'), async (req, res, next) => {
  try {
    const updates = {};
    const { name, balance, banned, email } = req.body;
    if (name !== undefined) updates.name = name;
    if (balance !== undefined) updates.balance = Number(balance);
    if (banned !== undefined) updates.banned = !!banned;
    if (email !== undefined) updates.email = email;

    const user = await User.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });

    await logAction({ req, action: 'UPDATE_USER', details: { userId: req.params.id, updates } });
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/profile', authorizePermission('users.read'), UserToolsController.getUserProfile);
router.post('/register', authorizePermission('users.update'), UserToolsController.registerUserPanel);
router.post('/bind', authorizePermission('users.update'), UserToolsController.bindUserPanel);
router.post('/add-balance', authorizePermission('users.update'), UserToolsController.addUserBalance);

export default router;
