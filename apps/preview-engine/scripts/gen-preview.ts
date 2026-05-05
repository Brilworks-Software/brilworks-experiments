#!/usr/bin/env -S tsx
// CLI: scaffold a static preview JSON for a single business slug.
//
// Usage:
//   pnpm gen:preview --slug sangam-thali-surat \
//                    --fixture apps/preview-engine/lib/fixtures/restaurants/sangam-thali-surat.json
//
// Optional flags:
//   --out <path>      write to a custom path instead of content/previews/<slug>.json
//   --print-prompt    print the agent-facing prompt to stderr (useful when
//                     piping into an editor session) instead of just writing
//                     the scaffold JSON.
//
// What this does:
//   - Validates the fixture against the Business shape.
//   - Picks the category-keyed Unsplash hero (no Places photos — R3).
//   - Writes a draft preview JSON with placeholder copy clearly marked
//     "DRAFT — …". The agent (Claude Code) running the heartbeat then
//     rewrites the tagline/blurb1/blurb2 fields in-place following the
//     prompt in lib/generator/restaurant.ts. No Anthropic SDK call.
//
// Exit codes:
//   0 success, 1 usage error, 2 fixture validation error.

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

import type { Business } from "../lib/types/business";
import { buildRestaurantPrompt, scaffoldDraftCopy } from "../lib/generator/restaurant";
import { heroForCategory } from "../lib/hero/unsplash";
import { writePreview, type PreviewRecord } from "../lib/content/store";

type Args = { slug?: string; fixture?: string; out?: string; printPrompt?: boolean };

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
      case "--out":
        out.out = argv[++i];
        break;
      case "--print-prompt":
        out.printPrompt = true;
        break;
      default:
        throw new Error(`Unknown argument: ${a}`);
    }
  }
  return out;
}

function usage(): never {
  process.stderr.write(
    "Usage: pnpm gen:preview --slug <slug> --fixture <path> [--out <path>] [--print-prompt]\n",
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

  const record: PreviewRecord = {
    schemaVersion: 1,
    business,
    hero: heroForCategory(business.category),
    generated: scaffoldDraftCopy(business),
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

  if (args.printPrompt) {
    const { system, user } = buildRestaurantPrompt(business);
    process.stderr.write("\n--- system ---\n");
    process.stderr.write(system + "\n");
    process.stderr.write("\n--- user ---\n");
    process.stderr.write(user + "\n\n");
  }

  process.stdout.write(`Scaffold written: ${written}\n`);
  process.stdout.write(`Preview path: /r/${business.slug}\n`);
  process.stdout.write(
    `Next: rewrite tagline/blurb1/blurb2 in that file (style spec in lib/generator/restaurant.ts) and set "source": "agent-written".\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`Unhandled error: ${(err as Error).stack ?? String(err)}\n`);
  process.exit(1);
});
