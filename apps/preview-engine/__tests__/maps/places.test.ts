import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PLACES_COSTS_USD,
  PlaceNotFoundError,
  PlacesApiError,
  SPEND_CAP_USD,
  SpendCapExceededError,
  lookupBusiness,
} from "../../lib/maps/places";
import type { SpendEntry, SpendLog } from "../../lib/maps/types";

class FakeSpendLog implements SpendLog {
  public spent: number;
  public entries: SpendEntry[] = [];

  constructor(initialSpend = 0) {
    this.spent = initialSpend;
  }

  async totalSpentUsd(): Promise<number> {
    return this.spent;
  }

  async record(entry: SpendEntry): Promise<void> {
    this.entries.push(entry);
    this.spent += entry.costUsd;
  }
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function mockFetcher(handlers: Array<(input: RequestInfo | URL, init?: RequestInit) => Response | Promise<Response>>) {
  let i = 0;
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const handler = handlers[i++];
    if (!handler) throw new Error(`unexpected fetch call #${i}`);
    return handler(input, init);
  });
}

const VALID_DETAILS = {
  id: "ChIJtest123",
  displayName: { text: "Surati Farsan Mart" },
  primaryType: "restaurant",
  primaryTypeDisplayName: { text: "Restaurant" },
  formattedAddress: "Athwa Gate, Surat, Gujarat 395001, India",
  nationalPhoneNumber: "0261 245 4524",
  regularOpeningHours: {
    weekdayDescriptions: [
      "Monday: 8:00 AM – 10:30 PM",
      "Tuesday: 8:00 AM – 10:30 PM",
    ],
  },
  photos: [{ name: "places/ChIJtest123/photos/abc" }, { name: "places/ChIJtest123/photos/def" }],
};

describe("lookupBusiness", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the BusinessLookup struct on the happy path", async () => {
    const spendLog = new FakeSpendLog();
    const fetcher = mockFetcher([
      () => jsonResponse({ places: [{ id: "ChIJtest123" }] }),
      () => jsonResponse(VALID_DETAILS),
    ]);

    const result = await lookupBusiness("Surati Farsan Mart", "Surat", {
      apiKey: "test-key",
      spendLog,
      fetcher: fetcher as unknown as typeof fetch,
    });

    expect(result).toEqual({
      placeId: "ChIJtest123",
      name: "Surati Farsan Mart",
      category: "Restaurant",
      address: "Athwa Gate, Surat, Gujarat 395001, India",
      phone: "0261 245 4524",
      hours: {
        weekdayDescriptions: [
          "Monday: 8:00 AM – 10:30 PM",
          "Tuesday: 8:00 AM – 10:30 PM",
        ],
      },
      photoResources: [
        "places/ChIJtest123/photos/abc",
        "places/ChIJtest123/photos/def",
      ],
    });

    // Two spend entries, both succeeded.
    expect(spendLog.entries).toHaveLength(2);
    expect(spendLog.entries[0]).toMatchObject({
      callKind: "search_text",
      costUsd: PLACES_COSTS_USD.search_text,
      succeeded: true,
    });
    expect(spendLog.entries[1]).toMatchObject({
      callKind: "place_details",
      costUsd: PLACES_COSTS_USD.place_details,
      succeeded: true,
      placeId: "ChIJtest123",
    });
  });

  it("sends the documented field mask + API key headers to Places API", async () => {
    const spendLog = new FakeSpendLog();
    const fetcher = mockFetcher([
      () => jsonResponse({ places: [{ id: "ChIJtest123" }] }),
      () => jsonResponse(VALID_DETAILS),
    ]);

    await lookupBusiness("q", "Surat", {
      apiKey: "secret-key",
      spendLog,
      fetcher: fetcher as unknown as typeof fetch,
    });

    const [searchCall, detailsCall] = fetcher.mock.calls;
    expect(searchCall).toBeDefined();
    expect(detailsCall).toBeDefined();

    const searchInit = searchCall![1] as RequestInit;
    const searchHeaders = searchInit.headers as Record<string, string>;
    expect(searchHeaders["X-Goog-Api-Key"]).toBe("secret-key");
    expect(searchHeaders["X-Goog-FieldMask"]).toBe("places.id");
    expect(searchInit.method).toBe("POST");
    expect(JSON.parse(String(searchInit.body))).toEqual({
      textQuery: "q Surat",
    });

    const detailsInit = detailsCall![1] as RequestInit;
    const detailsHeaders = detailsInit.headers as Record<string, string>;
    expect(detailsHeaders["X-Goog-Api-Key"]).toBe("secret-key");
    // Only the documented narrow set of fields — keeps SKU billing tight.
    expect(detailsHeaders["X-Goog-FieldMask"]).toContain("formattedAddress");
    expect(detailsHeaders["X-Goog-FieldMask"]).toContain("nationalPhoneNumber");
    expect(detailsHeaders["X-Goog-FieldMask"]).toContain(
      "regularOpeningHours.weekdayDescriptions",
    );
    expect(detailsHeaders["X-Goog-FieldMask"]).toContain("photos.name");
    expect(detailsCall![0]).toMatch(/places\.googleapis\.com\/v1\/places\//);
  });

  it("circuit-breaks BEFORE hitting the API when projected spend exceeds $20", async () => {
    // Already at the cap.
    const spendLog = new FakeSpendLog(SPEND_CAP_USD);
    const fetcher = vi.fn();

    await expect(
      lookupBusiness("q", "Surat", {
        apiKey: "test-key",
        spendLog,
        fetcher: fetcher as unknown as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(SpendCapExceededError);

    // No HTTP call was made.
    expect(fetcher).not.toHaveBeenCalled();
    // No spend row was written for the call we refused.
    expect(spendLog.entries).toHaveLength(0);
  });

  it("circuit-breaks at the $20 boundary on the second call when first call would tip us over", async () => {
    // Just below the cap — searchText alone fits, place_details would tip over.
    const spendLog = new FakeSpendLog(
      SPEND_CAP_USD - PLACES_COSTS_USD.search_text - 0.001,
    );
    const fetcher = mockFetcher([
      () => jsonResponse({ places: [{ id: "ChIJtest123" }] }),
    ]);

    await expect(
      lookupBusiness("q", "Surat", {
        apiKey: "test-key",
        spendLog,
        fetcher: fetcher as unknown as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(SpendCapExceededError);

    // searchText was called and recorded; place_details refused.
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(spendLog.entries).toHaveLength(1);
    expect(spendLog.entries[0]?.callKind).toBe("search_text");
  });

  it("records a spend row even when the API call fails", async () => {
    const spendLog = new FakeSpendLog();
    const fetcher = mockFetcher([
      () =>
        new Response("rate limited", {
          status: 429,
          headers: { "Content-Type": "text/plain" },
        }),
    ]);

    await expect(
      lookupBusiness("q", "Surat", {
        apiKey: "test-key",
        spendLog,
        fetcher: fetcher as unknown as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(PlacesApiError);

    expect(spendLog.entries).toHaveLength(1);
    expect(spendLog.entries[0]).toMatchObject({
      callKind: "search_text",
      succeeded: false,
      errorCode: "429",
    });
    // Cost is still charged even on failure — Google bills failed Pro calls.
    expect(spendLog.spent).toBeCloseTo(PLACES_COSTS_USD.search_text);
  });

  it("throws PlaceNotFoundError when searchText returns no places", async () => {
    const spendLog = new FakeSpendLog();
    const fetcher = mockFetcher([() => jsonResponse({ places: [] })]);

    await expect(
      lookupBusiness("nonsense-no-match", "Surat", {
        apiKey: "test-key",
        spendLog,
        fetcher: fetcher as unknown as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(PlaceNotFoundError);

    expect(spendLog.entries).toHaveLength(1);
    expect(spendLog.entries[0]?.succeeded).toBe(false);
  });

  it("respects a smaller capUsd override for tests", async () => {
    const spendLog = new FakeSpendLog(0.05);
    const fetcher = vi.fn();

    await expect(
      lookupBusiness("q", "Surat", {
        apiKey: "test-key",
        spendLog,
        capUsd: 0.05,
        fetcher: fetcher as unknown as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(SpendCapExceededError);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("handles missing optional fields (no phone / no hours / no photos)", async () => {
    const spendLog = new FakeSpendLog();
    const fetcher = mockFetcher([
      () => jsonResponse({ places: [{ id: "ChIJsparse" }] }),
      () =>
        jsonResponse({
          id: "ChIJsparse",
          displayName: { text: "Tiny Stall" },
          primaryType: "food",
          formattedAddress: "Surat",
        }),
    ]);

    const result = await lookupBusiness("Tiny Stall", "Surat", {
      apiKey: "test-key",
      spendLog,
      fetcher: fetcher as unknown as typeof fetch,
    });

    expect(result.phone).toBeNull();
    expect(result.hours).toBeNull();
    expect(result.photoResources).toEqual([]);
    expect(result.category).toBe("food");
  });
});
