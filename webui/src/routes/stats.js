import express from 'express';
import * as StatsController from '../controllers/StatsController.js';
import { authenticate, authorizePermission } from '../middlewares/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/dashboard', authorizePermission('stats.read'), StatsController.getDashboardStats);
router.get('/daily', authorizePermission('stats.read'), StatsController.getDailyStatsRange);
router.get('/activity', authorizePermission('stats.read'), StatsController.getRecentActivity);
router.get('/audit-logs', authorizePermission('stats.read'), StatsController.getAuditLogs);
router.get('/audit-actions', authorizePermission('stats.read'), StatsController.getAuditLogActions);
router.get('/revenue', authorizePermission('stats.read'), StatsController.getRevenueAnalytics);

export default router;
