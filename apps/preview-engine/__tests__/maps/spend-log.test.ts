import { describe, expect, it, vi } from "vitest";
import { PgSpendLog, type PgQueryFn } from "../../lib/maps/spend-log";

describe("PgSpendLog", () => {
  it("totalSpentUsd selects coalesced sum and coerces to number", async () => {
    const query = vi.fn<PgQueryFn>(async () => [{ total: "0.072" }]);
    const log = new PgSpendLog(query);

    const total = await log.totalSpentUsd();
    expect(total).toBeCloseTo(0.072);

    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0]!;
    expect(sql).toMatch(/sum\(cost_usd\)/);
    expect(sql).toMatch(/from places_spend_log/);
    expect(params).toEqual([]);
  });

  it("totalSpentUsd returns 0 when the table is empty", async () => {
    const query = vi.fn<PgQueryFn>(async () => [{ total: 0 }]);
    const log = new PgSpendLog(query);
    expect(await log.totalSpentUsd()).toBe(0);
  });

  it("record inserts snake_case columns in positional order", async () => {
    const query = vi.fn<PgQueryFn>(async () => []);
    const log = new PgSpendLog(query);

    await log.record({
      query: "Sankalp",
      locality: "Surat",
      callKind: "place_details",
      costUsd: 0.02,
      succeeded: true,
      placeId: "ChIJtest",
    });

    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0]!;
    expect(sql).toMatch(/insert into places_spend_log/);
    expect(sql).toMatch(
      /\(query, locality, call_kind, cost_usd, succeeded, place_id, error_code, error_message\)/,
    );
    expect(sql).toMatch(/\$1, \$2, \$3, \$4, \$5, \$6, \$7, \$8/);
    expect(params).toEqual([
      "Sankalp",
      "Surat",
      "place_details",
      0.02,
      true,
      "ChIJtest",
      null,
      null,
    ]);
  });

  it("record sets optional fields to null when omitted", async () => {
    const query = vi.fn<PgQueryFn>(async () => []);
    const log = new PgSpendLog(query);

    await log.record({
      query: "q",
      locality: "Surat",
      callKind: "search_text",
      costUsd: 0.032,
      succeeded: false,
      errorCode: "429",
      errorMessage: "rate limited",
    });

    const params = query.mock.calls[0]![1]!;
    expect(params[5]).toBeNull(); // place_id
    expect(params[6]).toBe("429"); // error_code
    expect(params[7]).toBe("rate limited"); // error_message
  });

  it("propagates driver errors out of totalSpentUsd", async () => {
    const query = vi.fn<PgQueryFn>(async () => {
      throw new Error("permission denied for places_spend_log");
    });
    const log = new PgSpendLog(query);

    await expect(log.totalSpentUsd()).rejects.toThrow(/permission denied/);
  });

  it("propagates driver errors out of record", async () => {
    const query = vi.fn<PgQueryFn>(async () => {
      throw new Error("connection terminated");
    });
    const log = new PgSpendLog(query);

    await expect(
      log.record({
        query: "q",
        locality: "Surat",
        callKind: "search_text",
        costUsd: 0.032,
        succeeded: true,
      }),
    ).rejects.toThrow(/connection terminated/);
  });
});
