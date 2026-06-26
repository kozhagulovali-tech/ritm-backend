import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Большинство облачных Postgres (Supabase/Neon/Railway) требуют SSL.
  // Для локальной базы на localhost SSL обычно не нужен.
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

export async function query(text, params) {
  return pool.query(text, params);
}
