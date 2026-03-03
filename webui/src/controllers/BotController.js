import { botService } from '../services/botService.js';
import { socketService } from '../services/socketService.js';
import { logAction } from '../services/auditService.js';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { config } from '../config/index.js';
import { Transaction } from '../models/Transaction.js';
import { User } from '../models/User.js';
import { Broadcast } from '../models/Broadcast.js';

export const getBotStatus = (req, res) => {
  res.json(botService.getStatus());
};

export const syncGroups = async (req, res) => {
    const { jid } = req.body;
    const ok = socketService.sendToBot('bot:command', { command: 'group:sync', jid });
    if (!ok) {
        return res.status(503).json({ ok: false, message: 'Bot is offline or not connected to WebSocket' });
    }
    await logAction({ req, action: 'SYNC_GROUPS', details: { jid } });
    res.json({ ok: true, message: jid ? `Sync command for ${jid} sent` : 'Smart Sync command sent to bot' });
};

export const startBot = async (req, res) => {
  botService.start();
  await logAction({ req, action: 'START_BOT', details: {} });
  res.json({ ok: true, message: 'Bot starting...' });
};

export const stopBot = async (req, res) => {
  botService.stop();
  await logAction({ req, action: 'STOP_BOT', details: {} });
  res.json({ ok: true, message: 'Bot stopping...' });
};

export const restartBot = async (req, res) => {
  botService.restart();
  await logAction({ req, action: 'RESTART_BOT', details: {} });
  res.json({ ok: true, message: 'Bot restarting...' });
};

export const sendBotInput = (req, res) => {
  const { input } = req.body;
  botService.sendInput(input);
  res.json({ ok: true });
};

export const reloginBot = async (req, res) => {
    botService.stop();
    // Clear auth folder
    const authFolder = path.resolve(botService.botPath, 'auth_info_baileys');
    if (fs.existsSync(authFolder)) {
        fs.rmSync(authFolder, { recursive: true, force: true });
    }
    await logAction({ req, action: 'RELOGIN_BOT', details: { msg: 'Auth folder cleared' } });
    botService.start();
    res.json({ ok: true, message: 'Auth cleared and bot restarting for re-pairing...' });
};

export const getBotLogs = (req, res) => {
    res.json(botService.logs);
};

const generateInvoicePdf = async (invoiceData) => {
  const headers = { 'Content-Type': 'application/json' };
  if (config.invoiceApiKey) {
    headers.Authorization = `Bearer ${config.invoiceApiKey}`;
  }

  const response = await axios.post('https://invoice-generator.com', invoiceData, {
    responseType: 'arraybuffer',
    headers
  });

  return Buffer.from(response.data);
};

const buildLogoBase64 = () => {
  try {
    const logoPath = path.join(botService.botPath, 'src/assets/antidonasi.png');
    if (!fs.existsSync(logoPath)) return '';
    const logoBuffer = fs.readFileSync(logoPath);
    return `data:image/png;base64,${logoBuffer.toString('base64')}`;
  } catch {
    return '';
  }
};

const sendPdfToWhatsapp = async ({ to, pdfBuffer, fileName, caption }) => {
  if (!config.botWebhookUrl || !config.botWebhookToken) {
    const err = new Error('Webhook config missing (BOT_WEBHOOK_URL/BOT_WEBHOOK_TOKEN)');
    err.status = 503;
    throw err;
  }

  const payload = {
    to,
    fileName,
    mimetype: 'application/pdf',
    caption,
    data: pdfBuffer.toString('base64')
  };

  await axios.post(`${config.botWebhookUrl}/api/webhook/send-document`, payload, {
    headers: {
      Authorization: `Bearer ${config.botWebhookToken}`,
      'Content-Type': 'application/json'
    },
    timeout: 30000
  });
};

export const sendTransactionInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tx = await Transaction.findById(id).lean();
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });
    if (!tx.userId) return res.status(400).json({ error: 'Transaction userId missing' });

    const user = await User.findOne({ jid: tx.userId }).select('name').lean();
    const customerName = user?.name || tx.userId.split('@')[0] || 'Customer';
    const invoiceNumber = Math.floor(Math.random() * 90000) + 10000;
    const itemName = tx.description?.trim() || `Transaction ${tx.reference || tx._id}`;
    const amount = Number(tx.amount) || 0;
    if (amount <= 0) return res.status(400).json({ error: 'Transaction amount must be greater than 0' });

    const invoiceData = {
      from: config.invoiceFromName,
      to: customerName,
      logo: buildLogoBase64(),
      number: invoiceNumber,
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      currency: 'IDR',
      items: [{ name: itemName, quantity: 1, unit_cost: amount }],
      notes: 'Thank you for your business! Payment due upon receipt.'
    };

    const pdfBuffer = await generateInvoicePdf(invoiceData);
    const fileName = `Invoice-${invoiceNumber}.pdf`;
    await sendPdfToWhatsapp({
      to: tx.userId,
      pdfBuffer,
      fileName,
      caption: '✅ *Invoice Created!*'
    });

    await logAction({
      req,
      action: 'SEND_TRANSACTION_INVOICE',
      details: { transactionId: String(tx._id), userId: tx.userId, amount }
    });

    res.json({
      ok: true,
      message: 'Invoice sent to WhatsApp successfully',
      data: { transactionId: tx._id, userId: tx.userId, fileName }
    });
  } catch (error) {
    if (!error.status) {
      error.status = 500;
      error.message = error?.response?.data?.error || error?.message || 'Failed to send invoice';
    }
    next(error);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const { recipient, message, type = 'text' } = req.body;
    if (!recipient || !message) {
      return res.status(400).json({ error: 'Recipient and message are required' });
    }

    const ok = socketService.sendToBot('bot:command', {
      command: 'send-message',
      recipient,
      message,
      type
    });

    if (!ok) {
      return res.status(503).json({ error: 'Bot is offline or not connected' });
    }

    await logAction({
      req,
      action: 'SEND_MESSAGE',
      details: { recipient, messageLength: message.length, type }
    });

    res.json({ ok: true, message: 'Message sent' });
  } catch (error) {
    next(error);
  }
};

export const sendBroadcast = async (req, res, next) => {
  try {
    const { target, message, scheduledAt } = req.body;
    if (!target || !message) {
      return res.status(400).json({ error: 'Target and message are required' });
    }

    const broadcast = await Broadcast.create({
      target,
      message,
      adminJid: req.session?.jid || 'unknown',
      status: scheduledAt ? 'scheduled' : 'sending',
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined
    });

    if (!scheduledAt) {
      const ok = socketService.sendToBot('bot:command', {
        command: 'broadcast',
        target,
        message,
        broadcastId: String(broadcast._id)
      });

      if (!ok) {
        broadcast.status = 'failed';
        await broadcast.save();
        return res.status(503).json({ error: 'Bot is offline or not connected' });
      }
    }

    await logAction({
      req,
      action: 'SEND_BROADCAST',
      details: { target, messageLength: message.length, scheduled: !!scheduledAt }
    });

    res.json({ ok: true, message: scheduledAt ? 'Broadcast scheduled' : 'Broadcast sending', broadcast });
  } catch (error) {
    next(error);
  }
};

export const getBroadcasts = async (_req, res, next) => {
  try {
    const broadcasts = await Broadcast.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json(broadcasts);
  } catch (error) {
    next(error);
  }
};

export const getBotHealth = (_req, res) => {
  const status = botService.getStatus();
  const health = socketService.botHealth || {};
  res.json({
    ...status,
    ...health,
    wsConnected: !!socketService.botSocket
  });
};
