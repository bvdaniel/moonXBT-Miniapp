import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { airdropApi } from "../src/services/airdropApi";

describe("airdropApi.getParticipantSnapshot", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    (global as any).fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch as any;
    vi.restoreAllMocks();
  });

  it("throws when fid is missing", async () => {
    // @ts-ignore
    await expect(airdropApi.getParticipantSnapshot({})).rejects.toThrow(
      /requires a valid fid/
    );
  });
});
