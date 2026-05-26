module.exports = {
  apps: [{
    name: 'stylesynk-api',
    script: './src/app.js',
    cwd: '/home/ubuntu/StyleSynk/server',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '400M',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/home/ubuntu/logs/stylesynk-error.log',
    out_file: '/home/ubuntu/logs/stylesynk-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
