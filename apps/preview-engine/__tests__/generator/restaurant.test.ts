import { describe, it, expect } from "vitest";

import {
  buildRestaurantPrompt,
  HAIKU_MODEL_ID,
  parseRestaurantResponse,
  stubCopy,
  generateRestaurantCopy,
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
        "max_tokens": 600,
        "messages": [
          {
            "content": "Business: Sangam Thali House
      Category (Google Places type): indian_restaurant
      City: Surat
      Address (do not quote): Ring Road, Adajan, Surat, Gujarat 395009
      Hours (do not enumerate, just glance for context):
        - Monday: 11:00 AM – 11:00 PM
        - Sunday: 10:30 AM – 11:30 PM

      Write the JSON object now.",
            "role": "user",
          },
        ],
        "model": "claude-haiku-4-5-20251001",
        "system": [
          {
            "cache_control": {
              "type": "ephemeral",
            },
            "text": "You write short, warm, conversion-oriented website copy for small Indian restaurants in tier-2 cities (Surat, Vadodara, Ahmedabad).

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
            "type": "text",
          },
        ],
        "temperature": 0.4,
      }
    `);
  });

  it("targets Claude Haiku 4.5 (latest + cheapest sufficient model)", () => {
    expect(buildRestaurantPrompt(FIXTURE).model).toBe(HAIKU_MODEL_ID);
  });

  it("marks the system prompt as ephemeral-cached so repeat calls reuse the prefix", () => {
    const req = buildRestaurantPrompt(FIXTURE);
    expect(req.system[0]).toMatchObject({
      type: "text",
      cache_control: { type: "ephemeral" },
    });
  });

  it("omits the City line when locality is missing", () => {
    const noLocality: Business = { ...FIXTURE, locality: undefined };
    const content = buildRestaurantPrompt(noLocality).messages[0]!.content;
    expect(content).not.toContain("City:");
  });

  it("omits the Hours block when hours are missing", () => {
    const noHours: Business = { ...FIXTURE, hours: undefined };
    const content = buildRestaurantPrompt(noHours).messages[0]!.content;
    expect(content).not.toContain("Hours");
  });
});

describe("parseRestaurantResponse", () => {
  it("extracts copy from a clean JSON text block", () => {
    const res = {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            tagline: "A neighbourhood thali on Ring Road",
            blurb1: "x".repeat(40),
            blurb2: "y".repeat(40),
          }),
        },
      ],
    };
    expect(parseRestaurantResponse(res)).toEqual({
      tagline: "A neighbourhood thali on Ring Road",
      blurb1: "x".repeat(40),
      blurb2: "y".repeat(40),
    });
  });

  it("strips a stray ```json fence", () => {
    const res = {
      content: [
        {
          type: "text",
          text: '```json\n{"tagline":"t","blurb1":"a","blurb2":"b"}\n```',
        },
      ],
    };
    expect(parseRestaurantResponse(res).tagline).toBe("t");
  });

  it("throws when a required field is missing", () => {
    const res = { content: [{ type: "text", text: '{"tagline":"only"}' }] };
    expect(() => parseRestaurantResponse(res)).toThrow(/blurb1/);
  });
});

describe("stubCopy", () => {
  it("falls back to a deterministic copy when no API key is available", () => {
    const copy = stubCopy(FIXTURE);
    expect(copy.tagline).toContain("Sangam Thali House");
    expect(copy.blurb1).toContain("Surat");
    expect(copy.blurb2.length).toBeGreaterThan(50);
  });
});

describe("generateRestaurantCopy", () => {
  it("returns the stub when dryRun is set, even with an API key", async () => {
    const out = await generateRestaurantCopy(FIXTURE, {
      dryRun: true,
      apiKey: "sk-fake",
      now: () => new Date("2026-05-05T07:00:00Z"),
    });
    expect(out.isStub).toBe(true);
    expect(out.modelId).toBe("draft-stub");
    expect(out.generatedAt).toBe("2026-05-05T07:00:00.000Z");
  });

  it("returns the stub when no API key is available", async () => {
    const out = await generateRestaurantCopy(FIXTURE, {
      apiKey: undefined,
      now: () => new Date("2026-05-05T07:00:00Z"),
    });
    expect(out.isStub).toBe(true);
  });
});
