import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { EventEmitter } from 'events';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BotService extends EventEmitter {
  constructor() {
    super();
    this.botProcess = null;
    this.status = 'offline'; // offline, starting, online
    this.pairingCode = null;
    this.logs = [];
    this.uptime = null;
    this.lastReconnect = null;
    // Path to bot project root (assuming sibling to webapp)
    this.botPath = path.resolve(__dirname, '../../../mybot');
  }

  start() {
    if (this.botProcess) return;

    this.status = 'starting';
    this.uptime = new Date();
    this.emit('status', this.status);

    this.botProcess = spawn('node', ['src/index.js'], {
      cwd: this.botPath,
      env: { ...process.env, NODE_ENV: 'production' }
    });

    this.botProcess.stdout.on('data', (data) => {
      const output = data.toString();
      this.addLog(output);
      
      // Basic regex to catch pairing code from console
      const pairingMatch = output.match(/Your Pairing Code: ([A-Z0-9-]+)/);
      if (pairingMatch) {
        this.pairingCode = pairingMatch[1];
        this.emit('pairingCode', this.pairingCode);
      }

      if (output.includes('Opened connection to WhatsApp')) {
        this.status = 'online';
        this.pairingCode = null;
        this.emit('status', this.status);
      }
    });

    this.botProcess.stderr.on('data', (data) => {
      const output = data.toString();
      this.addLog(output, 'error');
    });

    this.botProcess.on('close', (code) => {
      this.addLog(`Bot process exited with code ${code}`);
      this.botProcess = null;
      this.status = 'offline';
      this.uptime = null;
      this.emit('status', this.status);
    });
  }

  stop() {
    if (this.botProcess) {
      this.botProcess.kill('SIGINT');
    }
  }

  restart() {
    this.stop();
    setTimeout(() => this.start(), 2000);
  }

  addLog(message, type = 'info') {
    const logEntry = { timestamp: new Date(), message: message.trim(), type };
    this.logs.push(logEntry);
    if (this.logs.length > 500) this.logs.shift();
    this.emit('log', logEntry);
  }

  getStatus() {
    return {
      status: this.status,
      uptime: this.uptime,
      lastReconnect: this.lastReconnect,
      pairingCode: this.pairingCode
    };
  }

  sendInput(data) {
    if (this.botProcess && this.botProcess.stdin) {
      this.botProcess.stdin.write(data + '');
    }
  }
}

export const botService = new BotService();
