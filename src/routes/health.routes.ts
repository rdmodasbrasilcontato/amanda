import { Router } from 'express';
import { checkDatabaseConnection } from '../database/connection';
import { config } from '../config';

const router = Router();

router.get('/', async (_req, res) => {
  const dbOk = await checkDatabaseConnection();
  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'healthy' : 'unhealthy',
    app: config.APP_NAME,
    version: config.APP_VERSION,
    database: dbOk ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

export default router;
