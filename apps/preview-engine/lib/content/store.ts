// Filesystem-backed store for generated previews.
//
// One JSON file per slug under `content/previews/`, committed to the repo so
// the Next.js static build can read it without a runtime API call. Schema
// validation is intentionally light — the CLI controls what gets written.

import { promises as fs } from "node:fs";
import path from "node:path";

import type { Business } from "../types/business";
import type { GeneratedPreview } from "../generator/restaurant";
import type { HeroPhoto } from "../hero/unsplash";

const PREVIEW_SCHEMA_VERSION = 1;

export type PreviewRecord = {
  schemaVersion: typeof PREVIEW_SCHEMA_VERSION;
  business: Business;
  hero: HeroPhoto;
  generated: GeneratedPreview;
};

// Both `next build` (cwd = apps/preview-engine) and the CLI (cwd = repo root,
// or wherever pnpm/tsx was invoked) need to land on the same content/previews/
// directory inside the app. Resolve from this file's location instead of cwd
// so caller cwd does not matter.
const STORE_DIR = path.dirname(new URL(import.meta.url).pathname);
const PREVIEWS_DIR = path.resolve(STORE_DIR, "..", "..", "content", "previews");

function resolvePreviewsDir(): string {
  return PREVIEWS_DIR;
}

export async function writePreview(record: PreviewRecord): Promise<string> {
  const dir = resolvePreviewsDir();
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${record.business.slug}.json`);
  await fs.writeFile(file, JSON.stringify(record, null, 2) + "\n", "utf8");
  return file;
}

export async function readPreview(slug: string): Promise<PreviewRecord | null> {
  const file = path.join(resolvePreviewsDir(), `${slug}.json`);
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as PreviewRecord;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

export async function listPreviewSlugs(): Promise<string[]> {
  const dir = resolvePreviewsDir();
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
  return entries.filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")).sort();
}
