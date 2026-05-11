import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { pool } from './connection';
import { logger } from '../utils/logger';

async function runMigrations(): Promise<void> {
  const client = await pool.connect();

  try {
    // Criar tabela de controle de migrations se não existir
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    VARCHAR(100) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const migrationsDir = join(__dirname, 'migrations');
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const version = file.replace('.sql', '');

      const { rows } = await client.query(
        'SELECT version FROM schema_migrations WHERE version = $1',
        [version]
      );

      if (rows.length > 0) {
        logger.info({ version }, 'Migration já aplicada, pulando');
        continue;
      }

      logger.info({ version }, 'Aplicando migration...');

      const sql = readFileSync(join(migrationsDir, file), 'utf-8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (version) VALUES ($1)',
          [version]
        );
        await client.query('COMMIT');
        logger.info({ version }, '✅ Migration aplicada com sucesso');
      } catch (err) {
        await client.query('ROLLBACK');
        logger.error({ err, version }, '❌ Erro na migration — rollback realizado');
        throw err;
      }
    }

    logger.info('✅ Todas as migrations aplicadas');
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch(err => {
  console.error('Erro nas migrations:', err);
  process.exit(1);
});
