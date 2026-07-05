import { Pool } from "pg";

let pool = null;
let migrated = false;

export function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL is not set. This app needs a Postgres connection string — " +
          "see README.md for how to get a free one from Supabase/Neon/Railway."
      );
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Most managed free-tier Postgres providers (Supabase, Neon, Railway) require SSL.
      // rejectUnauthorized:false is what these providers' own quickstart docs recommend
      // for their pooled connection strings with self-signed intermediate certs.
      ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
    });
  }
  return pool;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scans (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scan_type TEXT NOT NULL,
  content TEXT NOT NULL,
  result TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  risk_score INTEGER NOT NULL,
  reasons JSONB NOT NULL DEFAULT '[]',
  domain_age JSONB,
  virus_total JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scans_user_id ON scans(user_id);

CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scan_id INTEGER NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  risk_score INTEGER NOT NULL,
  summary TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);

CREATE TABLE IF NOT EXISTS custom_keywords (
  id SERIAL PRIMARY KEY,
  keyword TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

/**
 * Idempotent — safe to call on every cold start. Uses CREATE TABLE IF NOT
 * EXISTS so it never touches existing data. Memoized per server process so
 * it only actually runs once per running instance.
 */
export async function migrate() {
  if (migrated) return;
  const p = getPool();
  await p.query(SCHEMA);
  migrated = true;
}

export async function query(text, params) {
  await migrate();
  return getPool().query(text, params);
}
