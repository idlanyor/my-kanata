import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import cors from 'cors';
import http from 'http';
import { fileURLToPath } from 'url';
import { config } from './config/index.js';
import { rateLimiter } from './middlewares/rateLimiter.js';
import { socketService } from './services/socketService.js';
import { ensureDefaultAuthIdentities } from './services/authBootstrapService.js';
import { startStatsScheduler } from './services/statsScheduler.js';
import { startAutoRenewScheduler } from './services/autoRenewScheduler.js';

// Routes
import authRoutes from './routes/auth.js';
import serverRoutes from './routes/servers.js';
import settingsRoutes from './routes/settings.js';
import botRoutes from './routes/bot.js';
import commandRoutes from './routes/commands.js';
import dataRoutes from './routes/data.js';
import statsRoutes from './routes/stats.js';
import usersRoutes from './routes/users.js';
import voucherRoutes from './routes/vouchers.js';
import adminRoutes from './routes/admins.js';
import billingCatalogRoutes from './routes/billing-catalog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
socketService.init(server);

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(rateLimiter(200, 60000));
app.use(express.json());

// Serve Static Frontend
app.use(express.static(path.join(__dirname, '..', 'web', 'dist')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/commands', commandRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/billing-catalog', billingCatalogRoutes);

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'web', 'dist', 'index.html'));
});

// Error handling
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  const status = err.name === 'ValidationError' ? 400 : (err.status || 500);
  res.status(status).json({ error: err.message || 'Internal server error' });
});

mongoose
  .connect(config.mongoUri)
  .then(() => {
    const sessionStore = mongoose.connection.db.collection(config.sessionCollection);
    return Promise.all([
      sessionStore.createIndex({ sid: 1 }, { unique: true }),
      sessionStore.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
    ]);
  })
  .then(async () => {
    await ensureDefaultAuthIdentities();
  })
  .then(() => {
    startStatsScheduler();
    startAutoRenewScheduler();
    server.listen(config.port, () => {
      console.log(`mybot-webapp running on http://localhost:${config.port} [${config.nodeEnv}]`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
