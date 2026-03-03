import axios from 'axios';
import { Server } from '../models/Server.js';
import { User } from '../models/User.js';
import { Transaction } from '../models/Transaction.js';
import * as pteroService from './pteroService.js';
import { config } from '../config/index.js';

const MS_HOUR = 60 * 60 * 1000;
const MS_DAY = 24 * MS_HOUR;

const toDateKey = (date) => new Date(date).toISOString().slice(0, 10);

const formatIdDate = (date) => {
  try {
    return new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return String(date);
  }
};

const sendWhatsappText = async (to, text) => {
  if (!config.botWebhookUrl || !config.botWebhookToken || !to || !text) return;
  await axios.post(
    `${config.botWebhookUrl}/api/webhook/send-text`,
    { to, text },
    {
      headers: {
        Authorization: `Bearer ${config.botWebhookToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 20000
    }
  );
};

const autoRenewServers = async () => {
  const now = new Date();
  const renewStart = new Date(now.getTime() + MS_DAY);
  const renewEnd = new Date(now.getTime() + 2 * MS_DAY);

  const dueServers = await Server.find({
    autoRenewEnabled: true,
    status: 'active',
    expiredAt: { $gte: renewStart, $lte: renewEnd }
  });

  for (const srv of dueServers) {
    const renewKey = toDateKey(srv.expiredAt);
    if (srv.lastAutoRenewFor === renewKey) continue;

    const user = await User.findOne({ jid: srv.userId });
    if (!user) continue;

    const price = Number(srv.price || 0);
    if (price <= 0) continue;

    if (Number(user.balance || 0) >= price) {
      const beforeBalance = Number(user.balance || 0);
      user.balance = beforeBalance - price;
      await user.save();

      const nextExpired = new Date(srv.expiredAt);
      nextExpired.setDate(nextExpired.getDate() + Number(srv.autoRenewCycleDays || 30));

      srv.expiredAt = nextExpired;
      srv.lastAutoRenewFor = renewKey;
      srv.lastAutoRenewAt = new Date();
      await srv.save();

      await Transaction.create({
        userId: srv.userId,
        amount: price,
        type: 'expense',
        status: 'success',
        source: 'store',
        serviceType: srv.serviceType || 'pterodactyl',
        billingCycle: 'monthly',
        category: 'Renewal',
        description: `Auto-renew ${srv.planName} (${srv.identifier})`
      });

      await sendWhatsappText(
        srv.userId,
        `*AUTO RENEW BERHASIL*\n\n` +
          `Server: ${srv.planName}\n` +
          `ID: ${srv.identifier}\n` +
          `Terpotong: Rp ${price.toLocaleString('id-ID')}\n` +
          `Sisa Saldo: Rp ${Number(user.balance || 0).toLocaleString('id-ID')}\n` +
          `Expired Baru: ${formatIdDate(nextExpired)}`
      );
    } else {
      if (srv.lastRenewalNotifyFor !== renewKey) {
        await sendWhatsappText(
          srv.userId,
          `*AUTO RENEW GAGAL (SALDO KURANG)*\n\n` +
            `Server: ${srv.planName}\n` +
            `ID: ${srv.identifier}\n` +
            `Expired: ${formatIdDate(srv.expiredAt)}\n` +
            `Harga Perpanjang: Rp ${price.toLocaleString('id-ID')}\n` +
            `Saldo Kamu: Rp ${Number(user.balance || 0).toLocaleString('id-ID')}\n\n` +
            `Silakan topup saldo agar perpanjangan otomatis berjalan.`
        );
        srv.lastRenewalNotifyFor = renewKey;
        await srv.save();
      }
    }
  }
};

const autoSuspendOverdueServers = async () => {
  const threshold = new Date(Date.now() - 7 * MS_DAY);
  const overdueServers = await Server.find({
    status: 'active',
    expiredAt: { $lt: threshold }
  });

  for (const srv of overdueServers) {
    try {
      await pteroService.suspendServer(srv.pteroId);
      srv.status = 'suspended';
      srv.suspendedAt = new Date();
      await srv.save();

      await sendWhatsappText(
        srv.userId,
        `*SERVER DI-SUSPEND*\n\n` +
          `Server: ${srv.planName}\n` +
          `ID: ${srv.identifier}\n` +
          `Expired: ${formatIdDate(srv.expiredAt)}\n\n` +
          `Server disuspend karena melewati jatuh tempo lebih dari 7 hari.`
      );
    } catch (error) {
      console.error(`[AutoRenew] Failed suspending server ${srv.pteroId}:`, error.message);
    }
  }
};

let renewInterval = null;
let suspendInterval = null;

export function startAutoRenewScheduler() {
  const runAll = async () => {
    try {
      await autoRenewServers();
      await autoSuspendOverdueServers();
    } catch (error) {
      console.error('[AutoRenew] Scheduler cycle error:', error.message);
    }
  };

  runAll();
  renewInterval = setInterval(runAll, MS_HOUR);
  suspendInterval = renewInterval;
  console.log('[AutoRenew] Started (hourly auto-renew + overdue suspend)');
}

export function stopAutoRenewScheduler() {
  if (renewInterval) clearInterval(renewInterval);
  if (suspendInterval && suspendInterval !== renewInterval) clearInterval(suspendInterval);
  renewInterval = null;
  suspendInterval = null;
}
