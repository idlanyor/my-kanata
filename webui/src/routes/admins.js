import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import * as AdminController from '../controllers/AdminController.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize(['owner']));

router.get('/', AdminController.listAdmins);
router.post('/', AdminController.createAdmin);
router.patch('/:id', AdminController.updateAdmin);
router.patch('/:id/password', AdminController.resetPassword);
router.delete('/:id', AdminController.deleteAdmin);

export default router;
