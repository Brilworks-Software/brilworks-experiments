// Shape returned by the D2 Maps adapter (BRI-180 lib/maps/places.ts).
// Keep this file in sync with that adapter once it merges.

export type WeekdayHours = {
  /** Human-readable strings, one per weekday, e.g. "Monday: 11:00 AM – 11:00 PM". */
  weekday_text: string[];
};

export type Business = {
  /** Stable URL slug, lowercase kebab. Caller picks this — it is not from Places. */
  slug: string;
  name: string;
  /** Google Places primary type, e.g. "restaurant", "indian_restaurant", "cafe". */
  category: string;
  address: string;
  phone?: string;
  hours?: WeekdayHours;
  /** Places photo references (URLs). v0.0 page does NOT render these — Unsplash hero only (see ADR/BRI-181). */
  photos?: string[];
  /** Two-letter locale, defaults to "en". Reserved for future localised copy. */
  locale?: string;
  /** Free-text city name surfaced in the prompt, e.g. "Surat", "Vadodara". */
  locality?: string;
};
