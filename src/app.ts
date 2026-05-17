import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { generalRateLimit } from './security/rate-limiter';
import webhookRoutes from './routes/webhook.routes';
import adminRoutes from './routes/admin.routes';
import healthRoutes from './routes/health.routes';
import { logger } from './utils/logger';

const app = express();

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.set('trust proxy', 1);
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(generalRateLimit);

app.use((req, _res, next) => {
  logger.debug({ method: req.method, path: req.path, ip: req.ip }, 'Request recebida');
  next();
});

app.use('/health', healthRoutes);
app.use('/webhook', webhookRoutes);
app.use('/admin', adminRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'Erro não tratado');
  res.status(500).json({ error: 'Erro interno do servidor' });
});

export default app;
