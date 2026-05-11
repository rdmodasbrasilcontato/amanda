import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { generalRateLimit } from './security/rate-limiter';
import webhookRoutes from './routes/webhook.routes';
import adminRoutes from './routes/admin.routes';
import healthRoutes from './routes/health.routes';
import { logger } from './utils/logger';
import { config } from './config';

const app = express();

// ── Segurança ──
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.set('trust proxy', 1);

// ── CORS ──
const allowedOrigins = config.ALLOWED_ORIGINS.split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key', 'x-webhook-token'],
}));

// ── Parsing ──
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Rate Limit Geral ──
app.use(generalRateLimit);

// ── Request logging ──
app.use((req, _res, next) => {
  logger.debug({ method: req.method, path: req.path, ip: req.ip }, 'Request recebida');
  next();
});

// ── Rotas ──
app.use('/health', healthRoutes);
app.use('/webhook', webhookRoutes);
app.use('/admin', adminRoutes);

// ── 404 ──
app.use((_req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// ── Error handler ──
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'Erro não tratado na aplicação');
  res.status(500).json({ error: 'Erro interno do servidor' });
});

export default app;
