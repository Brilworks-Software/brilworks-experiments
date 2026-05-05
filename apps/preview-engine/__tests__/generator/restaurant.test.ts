import { describe, it, expect } from "vitest";

import {
  buildRestaurantPrompt,
  scaffoldDraftCopy,
  SYSTEM_PROMPT,
} from "../../lib/generator/restaurant";
import type { Business } from "../../lib/types/business";

const FIXTURE: Business = {
  slug: "larkspur-cafe-brooklyn",
  name: "Larkspur Coffee & Toast",
  category: "cafe",
  address: "88 Bedford Avenue, Brooklyn, NY 11211",
  phone: "+1 (718) 555-0144",
  locality: "Brooklyn",
  hours: {
    weekday_text: [
      "Monday: 7:00 AM – 5:00 PM",
      "Sunday: 8:00 AM – 4:00 PM",
    ],
  },
};

describe("buildRestaurantPrompt", () => {
  it("matches the snapshot for the canonical fixture", () => {
    expect(buildRestaurantPrompt(FIXTURE)).toMatchInlineSnapshot(`
      {
        "system": "You write short, warm, conversion-oriented website copy for independent restaurants, cafes, bakeries, and bars in the United States, United Kingdom, Canada, and Australia.

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
      - signatureDishes: an array of exactly 3 objects, each with "name" (1-4 words) and "line" (8-14 words, one short evocative sentence, no period required).",
        "user": "Business: Larkspur Coffee & Toast
      Category (Google Places type): cafe
      City: Brooklyn
      Address (do not quote): 88 Bedford Avenue, Brooklyn, NY 11211
      Hours (do not enumerate, just glance for context):
        - Monday: 7:00 AM – 5:00 PM
        - Sunday: 8:00 AM – 4:00 PM

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
    expect(out.tagline).toContain("Larkspur Coffee & Toast");
    expect(out.aboutP1).toContain("DRAFT");
    expect(out.aboutP2).toContain("DRAFT");
    expect(out.signatureDishes).toHaveLength(3);
    out.signatureDishes.forEach((dish) => {
      expect(dish.name).toContain("DRAFT");
      expect(dish.line).toContain("DRAFT");
    });
    expect(out.source).toBe("scaffold");
    expect(out.draftedAt).toBe("2026-05-05T07:00:00.000Z");
  });

  it("omits the locality clause in the tagline when the business has none", () => {
    const noLocality: Business = { ...FIXTURE, locality: undefined };
    const out = scaffoldDraftCopy(noLocality);
    expect(out.tagline).not.toContain(" in ");
  });
});
