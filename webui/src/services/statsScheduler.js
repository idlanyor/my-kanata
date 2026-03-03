import { DailyStats } from '../models/DailyStats.js';
import { User } from '../models/User.js';
import { Group } from '../models/Group.js';
import { Server } from '../models/Server.js';
import { Transaction } from '../models/Transaction.js';

const toDateStr = (d) => d.toISOString().split('T')[0];

export async function aggregateDailyStats(dateStr) {
  const date = dateStr || toDateStr(new Date());
  const dayStart = new Date(date + 'T00:00:00.000Z');
  const dayEnd = new Date(date + 'T23:59:59.999Z');

  const [userCount, groupCount, serverCount, newUsers, dayTx] = await Promise.all([
    User.countDocuments(),
    Group.countDocuments(),
    Server.countDocuments(),
    User.countDocuments({ createdAt: { $gte: dayStart, $lte: dayEnd } }),
    Transaction.aggregate([
      { $match: { createdAt: { $gte: dayStart, $lte: dayEnd } } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$type', 'payment'] }, { $eq: ['$status', 'success'] }] },
                '$amount',
                0
              ]
            }
          }
        }
      }
    ])
  ]);

  const txData = dayTx[0] || { count: 0, revenue: 0 };

  const stats = {
    date,
    users: userCount,
    newUsers,
    groups: groupCount,
    servers: serverCount,
    revenue: txData.revenue,
    transactions: txData.count,
    commands: 0,
    messages: 0
  };

  await DailyStats.findOneAndUpdate(
    { date },
    { $set: stats },
    { upsert: true }
  );

  return stats;
}

// In-memory counters for today's commands/messages (incremented via WS events)
let todayCounters = { commands: 0, messages: 0, date: toDateStr(new Date()) };

export function incrementCounter(type) {
  const today = toDateStr(new Date());
  if (todayCounters.date !== today) {
    todayCounters = { commands: 0, messages: 0, date: today };
  }
  if (type === 'command') todayCounters.commands++;
  if (type === 'message') todayCounters.messages++;
}

export function getTodayCounters() {
  const today = toDateStr(new Date());
  if (todayCounters.date !== today) {
    todayCounters = { commands: 0, messages: 0, date: today };
  }
  return { ...todayCounters };
}

async function flushCounters() {
  const today = toDateStr(new Date());
  if (todayCounters.date !== today) return;
  if (todayCounters.commands === 0 && todayCounters.messages === 0) return;

  await DailyStats.findOneAndUpdate(
    { date: today },
    { $inc: { commands: todayCounters.commands, messages: todayCounters.messages } },
    { upsert: true }
  );
  todayCounters.commands = 0;
  todayCounters.messages = 0;
}

let schedulerInterval = null;
let flushInterval = null;

export function startStatsScheduler() {
  // Run daily aggregation immediately for today
  aggregateDailyStats().catch((err) => console.error('[StatsScheduler] Aggregation error:', err));

  // Check every hour if we need to aggregate (covers midnight rollover)
  schedulerInterval = setInterval(async () => {
    try {
      await aggregateDailyStats();
    } catch (err) {
      console.error('[StatsScheduler] Hourly aggregation error:', err);
    }
  }, 60 * 60 * 1000);

  // Flush in-memory counters every 5 minutes
  flushInterval = setInterval(async () => {
    try {
      await flushCounters();
    } catch (err) {
      console.error('[StatsScheduler] Flush error:', err);
    }
  }, 5 * 60 * 1000);

  console.log('[StatsScheduler] Started (hourly aggregation + 5min counter flush)');
}

export function stopStatsScheduler() {
  if (schedulerInterval) clearInterval(schedulerInterval);
  if (flushInterval) clearInterval(flushInterval);
  schedulerInterval = null;
  flushInterval = null;
}
