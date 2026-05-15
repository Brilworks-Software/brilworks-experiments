/**
 * Apply SQL migrations under db/migrations/ to a Neon Postgres database.
 *
 *   DATABASE_URL=postgres://... \
 *   pnpm --filter preview-engine exec tsx scripts/db-migrate.ts
 *
 * Migrations are plain Postgres DDL. Each file uses `create table if not exists`
 * / `create index if not exists`, so re-running is safe and the runner does not
 * track applied versions — keep that property when adding new files.
 *
 * For v0.0 this stays intentionally tiny. When we need ordered, versioned,
 * non-idempotent migrations (v0.1+), graduate to a real tool (drizzle-kit / atlas).
 */

import { readFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "@neondatabase/serverless";

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(here, "..", "..", "..", "db", "migrations");

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

async function main(): Promise<void> {
  const databaseUrl = requireEnv("DATABASE_URL");
  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log(`No .sql files found under ${MIGRATIONS_DIR}`);
    return;
  }

  const pool = new Pool({ connectionString: databaseUrl });
  try {
    for (const file of files) {
      const body = await readFile(join(MIGRATIONS_DIR, file), "utf8");
      console.log(`-- applying ${file}`);
      await pool.query(body);
    }
    console.log(`Applied ${files.length} migration(s).`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
