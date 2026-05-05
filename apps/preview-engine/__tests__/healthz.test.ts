import { describe, it, expect } from "vitest";
import { GET } from "../app/api/healthz/route";

describe("/api/healthz", () => {
  it("returns 200 with ok=true", async () => {
    const res = GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.service).toBe("preview-engine");
  });
});
