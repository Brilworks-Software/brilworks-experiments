import { describe, it, expect } from "vitest";

import { heroForCategory, __TEST_HEROES } from "../../lib/hero/unsplash";

describe("heroForCategory", () => {
  it("returns the indian_restaurant hero with attribution", () => {
    const hero = heroForCategory("indian_restaurant");
    expect(hero.url).toMatch(/^https:\/\/images\.unsplash\.com\//);
    expect(hero.url).toContain("photo-1585937421612-70a008356fbe");
    expect(hero.photographer).toBeTruthy();
    expect(hero.photographerUrl).toMatch(/^https:\/\/unsplash\.com\//);
  });

  it("falls back to the generic food hero for unknown categories", () => {
    const hero = heroForCategory("rocket_science_lab");
    expect(hero).toEqual(__TEST_HEROES.FALLBACK_HERO);
  });

  it("applies the canonical sizing params on every URL", () => {
    for (const hero of Object.values(__TEST_HEROES.CATEGORY_HEROES)) {
      expect(hero.url).toContain("w=1600");
      expect(hero.url).toContain("auto=format");
    }
    expect(__TEST_HEROES.FALLBACK_HERO.url).toContain("w=1600");
  });

  it("never returns Google Places photo URLs (R3 — licensing)", () => {
    for (const cat of [
      "indian_restaurant",
      "restaurant",
      "cafe",
      "bakery",
      "bar",
      "unknown_category",
    ]) {
      const hero = heroForCategory(cat);
      expect(hero.url).not.toMatch(/maps\.googleapis\.com|google\.com\/maps/);
      expect(hero.url).toMatch(/images\.unsplash\.com/);
    }
  });
});
