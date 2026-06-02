import { afterEach, describe, expect, it, vi } from "vitest";
import { getConfig, loadConfigFile, saveConfigFile } from "../src/api";
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

  it("saves a config file through the backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ path: "save/config.json", config: defaultConfig })
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(saveConfigFile(defaultConfig, "save/config.json")).resolves.toEqual({
      path: "save/config.json",
      config: defaultConfig
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/config-file/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "save/config.json", config: defaultConfig })
    });
  });

  it("loads a config file through the backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ path: "save/config.json", config: defaultConfig })
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadConfigFile("save/config.json")).resolves.toEqual({
      path: "save/config.json",
      config: defaultConfig
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/config-file/load", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "save/config.json" })
    });
  });
});
