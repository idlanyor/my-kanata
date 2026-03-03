import express from 'express';
import * as AuthController from '../controllers/AuthController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

router.post('/login', AuthController.login);
router.post('/logout', authenticate, AuthController.logout);
router.get('/me', authenticate, AuthController.me);

export default router;
