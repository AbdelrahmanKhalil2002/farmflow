module.exports = {
  apps: [
    {
      name: 'farmflow-backend',
      script: './server.js',
      cwd: '/var/www/farmflow/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001,
      },
      error_file: '/var/log/farmflow/backend-error.log',
      out_file: '/var/log/farmflow/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
