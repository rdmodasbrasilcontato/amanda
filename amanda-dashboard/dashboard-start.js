// Script direto para PM2 iniciar o dashboard Next.js no Windows
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');

const PORT = parseInt(process.env.DASHBOARD_PORT || '3001', 10);
const dev = false;

const app = next({ dev, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(PORT, '0.0.0.0', () => {
    console.log(`Amanda Dashboard rodando em http://0.0.0.0:${PORT}`);
  });
}).catch(err => {
  console.error('Erro ao iniciar dashboard:', err);
  process.exit(1);
});
