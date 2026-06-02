import { afterEach, describe, expect, it, vi } from "vitest";
import { getConfig } from "../src/api";
import { defaultConfig } from "../src/types";

describe("api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("loads the simulator config from the backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => defaultConfig
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getConfig()).resolves.toEqual(defaultConfig);
    expect(fetchMock).toHaveBeenCalledWith("/api/config");
  });
});
