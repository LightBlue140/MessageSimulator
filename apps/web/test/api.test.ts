import { afterEach, describe, expect, it, vi } from "vitest";
import {
  copyService,
  deleteService,
  getConfig,
  loadConfigFile,
  saveConfigFile,
  startAllServices,
  startService,
  stopAllServices,
  stopService
} from "../src/api";
import { defaultAppConfig } from "../src/types";

describe("api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("loads the simulator config from the backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => defaultAppConfig
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getConfig()).resolves.toEqual(defaultAppConfig);
    expect(fetchMock).toHaveBeenCalledWith("/api/config");
  });

  it("saves a config file through the backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ path: "save/config.json", config: defaultAppConfig })
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(saveConfigFile(defaultAppConfig, "save/config.json")).resolves.toEqual({
      path: "save/config.json",
      config: defaultAppConfig
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/config-file/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "save/config.json", config: defaultAppConfig })
    });
  });

  it("loads a config file through the backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ path: "save/config.json", config: defaultAppConfig })
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadConfigFile("save/config.json")).resolves.toEqual({
      path: "save/config.json",
      config: defaultAppConfig
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/config-file/load", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "save/config.json" })
    });
  });

  it("calls service runtime endpoints", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ services: [] })
    });
    vi.stubGlobal("fetch", fetchMock);

    await startService("service-1");
    await stopService("service-1");
    await startAllServices();
    await stopAllServices();
    await copyService("service-1");
    await deleteService("service-1");

    expect(fetchMock).toHaveBeenCalledWith("/api/services/service-1/start", { method: "POST" });
    expect(fetchMock).toHaveBeenCalledWith("/api/services/service-1/stop", { method: "POST" });
    expect(fetchMock).toHaveBeenCalledWith("/api/start-all", { method: "POST" });
    expect(fetchMock).toHaveBeenCalledWith("/api/stop-all", { method: "POST" });
    expect(fetchMock).toHaveBeenCalledWith("/api/services/service-1/copy", { method: "POST" });
    expect(fetchMock).toHaveBeenCalledWith("/api/services/service-1", { method: "DELETE" });
  });
});
