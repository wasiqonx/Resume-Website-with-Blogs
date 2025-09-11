// Modern Blog System - PM2 Ecosystem Configuration
// Author: Wasiq Syed
// Usage: pm2 start ecosystem.config.js
// Save: pm2 save
// Generate startup: pm2 startup

module.exports = {
  apps: [{
    name: 'modern-blog',
    script: 'server.js',

    // Basic settings
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',

    // Environment variables
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },

    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      NODE_PATH: '/home/deploy/.nvm/versions/node/v20.19.4/bin'
    },

    // Logging
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

    // Process management
    time: true,
    merge_logs: true,
    kill_timeout: 5000,

    // Advanced settings
    node_args: '--max-old-space-size=1024',
    exec_mode: 'fork',

    // Environment file
    env_file: '.env',

    // Health check (optional)
    // health_check: {
    //   enabled: true,
    //   url: 'http://localhost:3000/health',
    //   interval: 30000,
    //   timeout: 5000,
    //   retries: 3
    // }
  }],

  // Deployment configuration (optional)
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-vps-ip',
      ref: 'origin/main',
      repo: 'https://github.com/yourusername/Modern.git',
      path: '/home/deploy/Modern',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
