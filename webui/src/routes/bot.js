import express from 'express';
import * as BotController from '../controllers/BotController.js';
import { authenticate, authorizePermission } from '../middlewares/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/status', authorizePermission('bot.status.read'), BotController.getBotStatus);
router.post('/start', authorizePermission('bot.control'), BotController.startBot);
router.post('/stop', authorizePermission('bot.control'), BotController.stopBot);
router.post('/restart', authorizePermission('bot.control'), BotController.restartBot);
router.post('/sync-groups', authorizePermission('bot.sync.groups'), BotController.syncGroups);
router.post('/input', authorizePermission('bot.control'), BotController.sendBotInput);
router.post('/relogin', authorizePermission('bot.relogin'), BotController.reloginBot);
router.get('/logs', authorizePermission('bot.logs.read'), BotController.getBotLogs);
router.post('/invoice/transaction/:id', authorizePermission('transactions.update'), BotController.sendTransactionInvoice);

// Messaging
router.post('/send-message', authorizePermission('bot.control'), BotController.sendMessage);
router.post('/broadcast', authorizePermission('bot.control'), BotController.sendBroadcast);
router.get('/broadcasts', authorizePermission('bot.status.read'), BotController.getBroadcasts);

// Health
router.get('/health', authorizePermission('bot.status.read'), BotController.getBotHealth);

export default router;
