import express from 'express';
import * as CommandController from '../controllers/CommandController.js';
import { authenticate, authorizePermission } from '../middlewares/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', authorizePermission('commands.read'), CommandController.getCommands);

export default router;
