import type {
  BusinessLookup,
  SpendCallKind,
  SpendEntry,
  SpendLog,
} from "./types";

// Conservative per-call costs for Google Places API (New) Pro SKUs.
// Rounded up where Google's tiered pricing applies, so the breaker fires
// before the real bill catches up. See ADR-0002 on BRI-180.
export const PLACES_COSTS_USD: Record<SpendCallKind, number> = {
  search_text: 0.032,
  place_details: 0.020,
};

export const SPEND_CAP_USD = 20;

const SEARCH_TEXT_URL = "https://places.googleapis.com/v1/places:searchText";
const PLACE_DETAILS_BASE = "https://places.googleapis.com/v1/places/";

const PLACE_DETAILS_FIELD_MASK = [
  "id",
  "displayName",
  "primaryTypeDisplayName",
  "primaryType",
  "formattedAddress",
  "nationalPhoneNumber",
  "regularOpeningHours.weekdayDescriptions",
  "photos.name",
].join(",");

export class SpendCapExceededError extends Error {
  constructor(
    public readonly currentSpendUsd: number,
    public readonly projectedSpendUsd: number,
    public readonly capUsd: number,
  ) {
    super(
      `Places API spend cap reached: current=$${currentSpendUsd.toFixed(4)}, ` +
        `next-call projected=$${projectedSpendUsd.toFixed(4)}, cap=$${capUsd.toFixed(2)}`,
    );
    this.name = "SpendCapExceededError";
  }
}

export class PlacesApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`Places API ${status}: ${body.slice(0, 240)}`);
    this.name = "PlacesApiError";
  }
}

export class PlaceNotFoundError extends Error {
  constructor(query: string, locality: string) {
    super(`No place matched query="${query}" locality="${locality}"`);
    this.name = "PlaceNotFoundError";
  }
}

export interface PlacesDeps {
  apiKey: string;
  spendLog: SpendLog;
  fetcher?: typeof fetch;
  capUsd?: number;
}

export async function lookupBusiness(
  query: string,
  locality: string,
  deps: PlacesDeps,
): Promise<BusinessLookup> {
  const fetcher = deps.fetcher ?? fetch;
  const cap = deps.capUsd ?? SPEND_CAP_USD;

  const placeId = await callWithGuard(
    "search_text",
    query,
    locality,
    deps.spendLog,
    cap,
    () => searchText(query, locality, deps.apiKey, fetcher),
  );

  return await callWithGuard(
    "place_details",
    query,
    locality,
    deps.spendLog,
    cap,
    () => placeDetails(placeId, deps.apiKey, fetcher),
    placeId,
  );
}

async function callWithGuard<T>(
  callKind: SpendCallKind,
  query: string,
  locality: string,
  spendLog: SpendLog,
  capUsd: number,
  fn: () => Promise<T>,
  placeId?: string,
): Promise<T> {
  const cost = PLACES_COSTS_USD[callKind];
  const current = await spendLog.totalSpentUsd();
  const projected = current + cost;

  if (projected > capUsd) {
    throw new SpendCapExceededError(current, projected, capUsd);
  }

  let succeeded = false;
  let errorCode: string | undefined;
  let errorMessage: string | undefined;
  try {
    const result = await fn();
    succeeded = true;
    return result;
  } catch (error: unknown) {
    if (error instanceof PlacesApiError) {
      errorCode = String(error.status);
      errorMessage = error.body.slice(0, 500);
    } else if (error instanceof Error) {
      errorCode = error.name;
      errorMessage = error.message.slice(0, 500);
    } else {
      errorCode = "unknown";
      errorMessage = String(error).slice(0, 500);
    }
    throw error;
  } finally {
    const entry: SpendEntry = {
      query,
      locality,
      callKind,
      costUsd: cost,
      succeeded,
      ...(placeId ? { placeId } : {}),
      ...(errorCode ? { errorCode } : {}),
      ...(errorMessage ? { errorMessage } : {}),
    };
    await spendLog.record(entry);
  }
}

async function searchText(
  query: string,
  locality: string,
  apiKey: string,
  fetcher: typeof fetch,
): Promise<string> {
  const res = await fetcher(SEARCH_TEXT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id",
    },
    body: JSON.stringify({
      textQuery: `${query} ${locality}`.trim(),
    }),
  });

  if (!res.ok) {
    throw new PlacesApiError(res.status, await safeBody(res));
  }

  const json = (await res.json()) as { places?: Array<{ id?: string }> };
  const first = json.places?.[0];
  if (!first?.id) {
    throw new PlaceNotFoundError(query, locality);
  }
  return first.id;
}

async function placeDetails(
  placeId: string,
  apiKey: string,
  fetcher: typeof fetch,
): Promise<BusinessLookup> {
  const url = `${PLACE_DETAILS_BASE}${encodeURIComponent(placeId)}`;
  const res = await fetcher(url, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": PLACE_DETAILS_FIELD_MASK,
    },
  });

  if (!res.ok) {
    throw new PlacesApiError(res.status, await safeBody(res));
  }

  const raw = (await res.json()) as PlaceDetailsResponse;

  return {
    placeId: raw.id ?? placeId,
    name: raw.displayName?.text ?? "",
    category:
      raw.primaryTypeDisplayName?.text ?? raw.primaryType ?? null,
    address: raw.formattedAddress ?? "",
    phone: raw.nationalPhoneNumber ?? null,
    hours: raw.regularOpeningHours?.weekdayDescriptions
      ? { weekdayDescriptions: raw.regularOpeningHours.weekdayDescriptions }
      : null,
    photoResources:
      raw.photos?.map((p) => p.name).filter((n): n is string => Boolean(n)) ??
      [],
  };
}

interface PlaceDetailsResponse {
  id?: string;
  displayName?: { text?: string };
  primaryType?: string;
  primaryTypeDisplayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  photos?: Array<{ name?: string }>;
}

async function safeBody(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
