import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 3000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/mywhatsappbot',
  accessKey: process.env.ACCESS_KEY || 'sakurazaka46',
  superadminPassword: process.env.SUPERADMIN_PASSWORD || 'roy12345',
  invoiceApiKey: process.env.INVOICE_API_KEY || '',
  invoiceFromName: process.env.INVOICE_FROM_NAME || 'Kanata Store',
  botWebhookUrl: process.env.BOT_WEBHOOK_URL || 'http://127.0.0.1:8787',
  botWebhookToken: process.env.BOT_WEBHOOK_TOKEN || '',
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  sessionTtlMs: 1000 * 60 * 60 * 12, // 12 hours
  sessionCollection: 'web_sessions'
};
