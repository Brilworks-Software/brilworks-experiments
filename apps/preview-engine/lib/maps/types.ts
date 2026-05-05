export interface BusinessLookup {
  placeId: string;
  name: string;
  category: string | null;
  address: string;
  phone: string | null;
  hours: { weekdayDescriptions: string[] } | null;
  // Places photo resource names (e.g. "places/<id>/photos/<photo>").
  // Consumers materialize these at request time through a server-side proxy.
  // Do NOT mirror photo bytes into our buckets — Maps photo licensing
  // requires in-app display only (see ADR-0002, R3).
  photoResources: string[];
}

export type SpendCallKind = "search_text" | "place_details";

export interface SpendEntry {
  query: string;
  locality: string;
  callKind: SpendCallKind;
  costUsd: number;
  succeeded: boolean;
  placeId?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface SpendLog {
  totalSpentUsd(): Promise<number>;
  record(entry: SpendEntry): Promise<void>;
}
