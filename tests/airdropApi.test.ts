import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { airdropApi } from "../src/services/airdropApi";

describe("airdropApi.getParticipantSnapshot", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn() as unknown as typeof fetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("throws when fid is missing", async () => {
    // @ts-expect-error fid is required
    await expect(airdropApi.getParticipantSnapshot({})).rejects.toThrow(
      /requires a valid fid/
    );
  });
});
