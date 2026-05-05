import { describe, it, expect } from "vitest";

import {
  buildRestaurantPrompt,
  scaffoldDraftCopy,
  SYSTEM_PROMPT,
} from "../../lib/generator/restaurant";
import type { Business } from "../../lib/types/business";

const FIXTURE: Business = {
  slug: "sangam-thali-surat",
  name: "Sangam Thali House",
  category: "indian_restaurant",
  address: "Ring Road, Adajan, Surat, Gujarat 395009",
  phone: "+91 261 234 5678",
  locality: "Surat",
  hours: {
    weekday_text: [
      "Monday: 11:00 AM – 11:00 PM",
      "Sunday: 10:30 AM – 11:30 PM",
    ],
  },
};

describe("buildRestaurantPrompt", () => {
  it("matches the snapshot for the canonical fixture", () => {
    expect(buildRestaurantPrompt(FIXTURE)).toMatchInlineSnapshot(`
      {
        "system": "You write short, warm, conversion-oriented website copy for small Indian restaurants in tier-2 cities (Surat, Vadodara, Ahmedabad).

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
      - blurb2: 2 to 3 sentences, 40 to 70 words, ends with a low-pressure invitation to visit.",
        "user": "Business: Sangam Thali House
      Category (Google Places type): indian_restaurant
      City: Surat
      Address (do not quote): Ring Road, Adajan, Surat, Gujarat 395009
      Hours (do not enumerate, just glance for context):
        - Monday: 11:00 AM – 11:00 PM
        - Sunday: 10:30 AM – 11:30 PM

      Write the JSON object now.",
      }
    `);
  });

  it("exposes the system prompt verbatim for editing", () => {
    expect(buildRestaurantPrompt(FIXTURE).system).toBe(SYSTEM_PROMPT);
  });

  it("omits the City line when locality is missing", () => {
    const noLocality: Business = { ...FIXTURE, locality: undefined };
    expect(buildRestaurantPrompt(noLocality).user).not.toContain("City:");
  });

  it("omits the Hours block when hours are missing", () => {
    const noHours: Business = { ...FIXTURE, hours: undefined };
    expect(buildRestaurantPrompt(noHours).user).not.toContain("Hours");
  });
});

describe("scaffoldDraftCopy", () => {
  it("produces a clearly-marked DRAFT placeholder so a forgotten rewrite is obvious", () => {
    const out = scaffoldDraftCopy(FIXTURE, { now: () => new Date("2026-05-05T07:00:00Z") });
    expect(out.tagline).toContain("DRAFT");
    expect(out.tagline).toContain("Sangam Thali House");
    expect(out.blurb1).toContain("DRAFT");
    expect(out.blurb2).toContain("DRAFT");
    expect(out.source).toBe("scaffold");
    expect(out.draftedAt).toBe("2026-05-05T07:00:00.000Z");
  });

  it("omits the locality clause when the business has none", () => {
    const noLocality: Business = { ...FIXTURE, locality: undefined };
    const out = scaffoldDraftCopy(noLocality);
    expect(out.tagline).not.toContain(" in ");
  });
});
