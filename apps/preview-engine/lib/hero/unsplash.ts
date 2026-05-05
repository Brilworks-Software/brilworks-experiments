// Category-keyed Unsplash hero photos for v0.0 restaurant previews.
//
// Why not Places photos? Google Maps Photos API restricts redistribution and
// requires Maps-branded attribution; Unsplash photos are usable under the
// Unsplash License with a credit line. See ADR-0001 risk R3 on BRI-116.
//
// Each entry pins a stable Unsplash photo id. We hot-link the canonical CDN
// URL — no API call, no key required at build time. To swap a photo, replace
// the entry below; do not introduce a runtime fetch.

export type HeroPhoto = {
  /** Unsplash CDN URL with sensible default sizing for an above-the-fold hero. */
  url: string;
  /** Alt text — the page also overlays the business name on top. */
  alt: string;
  /** Photographer display name, surfaced as `Hero by <name> on Unsplash`. */
  photographer: string;
  /** Photographer profile URL on unsplash.com. */
  photographerUrl: string;
  /** Direct link to the original photo page on unsplash.com. */
  photoUrl: string;
};

const UNSPLASH_BASE = "https://images.unsplash.com";
const HERO_PARAMS = "w=1600&q=80&auto=format&fit=crop";

const heroFor = (id: string, p: Omit<HeroPhoto, "url">): HeroPhoto => ({
  url: `${UNSPLASH_BASE}/${id}?${HERO_PARAMS}`,
  ...p,
});

// Map keyed by Google Places primary type (https://developers.google.com/maps/documentation/places/web-service/place-types).
// Add an entry when a new category appears in a fixture or live lookup.
const CATEGORY_HEROES: Record<string, HeroPhoto> = {
  indian_restaurant: heroFor("photo-1585937421612-70a008356fbe", {
    alt: "Indian thali platter",
    photographer: "Shreyak Singh",
    photographerUrl: "https://unsplash.com/@shreyak",
    photoUrl: "https://unsplash.com/photos/1jdJWMdjp_M",
  }),
  restaurant: heroFor("photo-1517248135467-4c7edcad34c4", {
    alt: "Restaurant dining room",
    photographer: "Jay Wennington",
    photographerUrl: "https://unsplash.com/@jaywennington",
    photoUrl: "https://unsplash.com/photos/N_Y88TWmGwA",
  }),
  cafe: heroFor("photo-1554118811-1e0d58224f24", {
    alt: "Cafe table with latte",
    photographer: "Toa Heftiba",
    photographerUrl: "https://unsplash.com/@heftiba",
    photoUrl: "https://unsplash.com/photos/FV3GConVSss",
  }),
  bakery: heroFor("photo-1568254183919-78a4f43a2877", {
    alt: "Fresh-baked bread on a wooden counter",
    photographer: "Jude Infantini",
    photographerUrl: "https://unsplash.com/@infantini",
    photoUrl: "https://unsplash.com/photos/PwbxAEAUmEM",
  }),
  bar: heroFor("photo-1543007630-9710e4a00a20", {
    alt: "Bar interior with bottles backlit",
    photographer: "Adam Jaime",
    photographerUrl: "https://unsplash.com/@awcreativeut",
    photoUrl: "https://unsplash.com/photos/Erlu33UrbCs",
  }),
};

const FALLBACK_HERO: HeroPhoto = heroFor("photo-1414235077428-338989a2e8c0", {
  alt: "Plated meal on a wooden table",
  photographer: "Brooke Lark",
  photographerUrl: "https://unsplash.com/@brookelark",
  photoUrl: "https://unsplash.com/photos/8Yk4T-tDSYY",
});

/**
 * Returns the hero photo for a Google Places category, falling back to a
 * generic food photo when the category is unmapped. Pure — safe to call from
 * server components, the CLI generator, and tests.
 */
export function heroForCategory(category: string): HeroPhoto {
  return CATEGORY_HEROES[category] ?? FALLBACK_HERO;
}

/** Exposed for tests so we can assert the canonical mapping shape. */
export const __TEST_HEROES = { CATEGORY_HEROES, FALLBACK_HERO };
