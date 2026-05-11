import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (!config.REDIS_URL) return null;
  if (redisClient) return redisClient;

  redisClient = new Redis(config.REDIS_URL, {
    tls: config.REDIS_TLS ? {} : undefined,
    retryStrategy: (times) => {
      if (times > 5) return null;
      return Math.min(times * 500, 3000);
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
  });

  redisClient.on('connect', () => logger.info('Redis conectado'));
  redisClient.on('error', (err) => logger.error({ err }, 'Redis error'));
  redisClient.on('reconnecting', () => logger.warn('Redis reconectando...'));

  return redisClient;
}

export async function redisGet(key: string): Promise<string | null> {
  const client = getRedisClient();
  if (!client) return null;
  return client.get(key);
}

export async function redisSet(
  key: string,
  value: string,
  ttlSeconds?: number
): Promise<void> {
  const client = getRedisClient();
  if (!client) return;
  if (ttlSeconds) {
    await client.set(key, value, 'EX', ttlSeconds);
  } else {
    await client.set(key, value);
  }
}

export async function redisDel(key: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return;
  await client.del(key);
}

export async function redisExists(key: string): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;
  return (await client.exists(key)) === 1;
}

export async function redisIncr(key: string, ttlSeconds?: number): Promise<number> {
  const client = getRedisClient();
  if (!client) return 0;
  const val = await client.incr(key);
  if (ttlSeconds && val === 1) {
    await client.expire(key, ttlSeconds);
  }
  return val;
}
