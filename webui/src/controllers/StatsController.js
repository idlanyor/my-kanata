import { User } from '../models/User.js';
import { Group } from '../models/Group.js';
import { Server } from '../models/Server.js';
import { Transaction } from '../models/Transaction.js';
import { AuditLog } from '../models/AuditLog.js';
import { DailyStats } from '../models/DailyStats.js';
import { getTodayCounters } from '../services/statsScheduler.js';

export const getDashboardStats = async (req, res, next) => {
  try {
    const [userCount, groupCount, serverCount, totalRevenue] = await Promise.all([
      User.countDocuments(),
      Group.countDocuments(),
      Server.countDocuments(),
      Transaction.aggregate([
        { $match: { type: 'payment', status: 'success' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const revenue = totalRevenue.length > 0 ? totalRevenue[0].total : 0;

    // Last 7 days real stats from DailyStats collection
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const dateStr = sevenDaysAgo.toISOString().split('T')[0];

    const dailyStats = await DailyStats.find({ date: { $gte: dateStr } })
      .sort({ date: 1 })
      .lean();

    // Fill in missing days with zeros
    const filledStats = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      const existing = dailyStats.find((s) => s.date === ds);
      filledStats.push(existing || { date: ds, users: 0, newUsers: 0, commands: 0, messages: 0, revenue: 0, transactions: 0, groups: 0, servers: 0 });
    }

    res.json({
      summary: {
        users: userCount,
        groups: groupCount,
        servers: serverCount,
        revenue
      },
      dailyStats: filledStats,
      todayCounters: getTodayCounters()
    });
  } catch (error) {
    next(error);
  }
};

export const getDailyStatsRange = async (req, res, next) => {
  try {
    const { from, to, days } = req.query;
    let query = {};

    if (from && to) {
      query = { date: { $gte: from, $lte: to } };
    } else {
      const d = parseInt(days) || 30;
      const start = new Date();
      start.setDate(start.getDate() - d);
      query = { date: { $gte: start.toISOString().split('T')[0] } };
    }

    const stats = await DailyStats.find(query).sort({ date: 1 }).lean();
    res.json(stats);
  } catch (error) {
    next(error);
  }
};

export const getRecentActivity = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const [recentLogs, recentTransactions] = await Promise.all([
      AuditLog.find().sort({ createdAt: -1 }).limit(limit).lean(),
      Transaction.find().sort({ createdAt: -1 }).limit(limit).lean()
    ]);

    res.json({ recentLogs, recentTransactions });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;
    const { action, admin, from, to, search } = req.query;

    const filter = {};
    if (action) filter.action = action;
    if (admin) filter.adminJid = { $regex: admin, $options: 'i' };
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to + 'T23:59:59.999Z');
    }
    if (search) {
      filter.$or = [
        { action: { $regex: search, $options: 'i' } },
        { adminJid: { $regex: search, $options: 'i' } }
      ];
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(filter)
    ]);

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogActions = async (_req, res, next) => {
  try {
    const actions = await AuditLog.distinct('action');
    res.json(actions);
  } catch (error) {
    next(error);
  }
};

export const getRevenueAnalytics = async (req, res, next) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const start = new Date();
    start.setMonth(start.getMonth() - months);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const [monthlyRevenue, planBreakdown] = await Promise.all([
      Transaction.aggregate([
        { $match: { type: 'payment', status: 'success', createdAt: { $gte: start } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Transaction.aggregate([
        { $match: { type: 'payment', status: 'success', createdAt: { $gte: start } } },
        {
          $group: {
            _id: '$description',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { total: -1 } },
        { $limit: 10 }
      ])
    ]);

    res.json({ monthlyRevenue, planBreakdown });
  } catch (error) {
    next(error);
  }
};
