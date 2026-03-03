import { Server } from 'socket.io';
import { config } from '../config/index.js';
import { botService } from './botService.js';
import { incrementCounter } from './statsScheduler.js';
import os from 'node:os';
import fs from 'node:fs/promises';

class SocketService {
  constructor() {
    this.io = null;
    this.botSocket = null;
    this.uiSockets = new Set();
    this.vpsMetricsInterval = null;
    this.botHealth = null;
  }

  init(server) {
    this.io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    this.io.on('connection', (socket) => {
      const type = socket.handshake.query.type;
      const auth = socket.handshake.query.auth;

      // Simple auth check for internal bot connection
      if (type === 'bot') {
        if (auth !== config.accessKey) {
          console.log('[Socket] Unauthorized bot attempt');
          return socket.disconnect();
        }
        this.botSocket = socket;
        console.log('[Socket] Bot connected via WS');
        botService.status = 'online';
        
        socket.on('bot:status', (data) => {
            if (data.status) botService.status = data.status;
            this.io.emit('ui:bot-status', data);
        });

        socket.on('bot:log', (data) => {
            this.io.emit('ui:bot-log', data);
        });

        socket.on('bot:counter', (data) => {
            if (data.type) incrementCounter(data.type);
        });

        socket.on('bot:health', (data) => {
            this.botHealth = data;
            this.io.emit('ui:bot-health', data);
        });

        socket.on('disconnect', () => {
          console.log('[Socket] Bot disconnected');
          this.botSocket = null;
          // Only set to offline if it was previously online via WS
          if (botService.status === 'online') {
              botService.status = 'offline';
          }
        });
      } else {
        // UI clients: track active sockets for server metrics broadcast
        this.uiSockets.add(socket.id);
        this.startVpsMetricsBroadcast();

        socket.on('disconnect', () => {
          this.uiSockets.delete(socket.id);
          if (this.uiSockets.size === 0) {
            this.stopVpsMetricsBroadcast();
          }
        });
      }
    });
  }

  async collectVpsMetrics() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = Math.max(totalMem - freeMem, 0);
    const load = os.loadavg();
    const cpuCount = os.cpus()?.length || 1;
    let diskTotal = 0;
    let diskUsed = 0;
    let diskFree = 0;

    try {
      const stat = await fs.statfs('/');
      const blockSize = Number(stat.bsize || 0);
      const blocks = Number(stat.blocks || 0);
      const freeBlocks = Number(stat.bavail || stat.bfree || 0);
      diskTotal = blockSize * blocks;
      diskFree = blockSize * freeBlocks;
      diskUsed = Math.max(diskTotal - diskFree, 0);
    } catch (_error) {
      // keep zero values if statfs is unavailable
    }

    return {
      updatedAt: new Date().toISOString(),
      hostname: os.hostname(),
      platform: `${os.type()} ${os.release()}`,
      cpuCount,
      load1: Number(load[0] || 0),
      load5: Number(load[1] || 0),
      load15: Number(load[2] || 0),
      memoryTotalBytes: totalMem,
      memoryUsedBytes: usedMem,
      memoryFreeBytes: freeMem,
      diskTotalBytes: diskTotal,
      diskUsedBytes: diskUsed,
      diskFreeBytes: diskFree,
      uptimeSec: Math.floor(os.uptime())
    };
  }

  async broadcastVpsMetrics() {
    if (!this.io || this.uiSockets.size === 0) return;
    try {
      const payload = await this.collectVpsMetrics();
      this.io.emit('ui:vps-metrics', payload);
    } catch (_error) {
      this.io.emit('ui:vps-metrics', { updatedAt: new Date().toISOString() });
    }
  }

  startVpsMetricsBroadcast() {
    if (this.vpsMetricsInterval) return;
    // Send first snapshot immediately, then update periodically.
    this.broadcastVpsMetrics();
    this.vpsMetricsInterval = setInterval(() => {
      this.broadcastVpsMetrics();
    }, 10000);
  }

  stopVpsMetricsBroadcast() {
    if (!this.vpsMetricsInterval) return;
    clearInterval(this.vpsMetricsInterval);
    this.vpsMetricsInterval = null;
  }

  // Method to send event to bot
  sendToBot(event, data) {
    if (this.botSocket) {
      this.botSocket.emit(event, data);
      return true;
    }
    return false;
  }
}

export const socketService = new SocketService();
