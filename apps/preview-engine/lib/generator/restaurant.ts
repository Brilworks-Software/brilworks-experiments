// Restaurant copy generator for the v0.0 preview pages.
//
// - Pure prompt builder (`buildRestaurantPrompt`) — snapshot-tested.
// - Async generator (`generateRestaurantCopy`) — calls Claude Haiku 4.5 with a
//   cached system prompt, parses a JSON response. Falls back to a deterministic
//   stub when ANTHROPIC_API_KEY is missing or `dryRun: true` is passed, so the
//   build pipeline works without a key. Real outreach copy (BRI-182 D4)
//   requires a key.
//
// Per the global Claude API skill: latest + cheapest sufficient model for v0.0
// is Haiku 4.5 (claude-haiku-4-5-20251001). System prompt is marked
// `cache_control: ephemeral` so subsequent generations within the 5-minute TTL
// reuse the cached prefix.

import type { Business } from "../types/business";

export const HAIKU_MODEL_ID = "claude-haiku-4-5-20251001";
export const STUB_MODEL_ID = "draft-stub";

export type RestaurantCopy = {
  /** One-line tagline, ~6–10 words. Headline above the fold. */
  tagline: string;
  /** First paragraph — 2–3 sentences, evokes the place and the food. */
  blurb1: string;
  /** Second paragraph — 2–3 sentences, ends with a soft visit hook. */
  blurb2: string;
};

export type GeneratedPreview = RestaurantCopy & {
  modelId: string;
  generatedAt: string;
  /** True when the stub copy was used because no API key was available. */
  isStub: boolean;
};

const SYSTEM_PROMPT = `You write short, warm, conversion-oriented website copy for small Indian restaurants in tier-2 cities (Surat, Vadodara, Ahmedabad).

Style rules:
- Plain English, grade-8 reading level, no purple prose.
- No emoji. No exclamation marks. No "Welcome to ...". No "We are excited to ...".
- Mention the city by name once if and only if it is provided.
- Refer to the menu category accurately ("thali", "South Indian", "bakery", "cafe", "bar") when it is obvious from the input.
- Never invent specific menu items, prices, awards, owner names, or years in business.
- Never reference the address number or phone number in the body — those appear elsewhere on the page.
- Be specific about the *experience* (atmosphere, what a visit feels like) rather than generic claims like "high quality" or "best in town".

Output format: respond with a single JSON object, no Markdown fence, with exactly these keys: tagline, blurb1, blurb2.
- tagline: 6 to 10 words, sentence case, no trailing punctuation.
- blurb1: 2 to 3 sentences, 40 to 70 words.
- blurb2: 2 to 3 sentences, 40 to 70 words, ends with a low-pressure invitation to visit.`;

/** Pure: builds the message payload sent to Anthropic. Snapshot-tested. */
export function buildRestaurantPrompt(business: Business): {
  model: string;
  max_tokens: number;
  temperature: number;
  system: Array<{ type: "text"; text: string; cache_control?: { type: "ephemeral" } }>;
  messages: Array<{ role: "user"; content: string }>;
} {
  const userPayload = formatBusinessForPrompt(business);
  return {
    model: HAIKU_MODEL_ID,
    max_tokens: 600,
    temperature: 0.4,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: userPayload,
      },
    ],
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

export type GenerateOptions = {
  /** Force the stub even if ANTHROPIC_API_KEY is set. */
  dryRun?: boolean;
  /** Override the API key (mostly for tests; defaults to env). */
  apiKey?: string;
  /** Injection seam for tests. */
  now?: () => Date;
};

export async function generateRestaurantCopy(
  business: Business,
  opts: GenerateOptions = {},
): Promise<GeneratedPreview> {
  const now = (opts.now ?? (() => new Date()))();
  const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (opts.dryRun || !apiKey) {
    return { ...stubCopy(business), modelId: STUB_MODEL_ID, generatedAt: now.toISOString(), isStub: true };
  }
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey });
  const req = buildRestaurantPrompt(business);
  const res = await client.messages.create(req);
  const copy = parseRestaurantResponse(res);
  return { ...copy, modelId: HAIKU_MODEL_ID, generatedAt: now.toISOString(), isStub: false };
}

/** Extract the JSON copy from a Messages API response. Throws on malformed output. */
export function parseRestaurantResponse(res: { content: Array<{ type: string; text?: string }> }): RestaurantCopy {
  const text = res.content.find((b) => b.type === "text")?.text;
  if (!text) throw new Error("Anthropic response had no text block");
  // Strip a stray code fence if the model added one despite the instruction.
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (err) {
    throw new Error(`Anthropic response was not valid JSON: ${(err as Error).message}\n---\n${text}`);
  }
  return assertRestaurantCopy(parsed);
}

function assertRestaurantCopy(value: unknown): RestaurantCopy {
  if (!value || typeof value !== "object") throw new Error("Generator output was not an object");
  const v = value as Record<string, unknown>;
  for (const k of ["tagline", "blurb1", "blurb2"] as const) {
    if (typeof v[k] !== "string" || !(v[k] as string).trim()) {
      throw new Error(`Generator output missing string field: ${k}`);
    }
  }
  return { tagline: v.tagline as string, blurb1: v.blurb1 as string, blurb2: v.blurb2 as string };
}

/** Deterministic placeholder copy, used when no API key is available. */
export function stubCopy(business: Business): RestaurantCopy {
  const where = business.locality ? ` in ${business.locality}` : "";
  const what = humanCategory(business.category);
  return {
    tagline: `${business.name} — ${what}${where}`,
    blurb1: `${business.name} is a neighbourhood ${what}${where}. The room is unfussy and the regulars know the staff by name. This is a draft preview — real copy is generated by Claude Haiku 4.5 once an ANTHROPIC_API_KEY is wired up.`,
    blurb2: `Hours and address are pulled from the business's own listing, so what you see here is what you would find walking up to the door. If the rest of this page looks close to right, the next step is a short conversation about turning it into a live site.`,
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
