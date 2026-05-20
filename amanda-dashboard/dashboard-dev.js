// Inicia o dashboard em modo desenvolvimento (compila sob demanda, sem build prévio)
// Ideal para Windows quando o `next build` trava. PM2 executa este arquivo direto.
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const PORT = parseInt(process.env.DASHBOARD_PORT || '3001', 10);

const app = next({ dev: true, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(PORT, '0.0.0.0', () => {
    console.log(`Amanda Dashboard (DEV) rodando em http://0.0.0.0:${PORT}`);
  });
}).catch(err => {
  console.error('Erro ao iniciar dashboard (dev):', err);
  process.exit(1);
});
