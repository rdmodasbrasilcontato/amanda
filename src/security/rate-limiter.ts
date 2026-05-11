import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { logger } from '../utils/logger';

export const generalRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: config.RATE_LIMIT_PER_MINUTE,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn({ ip: req.ip, path: req.path }, 'Rate limit atingido');
    res.status(429).json({ error: 'Muitas requisições. Tente novamente em breve.' });
  },
});

export const webhookRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.headers['x-forwarded-for'] as string ?? req.ip ?? 'unknown',
});

export const adminRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

export function requireAdminKey(
  req: import('express').Request,
  res: import('express').Response,
  next: import('express').NextFunction
): void {
  const key = req.headers['x-admin-key'] ?? req.headers['authorization']?.replace('Bearer ', '');
  if (key !== config.ADMIN_API_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}
