import { describe, expect, it, vi } from "vitest";
import { SupabaseSpendLog } from "../../lib/maps/spend-log";

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

type FetchArgs = [RequestInfo | URL, RequestInit | undefined];

describe("SupabaseSpendLog", () => {
  it("sums cost_usd from PostgREST select", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      jsonResponse([{ cost_usd: "0.020" }, { cost_usd: 0.032 }, { cost_usd: 0.020 }]),
    );

    const log = new SupabaseSpendLog({
      url: "https://abc.supabase.co",
      serviceRoleKey: "service-key",
      fetcher: fetcher as unknown as typeof fetch,
    });

    const total = await log.totalSpentUsd();
    expect(total).toBeCloseTo(0.072);

    const call = fetcher.mock.calls.at(0) as FetchArgs | undefined;
    expect(call).toBeDefined();
    const [url, init] = call!;
    expect(String(url)).toBe(
      "https://abc.supabase.co/rest/v1/places_spend_log?select=cost_usd",
    );
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers.apikey).toBe("service-key");
    expect(headers.Authorization).toBe("Bearer service-key");
  });

  it("posts an insert with snake_case columns", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(null, { status: 201 }));
    const log = new SupabaseSpendLog({
      url: "https://abc.supabase.co/",
      serviceRoleKey: "service-key",
      fetcher: fetcher as unknown as typeof fetch,
    });

    await log.record({
      query: "Sankalp",
      locality: "Surat",
      callKind: "place_details",
      costUsd: 0.02,
      succeeded: true,
      placeId: "ChIJtest",
    });

    const call = fetcher.mock.calls.at(0) as FetchArgs | undefined;
    expect(call).toBeDefined();
    const [url, init] = call!;
    expect(String(url)).toBe("https://abc.supabase.co/rest/v1/places_spend_log");
    expect(init?.method).toBe("POST");
    const body = JSON.parse(String(init?.body));
    expect(body).toEqual({
      query: "Sankalp",
      locality: "Surat",
      call_kind: "place_details",
      cost_usd: 0.02,
      succeeded: true,
      place_id: "ChIJtest",
      error_code: null,
      error_message: null,
    });
  });

  it("throws on non-2xx PostgREST responses", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      new Response("permission denied", {
        status: 403,
        headers: { "Content-Type": "text/plain" },
      }),
    );
    const log = new SupabaseSpendLog({
      url: "https://abc.supabase.co",
      serviceRoleKey: "service-key",
      fetcher: fetcher as unknown as typeof fetch,
    });

    await expect(log.totalSpentUsd()).rejects.toThrow(/spend log read failed/);
  });
});
