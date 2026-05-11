import { Router } from 'express';
import { checkDatabaseConnection } from '../database/connection';
import { config } from '../config';

const router = Router();

router.get('/', async (_req, res) => {
  const dbOk = await checkDatabaseConnection();
  res.json({
    status: dbOk ? 'healthy' : 'degraded',
    app: config.APP_NAME,
    version: config.APP_VERSION,
    environment: config.NODE_ENV,
    timestamp: new Date().toISOString(),
    database: dbOk ? 'connected' : 'disconnected',
  });
});

export default router;
