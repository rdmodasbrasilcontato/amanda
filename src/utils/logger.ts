import pino from 'pino';
import { config } from '../config';

export const logger = pino({
  level: config.LOG_LEVEL,
  timestamp: pino.stdTimeFunctions.isoTime,
  transport:
    config.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
      : undefined,
  base: {
    app: config.APP_NAME,
    version: config.APP_VERSION,
    env: config.NODE_ENV,
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});

export function logEvent(
  event: string,
  data?: Record<string, unknown>,
  level: 'info' | 'debug' | 'warn' | 'error' = 'info'
): void {
  logger[level]({ event, ...data }, event);
}
