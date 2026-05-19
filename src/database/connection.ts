import { Pool, PoolClient } from 'pg';
import { config } from '../config';
import { logger } from '../utils/logger';

const projectRef = new URL(config.SUPABASE_URL).hostname.split('.')[0];

const pool = new Pool({
  host: 'aws-0-sa-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: `postgres.${projectRef}`,
  password: config.DB_PASSWORD,
  max: config.DATABASE_MAX_CONNECTIONS,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
  ssl: { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  logger.error({ err }, 'PostgreSQL pool error inesperado');
});

pool.on('connect', () => {
  logger.debug('Nova conexão PostgreSQL estabelecida');
});

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug({ duration, rows: result.rowCount }, 'Query executada');
    return result.rows as T[];
  } catch (err) {
    logger.error({ err, text, params }, 'Erro na query PostgreSQL');
    throw err;
  }
}

export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

export { pool };
