import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Add it to the environment before starting the app.');
  process.exit(1);
}

// Most hosted Postgres providers (Render, Railway, Neon, Supabase) require SSL.
// Set DATABASE_SSL=false for a local database without SSL.
const useSsl = process.env.DATABASE_SSL !== 'false' && !/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(pool, { schema });
export { schema };
