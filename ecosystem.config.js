// ════════════════════════════════════════════════════════
// Amanda AI — Configuração PM2
// Documentação: https://pm2.keymetrics.io/docs/usage/application-declaration/
// ════════════════════════════════════════════════════════

require('dotenv').config();

module.exports = {
  apps: [
    {
      name: 'amanda-ai',
      script: 'dist/server.js',
      cwd: __dirname,

      // Instâncias e modo de execução
      instances: 1,
      exec_mode: 'fork',

      // Reinicialização automática
      watch: false,
      autorestart: true,
      max_restarts: 15,
      min_uptime: '10s',
      restart_delay: 4000,

      // Limite de memória antes de reiniciar (ajuste conforme RAM disponível)
      max_memory_restart: '512M',

      // Variáveis de ambiente — herdadas do .env via dotenv acima;
      // os valores abaixo servem como fallback/override explícito
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3000,
      },
      env_production: {
        NODE_ENV: 'production',
      },
      env_development: {
        NODE_ENV: 'development',
      },

      // Logs
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      merge_logs: true,
      log_type: 'json',

      // Desliga graciosamente antes de reiniciar
      kill_timeout: 5000,
      listen_timeout: 10000,

      // Interpretador
      interpreter: 'node',
      interpreter_args: '--max-old-space-size=512',
    },

    // ── Dashboard Next.js ────────────────────────────────
    {
      name: 'amanda-dashboard',
      script: 'amanda-dashboard/dashboard-start.js',
      cwd: __dirname,

      instances: 1,
      exec_mode: 'fork',

      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '15s',
      restart_delay: 5000,

      max_memory_restart: '512M',

      env: {
        NODE_ENV: 'production',
        DASHBOARD_PORT: 3001,
      },

      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      out_file: './logs/dashboard-out.log',
      error_file: './logs/dashboard-error.log',
      merge_logs: true,

      kill_timeout: 5000,
      listen_timeout: 30000,

      interpreter: 'node',
      interpreter_args: '--max-old-space-size=512',
    },
  ],
};
