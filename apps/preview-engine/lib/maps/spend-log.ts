import type { SpendEntry, SpendLog } from "./types";

// Minimal Postgres executor surface. Matches what `pg.Pool.query(text, params)`
// exposes and what `@neondatabase/serverless` `Pool.query(text, params)` exposes.
// Tests inject a fake. Production wires the Neon Pool in `pgSpendLogFromDatabaseUrl`.
//
// We deliberately do NOT hard-depend on a specific driver here. Swapping providers
// later is a one-line change in the factory — the adapter and circuit breaker do not move.
export type PgQueryFn = (
  sql: string,
  params?: unknown[],
) => Promise<Array<Record<string, unknown>>>;

export class PgSpendLog implements SpendLog {
  constructor(private readonly query: PgQueryFn) {}

  async totalSpentUsd(): Promise<number> {
    const rows = await this.query(
      "select coalesce(sum(cost_usd), 0)::float as total from places_spend_log",
      [],
    );
    const total = rows[0]?.total ?? 0;
    return Number(total);
  }

  async record(entry: SpendEntry): Promise<void> {
    await this.query(
      `insert into places_spend_log
         (query, locality, call_kind, cost_usd, succeeded, place_id, error_code, error_message)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        entry.query,
        entry.locality,
        entry.callKind,
        entry.costUsd,
        entry.succeeded,
        entry.placeId ?? null,
        entry.errorCode ?? null,
        entry.errorMessage ?? null,
      ],
    );
  }
}

// Factory: wire the Neon Pool (Postgres protocol over WebSocket) against a
// connection string. Server-only — DATABASE_URL must never reach the browser bundle.
//
// Uses dynamic import so unit tests that only construct PgSpendLog directly
// never load the driver. Each call creates a fresh Pool; for a long-running
// server route we'd cache the pool — for the smoke script and serverless
// per-request use, a fresh pool is fine and avoids leaking connections.
export function pgSpendLogFromDatabaseUrl(databaseUrl: string): PgSpendLog {
  const query: PgQueryFn = async (sql, params = []) => {
    const { Pool } = await import("@neondatabase/serverless");
    const pool = new Pool({ connectionString: databaseUrl });
    try {
      const result = await pool.query(sql, params);
      return result.rows as Array<Record<string, unknown>>;
    } finally {
      await pool.end();
    }
  };
  return new PgSpendLog(query);
}
