import type { SpendEntry, SpendLog } from "./types";

const TABLE = "places_spend_log";

export interface SupabaseSpendLogConfig {
  url: string; // e.g. https://abcd.supabase.co
  serviceRoleKey: string;
  fetcher?: typeof fetch;
}

// Talks to Supabase PostgREST directly so we don't pull @supabase/supabase-js
// into the preview-engine bundle for two REST calls. Service role key is
// SERVER-ONLY — never instantiate this in client components.
export class SupabaseSpendLog implements SpendLog {
  private readonly fetcher: typeof fetch;
  private readonly base: string;
  private readonly headers: Record<string, string>;

  constructor(config: SupabaseSpendLogConfig) {
    this.fetcher = config.fetcher ?? fetch;
    this.base = `${config.url.replace(/\/$/, "")}/rest/v1/${TABLE}`;
    this.headers = {
      "Content-Type": "application/json",
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
    };
  }

  async totalSpentUsd(): Promise<number> {
    const res = await this.fetcher(`${this.base}?select=cost_usd`, {
      headers: this.headers,
    });
    if (!res.ok) {
      throw new Error(
        `spend log read failed: ${res.status} ${await res.text()}`,
      );
    }
    const rows = (await res.json()) as Array<{ cost_usd: number | string }>;
    return rows.reduce((sum, row) => sum + Number(row.cost_usd), 0);
  }

  async record(entry: SpendEntry): Promise<void> {
    const res = await this.fetcher(this.base, {
      method: "POST",
      headers: { ...this.headers, Prefer: "return=minimal" },
      body: JSON.stringify({
        query: entry.query,
        locality: entry.locality,
        call_kind: entry.callKind,
        cost_usd: entry.costUsd,
        succeeded: entry.succeeded,
        place_id: entry.placeId ?? null,
        error_code: entry.errorCode ?? null,
        error_message: entry.errorMessage ?? null,
      }),
    });
    if (!res.ok) {
      throw new Error(
        `spend log write failed: ${res.status} ${await res.text()}`,
      );
    }
  }
}
