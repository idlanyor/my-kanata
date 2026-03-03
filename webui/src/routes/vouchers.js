import express from 'express';
import { authenticate, authorizePermission } from '../middlewares/auth.js';
import * as VoucherController from '../controllers/VoucherController.js';

const router = express.Router();

router.use(authenticate);

router.get('/', authorizePermission('stats.read'), VoucherController.listVouchers);
router.post('/', authorizePermission('settings.update'), VoucherController.createVoucher);
router.post('/batch', authorizePermission('settings.update'), VoucherController.batchCreate);
router.delete('/:id', authorizePermission('settings.update'), VoucherController.deleteVoucher);

export default router;
