/**
 * Manual smoke test for BRI-180.
 *
 *   PLACES_LIVE=1 \
 *   GOOGLE_PLACES_API_KEY=... \
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   pnpm --filter preview-engine exec tsx scripts/smoke-places.ts
 *
 * Hits the live Places API for 3 known Surat restaurants and asserts that:
 *   - lookupBusiness() returns the expected struct shape.
 *   - One spend_log row per call lands in Supabase.
 *
 * Real cost: 3 lookups × ~$0.052 ≈ $0.16 against the $20 cap.
 */

import { lookupBusiness } from "../lib/maps/places";
import { SupabaseSpendLog } from "../lib/maps/spend-log";

const TARGETS: Array<{ query: string; locality: string }> = [
  { query: "Surati Farsan Mart", locality: "Surat" },
  { query: "Sankalp Restaurant", locality: "Surat" },
  { query: "Jagdish Farsan", locality: "Surat" },
];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

async function main(): Promise<void> {
  if (process.env.PLACES_LIVE !== "1") {
    console.error(
      "Refusing to run: PLACES_LIVE!=1 — this smoke hits the live billed API.",
    );
    process.exit(1);
  }

  const apiKey = requireEnv("GOOGLE_PLACES_API_KEY");
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const supabaseKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const spendLog = new SupabaseSpendLog({
    url: supabaseUrl,
    serviceRoleKey: supabaseKey,
  });

  const before = await spendLog.totalSpentUsd();
  console.log(`Spend before: $${before.toFixed(4)}`);

  for (const target of TARGETS) {
    console.log(`\n--- ${target.query} (${target.locality}) ---`);
    try {
      const result = await lookupBusiness(target.query, target.locality, {
        apiKey,
        spendLog,
      });
      console.log(JSON.stringify(result, null, 2));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`FAILED: ${message}`);
    }
  }

  const after = await spendLog.totalSpentUsd();
  console.log(`\nSpend after: $${after.toFixed(4)} (delta $${(after - before).toFixed(4)})`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
