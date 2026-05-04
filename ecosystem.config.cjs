module.exports = {
  apps: [
    {
      name: 'kanata-bot',
      script: 'src/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      kill_timeout: 3000,
      env: {
        NODE_ENV: 'production',
      },
      exp_backoff_restart_delay: 100,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/pm2-err.log',
      out_file: './logs/pm2-out.log',
      combine_logs: true
    },
  ],
};
