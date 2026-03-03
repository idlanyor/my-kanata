import express from 'express';
import * as SettingsController from '../controllers/SettingsController.js';
import { authenticate, authorizePermission } from '../middlewares/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', authorizePermission('settings.read'), SettingsController.getSettings);
router.patch('/', authorizePermission('settings.update'), SettingsController.updateSettings);

export default router;
