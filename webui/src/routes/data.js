import express from 'express';
import * as DataController from '../controllers/DataController.js';
import { authenticate, authorizeDataAction, authorizePermission } from '../middlewares/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/transactions/backfill-source', authorizePermission('transactions.update'), DataController.backfillTransactionSource);
router.get('/:collection', authorizeDataAction('read'), DataController.listData);
router.patch('/:collection/:id', authorizeDataAction('update'), DataController.updateData);
router.delete('/:collection/:id', authorizeDataAction('delete'), DataController.deleteData);

export default router;
