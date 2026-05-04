import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn("[db] DATABASE_URL not set – database features disabled. Set it in your environment.");
}

export const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : (null as unknown as InstanceType<typeof Pool>);

export const db = process.env.DATABASE_URL
  ? drizzle(pool, { schema })
  : (null as unknown as ReturnType<typeof drizzle<typeof schema>>);

export async function runMigrations(): Promise<void> {
  if (!pool) {
    console.warn("[db] Skipping migrations – DATABASE_URL not set");
    return;
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS fb_accounts (
      id SERIAL PRIMARY KEY,
      uid TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '',
      avatar TEXT NOT NULL DEFAULT '',
      cookie TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT true,
      last_used TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log("[db] Migrations complete – fb_accounts table ready");
}

export * from "./schema";
