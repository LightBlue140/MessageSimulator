import Fastify from "fastify";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { HttpAdapter } from "../src/adapters/http.js";
import type { AdapterContext } from "../src/adapters/types.js";
import { registerRoutes } from "../src/api/routes.js";
import { defaultConfig } from "../src/config/schema.js";
import { ConfigStore } from "../src/config/store.js";
import { RecentLogs } from "../src/runtime/logs.js";

const createApp = async () => {
  const dir = await mkdtemp(join(tmpdir(), "sim-api-"));
  const app = Fastify();
  await registerRoutes(app, { configStore: new ConfigStore(join(dir, "config.json")) });

  return { app, dir };
};

describe("management API", () => {
  const cleanup: Array<() => Promise<void>> = [];

  afterEach(async () => {
    while (cleanup.length > 0) {
      await cleanup.pop()?.();
    }
  });

  it("saves validated config and returns it", async () => {
    const { app, dir } = await createApp();
    cleanup.push(async () => {
      await app.close();
      await rm(dir, { recursive: true, force: true });
    });

    const config = { ...defaultConfig, messageTemplate: "saved={aa}" };

    const save = await app.inject({ method: "PUT", url: "/api/config", payload: config });
    const load = await app.inject({ method: "GET", url: "/api/config" });

    expect(save.statusCode).toBe(200);
    expect(save.json()).toEqual(config);
    expect(load.statusCode).toBe(200);
    expect(load.json()).toEqual(config);
  });

  it("returns stopped runtime status before start and after stop", async () => {
    const { app, dir } = await createApp();
    cleanup.push(async () => {
      await app.close();
      await rm(dir, { recursive: true, force: true });
    });

    const initial = await app.inject({ method: "GET", url: "/api/status" });
    const stopped = await app.inject({ method: "POST", url: "/api/stop" });

    expect(initial.statusCode).toBe(200);
    expect(initial.json()).toMatchObject({ running: false });
    expect(initial.json().adapterStatus).toBeUndefined();
    expect(stopped.statusCode).toBe(200);
    expect(stopped.json()).toMatchObject({ running: false });
    expect(stopped.json().adapterStatus).toBeUndefined();
  });
});

describe("HttpAdapter", () => {
  it("serves the current snapshot at the configured path and tracks requests", async () => {
    const logs = new RecentLogs();
    const adapter = new HttpAdapter();
    const context: AdapterContext = {
      config: {
        ...defaultConfig,
        serverSettings: {
          ...defaultConfig.serverSettings,
          http: { ...defaultConfig.serverSettings.http, port: 0, path: "/current", contentType: "text/plain" }
        }
      },
      getSnapshot: () => "snapshot-body",
      logs
    };

    try {
      await adapter.start(context);
      const address = adapter.getStatus().listenAddress;

      expect(address).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);

      const response = await fetch(`${address}/current`);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/plain");
      expect(await response.text()).toBe("snapshot-body");
      expect(adapter.getStatus()).toMatchObject({ requestCount: 1, listenAddress: address });
      expect(logs.list()).toEqual([expect.objectContaining({ level: "info", message: "HTTP GET /current" })]);
    } finally {
      await adapter.stop();
    }
  });

  it("closes the server and resets status when stopped", async () => {
    const adapter = new HttpAdapter();
    const context: AdapterContext = {
      config: {
        ...defaultConfig,
        serverSettings: {
          ...defaultConfig.serverSettings,
          http: { ...defaultConfig.serverSettings.http, port: 0 }
        }
      },
      getSnapshot: () => "snapshot-body",
      logs: new RecentLogs()
    };

    await adapter.start(context);
    await adapter.stop();

    expect(adapter.getStatus()).toEqual({ requestCount: 0, listenAddress: undefined });
  });
});
