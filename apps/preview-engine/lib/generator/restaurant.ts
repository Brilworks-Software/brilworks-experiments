// Restaurant copy spec + draft scaffold for v0.0 preview pages.
//
// v0.0 deliberately has no programmatic LLM call. `pnpm gen:preview` is
// always run from a Paperclip heartbeat — the founding-engineer agent is the
// "model" — so we scaffold a placeholder JSON, the agent edits the file in
// the same heartbeat, and the page renders the result. No SDK, no API key,
// no billing line.
//
// `buildRestaurantPrompt` is kept as the editable spec the agent follows. The
// snapshot test pins copy drift, and if we ever automate generation in v0.1
// the prompt is ready to drop into an SDK call.
//
// Geo: independent restaurants, cafes, bars, bakeries in US / UK / Canada /
// Australia (BRI-181 geo=B). Section count tier: L2 (multi-section narrative)
// per the BRI-181 polish-tier proposal.

import type { Business } from "../types/business";

export type SignatureDish = {
  /** Plain dish name, 1-4 words. No prices, no asterisks. */
  name: string;
  /** One short line, 8-14 words. Evokes the dish, no superlatives. */
  line: string;
};

export type RestaurantCopy = {
  /** One-line tagline, ~6–10 words. Headline above the fold. */
  tagline: string;
  /** Neighborhood + city. e.g. "Williamsburg, Brooklyn". */
  neighborhood: string;
  /** First paragraph — 2–3 sentences, evokes the room and the food. */
  aboutP1: string;
  /** Second paragraph — 2–3 sentences, ends with a soft visit hook. */
  aboutP2: string;
  /** Three placeholder dishes. Marked as samples on the page. */
  signatureDishes: [SignatureDish, SignatureDish, SignatureDish];
};

export type DraftPreview = RestaurantCopy & {
  /** ISO timestamp the scaffold was emitted. */
  draftedAt: string;
  /**
   * "scaffold" until an agent has rewritten the copy; "agent-written" once
   * a human-or-agent pass has filled in real copy. The page treats both
   * the same way — this field is for tooling and review only.
   */
  source: "scaffold" | "agent-written";
};

export const SYSTEM_PROMPT = `You write short, warm, conversion-oriented website copy for independent restaurants, cafes, bakeries, and bars in the United States, United Kingdom, Canada, and Australia.

Style rules:
- Plain English, grade-8 reading level, no purple prose.
- No emoji. No exclamation marks. No "Welcome to ...". No "We are excited to ...".
- Mention the neighborhood or city when it is provided. Pick the more specific of the two if both are present.
- Refer to the menu category accurately ("seasonal bistro", "coffee shop", "bakery", "wine bar", "neighborhood pub") when it is obvious from the input.
- Never invent specific prices, awards, owner names, years in business, or chef credentials.
- Never reference the street address number or phone number in the body — those appear elsewhere on the page.
- Be specific about the *experience* (atmosphere, what a visit feels like) rather than generic claims like "high quality" or "best in town".
- For signature dishes, use plausible category-appropriate names. Do NOT copy real menu items from competitor restaurants. Each dish is a placeholder the owner will replace.

Output format: respond with a single JSON object, no Markdown fence, with exactly these keys: tagline, neighborhood, aboutP1, aboutP2, signatureDishes.
- tagline: 6 to 10 words, sentence case, no trailing punctuation.
- neighborhood: a short location label like "Williamsburg, Brooklyn" or "Fitzrovia, London". Use the most specific area that fits the address.
- aboutP1: 2 to 3 sentences, 40 to 70 words.
- aboutP2: 2 to 3 sentences, 40 to 70 words, ends with a low-pressure invitation to visit.
- signatureDishes: an array of exactly 3 objects, each with "name" (1-4 words) and "line" (8-14 words, one short evocative sentence, no period required).`;

/**
 * Pure: builds the prompt the agent (or a future SDK call) reads to write
 * copy. Snapshot-tested so style-rule edits are intentional.
 */
export function buildRestaurantPrompt(business: Business): {
  system: string;
  user: string;
} {
  return {
    system: SYSTEM_PROMPT,
    user: formatBusinessForPrompt(business),
  };
}

function formatBusinessForPrompt(b: Business): string {
  const lines = [
    `Business: ${b.name}`,
    `Category (Google Places type): ${b.category}`,
  ];
  if (b.locality) lines.push(`City: ${b.locality}`);
  // Address is included for grounding (city + neighbourhood) but the prompt
  // forbids mentioning the street number.
  lines.push(`Address (do not quote): ${b.address}`);
  if (b.hours?.weekday_text?.length) {
    lines.push("Hours (do not enumerate, just glance for context):");
    for (const line of b.hours.weekday_text) lines.push(`  - ${line}`);
  }
  lines.push("");
  lines.push("Write the JSON object now.");
  return lines.join("\n");
}

export type ScaffoldOptions = {
  /** Injection seam for tests. */
  now?: () => Date;
};

/**
 * Build a placeholder copy block. The agent rewrites these strings before
 * the preview goes out — the page will render the scaffold as-is if it
 * doesn't, which is intentionally obvious so a forgotten rewrite is caught
 * in review.
 */
export function scaffoldDraftCopy(
  business: Business,
  opts: ScaffoldOptions = {},
): DraftPreview {
  const now = (opts.now ?? (() => new Date()))();
  const where = business.locality ? ` in ${business.locality}` : "";
  const what = humanCategory(business.category);
  const draftDish = (n: number): SignatureDish => ({
    name: `DRAFT — Dish ${n}`,
    line: `DRAFT one-liner for dish ${n}. Replace with 8–14 words evoking the dish.`,
  });
  return {
    tagline: `DRAFT — ${business.name} (${what}${where})`,
    neighborhood: business.locality ?? "DRAFT — neighborhood",
    aboutP1: `DRAFT scaffold for ${business.name}. Rewrite this paragraph following the style spec in lib/generator/restaurant.ts (SYSTEM_PROMPT). Two to three sentences, 40–70 words, evoking the room and the food.`,
    aboutP2: `DRAFT scaffold continued. Rewrite this paragraph as the second blurb — 2–3 sentences, 40–70 words, ending with a low-pressure invitation to visit. Do not invent prices, owner names, or awards.`,
    signatureDishes: [draftDish(1), draftDish(2), draftDish(3)],
    draftedAt: now.toISOString(),
    source: "scaffold",
  };
}

function humanCategory(category: string): string {
  const map: Record<string, string> = {
    indian_restaurant: "Indian restaurant",
    restaurant: "restaurant",
    cafe: "cafe",
    bakery: "bakery",
    bar: "bar",
  };
  return map[category] ?? "place to eat";
}
