import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';

/**
 * Local dev: DATABASE_URL through cloud-sql-proxy.
 * Cloud Run: DB_SOCKET=/cloudsql/<connection-name> plus DB_USER/DB_NAME/DB_PASSWORD.
 */
function poolConfig(): pg.PoolConfig {
  if (process.env.DATABASE_URL) return { connectionString: process.env.DATABASE_URL, max: 5 };
  return {
    host: process.env.DB_SOCKET,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    max: 5,
  };
}

export const pool = new pg.Pool(poolConfig());
export const db = drizzle(pool, { schema });
export type Db = typeof db;
