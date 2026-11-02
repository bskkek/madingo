import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    const dbUrl =
      process.env.NETLIFY_DB_URL ||
      process.env.SQL_DB_URL ||
      process.env.NETLIFY_DATABASE_URL ||
      process.env.DATABASE_URL ||
      '';
    let pool: Pool;
    if (dbUrl) {
      const u = new URL(dbUrl);
      const isLocal =
        u.hostname === 'localhost' ||
        u.hostname === '127.0.0.1' ||
        u.searchParams.get('sslmode') === 'disable';
      pool = new Pool({
        connectionString: dbUrl,
        ssl: isLocal
          ? undefined
          : { rejectUnauthorized: false },
        max: 10,
        connectionTimeoutMillis: 15000,
      });
    } else {
      pool = new Pool({
        host: process.env.SQL_HOST,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
        max: 10,
        connectionTimeoutMillis: 15000,
      });
    }
    global._postgresPool = pool;

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

const pool = createPool();

export const db = drizzle(pool, { schema });
