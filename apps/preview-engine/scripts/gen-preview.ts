#!/usr/bin/env -S tsx
// CLI: generate a static preview JSON for a single business slug.
//
// Usage:
//   pnpm gen:preview --slug sangam-thali-surat \
//                    --fixture apps/preview-engine/lib/fixtures/restaurants/sangam-thali-surat.json
//
// Optional flags:
//   --dry-run       use the deterministic stub copy even if ANTHROPIC_API_KEY is set
//   --out <path>    write to a custom path instead of content/previews/<slug>.json
//
// Exit codes:
//   0 success, 1 usage error, 2 fixture validation error, 3 generator error.

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

import type { Business } from "../lib/types/business";
import { generateRestaurantCopy } from "../lib/generator/restaurant";
import { heroForCategory } from "../lib/hero/unsplash";
import { writePreview, type PreviewRecord } from "../lib/content/store";

type Args = { slug?: string; fixture?: string; dryRun?: boolean; out?: string };

function parseArgs(argv: string[]): Args {
  const out: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--slug":
        out.slug = argv[++i];
        break;
      case "--fixture":
        out.fixture = argv[++i];
        break;
      case "--dry-run":
        out.dryRun = true;
        break;
      case "--out":
        out.out = argv[++i];
        break;
      default:
        throw new Error(`Unknown argument: ${a}`);
    }
  }
  return out;
}

function usage(): never {
  process.stderr.write(
    "Usage: pnpm gen:preview --slug <slug> --fixture <path> [--dry-run] [--out <path>]\n",
  );
  process.exit(1);
}

function isBusiness(value: unknown): value is Business {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.slug === "string" &&
    typeof v.name === "string" &&
    typeof v.category === "string" &&
    typeof v.address === "string"
  );
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.slug || !args.fixture) usage();

  // pnpm switches cwd to the workspace package, but users pass paths relative
  // to where they ran the command. INIT_CWD captures the original cwd.
  const callerCwd = process.env.INIT_CWD ?? process.cwd();
  const fixturePath = path.resolve(callerCwd, args.fixture);
  let raw: string;
  try {
    raw = await fs.readFile(fixturePath, "utf8");
  } catch (err) {
    process.stderr.write(`Could not read fixture: ${(err as Error).message}\n`);
    process.exit(2);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    process.stderr.write(`Fixture is not valid JSON: ${(err as Error).message}\n`);
    process.exit(2);
  }
  if (!isBusiness(parsed)) {
    process.stderr.write("Fixture does not match Business shape (need slug, name, category, address).\n");
    process.exit(2);
  }
  const business = parsed as Business;
  if (business.slug !== args.slug) {
    process.stderr.write(
      `Slug mismatch: --slug is "${args.slug}" but fixture says "${business.slug}". Pick one.\n`,
    );
    process.exit(2);
  }

  let generated;
  try {
    generated = await generateRestaurantCopy(business, { dryRun: args.dryRun });
  } catch (err) {
    process.stderr.write(`Generator failed: ${(err as Error).message}\n`);
    process.exit(3);
  }

  const record: PreviewRecord = {
    schemaVersion: 1,
    business,
    hero: heroForCategory(business.category),
    generated,
  };

  let written: string;
  if (args.out) {
    const target = path.resolve(callerCwd, args.out);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, JSON.stringify(record, null, 2) + "\n", "utf8");
    written = target;
  } else {
    written = await writePreview(record);
  }

  const mode = generated.isStub ? "stub copy (set ANTHROPIC_API_KEY for Haiku)" : `model ${generated.modelId}`;
  process.stdout.write(`Wrote ${written}\nGenerated using: ${mode}\n`);
  process.stdout.write(`Preview path: /r/${business.slug}\n`);
}

main().catch((err) => {
  process.stderr.write(`Unhandled error: ${(err as Error).stack ?? String(err)}\n`);
  process.exit(3);
});
