import Fastify from "fastify";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { HttpAdapter } from "../src/adapters/http.js";
import type { AdapterContext } from "../src/adapters/types.js";
import { registerRoutes } from "../src/api/routes.js";
import { defaultAppConfig, defaultConfig } from "../src/config/schema.js";
import { ConfigStore } from "../src/config/store.js";
import { RecentLogs } from "../src/runtime/logs.js";

const getFreePort = async () =>
  new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        reject(new Error("Could not allocate a free port"));
        return;
      }
      server.close(() => resolve(address.port));
    });
  });

const createApp = async () => {
  const dir = await mkdtemp(join(tmpdir(), "sim-api-"));
  const app = Fastify();
  await registerRoutes(app, {
    configStore: new ConfigStore(join(dir, "config.json")),
    defaultSavePath: join(dir, "save", "config.json")
  });

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

    const config = {
      services: [
        {
          ...defaultAppConfig.services[0],
          config: { ...defaultConfig, messageTemplate: "saved={aa}" }
        }
      ]
    };

    const save = await app.inject({ method: "PUT", url: "/api/config", payload: config });
    const load = await app.inject({ method: "GET", url: "/api/config" });

    expect(save.statusCode).toBe(200);
    expect(save.json()).toEqual(config);
    expect(load.statusCode).toBe(200);
    expect(load.json()).toEqual(config);
  });

  it("saves and loads config files from a selected path", async () => {
    const { app, dir } = await createApp();
    cleanup.push(async () => {
      await app.close();
      await rm(dir, { recursive: true, force: true });
    });

    const filePath = join(dir, "presets", "custom.json");
    const config = {
      services: [
        {
          ...defaultAppConfig.services[0],
          config: { ...defaultConfig, messageTemplate: "from-file={aa}" }
        }
      ]
    };

    const save = await app.inject({
      method: "POST",
      url: "/api/config-file/save",
      payload: { path: filePath, config }
    });
    const load = await app.inject({
      method: "POST",
      url: "/api/config-file/load",
      payload: { path: filePath }
    });

    expect(save.statusCode).toBe(200);
    expect(save.json()).toEqual({ path: filePath, config });
    expect(JSON.parse(await readFile(filePath, "utf8"))).toEqual(config);
    expect(load.statusCode).toBe(200);
    expect(load.json()).toEqual({ path: filePath, config });
  });

  it("uses the default save folder when no config file path is provided", async () => {
    const { app, dir } = await createApp();
    cleanup.push(async () => {
      await app.close();
      await rm(dir, { recursive: true, force: true });
    });

    const config = {
      services: [
        {
          ...defaultAppConfig.services[0],
          config: { ...defaultConfig, messageTemplate: "default-save={aa}" }
        }
      ]
    };
    const response = await app.inject({
      method: "POST",
      url: "/api/config-file/save",
      payload: { config }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ path: join(dir, "save", "config.json"), config });
  });

  it("resolves relative config file paths from the default save root", async () => {
    const { app, dir } = await createApp();
    cleanup.push(async () => {
      await app.close();
      await rm(dir, { recursive: true, force: true });
    });

    const config = {
      services: [
        {
          ...defaultAppConfig.services[0],
          config: { ...defaultConfig, messageTemplate: "relative-save={aa}" }
        }
      ]
    };
    const response = await app.inject({
      method: "POST",
      url: "/api/config-file/save",
      payload: { path: "save/relative.json", config }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ path: join(dir, "save", "relative.json"), config });
  });

  it("does not save runtime logs in config files", async () => {
    const { app, dir } = await createApp();
    cleanup.push(async () => {
      await app.close();
      await rm(dir, { recursive: true, force: true });
    });

    const filePath = join(dir, "save", "without-logs.json");
    const response = await app.inject({
      method: "POST",
      url: "/api/config-file/save",
      payload: {
        path: filePath,
        config: {
          services: [
            {
              ...defaultAppConfig.services[0],
              config: { ...defaultConfig, logs: [{ level: "info", message: "should not persist" }] }
            }
          ]
        }
      }
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(await readFile(filePath, "utf8"))).not.toHaveProperty("logs");
  });

  it("returns stopped runtime status before start and after stop", async () => {
    const { app, dir } = await createApp();
    cleanup.push(async () => {
      await app.close();
      await rm(dir, { recursive: true, force: true });
    });

    const initial = await app.inject({ method: "GET", url: "/api/status" });
    const stopped = await app.inject({ method: "POST", url: "/api/stop-all" });

    expect(initial.statusCode).toBe(200);
    expect(initial.json().services).toEqual([
      expect.objectContaining({ id: "service-1", name: "服务 1", running: false })
    ]);
    expect(stopped.statusCode).toBe(200);
    expect(stopped.json()).toEqual([{ id: "service-1", ok: true }]);
  });

  it("copies a service and saves the new app config", async () => {
    const { app, dir } = await createApp();
    cleanup.push(async () => {
      await app.close();
      await rm(dir, { recursive: true, force: true });
    });

    const copy = await app.inject({ method: "POST", url: "/api/services/service-1/copy" });
    const config = await app.inject({ method: "GET", url: "/api/config" });

    expect(copy.statusCode).toBe(200);
    expect(copy.json()).toMatchObject({ id: "service-2", name: "服务 1 副本" });
    expect(config.json().services).toHaveLength(2);
  });

  it("deletes a copied service and saves the remaining app config", async () => {
    const { app, dir } = await createApp();
    cleanup.push(async () => {
      await app.close();
      await rm(dir, { recursive: true, force: true });
    });

    await app.inject({ method: "POST", url: "/api/services/service-1/copy" });

    const deleted = await app.inject({ method: "DELETE", url: "/api/services/service-2" });
    const config = await app.inject({ method: "GET", url: "/api/config" });

    expect(deleted.statusCode).toBe(200);
    expect(deleted.json()).toEqual({ id: "service-2", ok: true });
    expect(config.json().services).toEqual([expect.objectContaining({ id: "service-1" })]);
  });

  it("does not delete the last service", async () => {
    const { app, dir } = await createApp();
    cleanup.push(async () => {
      await app.close();
      await rm(dir, { recursive: true, force: true });
    });

    const deleted = await app.inject({ method: "DELETE", url: "/api/services/service-1" });

    expect(deleted.statusCode).toBe(400);
    expect(deleted.json()).toEqual({ error: "At least one service is required" });
  });

  it("starts multiple MQTT and TCP services and then stops them all", async () => {
    const { app, dir } = await createApp();
    cleanup.push(async () => {
      await app.close();
      await rm(dir, { recursive: true, force: true });
    });

    const mqttPort = await getFreePort();
    const tcpPortA = await getFreePort();
    const tcpPortB = await getFreePort();
    const config = {
      services: [
        {
          id: "mqtt-a",
          name: "MQTT A",
          config: {
            ...defaultConfig,
            protocol: "mqtt" as const,
            serverSettings: {
              ...defaultConfig.serverSettings,
              mqtt: { ...defaultConfig.serverSettings.mqtt, port: mqttPort, topic: "simulator/a" }
            }
          }
        },
        {
          id: "mqtt-b",
          name: "MQTT B",
          config: {
            ...defaultConfig,
            protocol: "mqtt" as const,
            serverSettings: {
              ...defaultConfig.serverSettings,
              mqtt: { ...defaultConfig.serverSettings.mqtt, port: mqttPort, topic: "simulator/b" }
            }
          }
        },
        {
          id: "tcp-a",
          name: "TCP A",
          config: {
            ...defaultConfig,
            protocol: "tcp" as const,
            serverSettings: {
              ...defaultConfig.serverSettings,
              tcp: { ...defaultConfig.serverSettings.tcp, port: tcpPortA }
            }
          }
        },
        {
          id: "tcp-b",
          name: "TCP B",
          config: {
            ...defaultConfig,
            protocol: "tcp" as const,
            serverSettings: {
              ...defaultConfig.serverSettings,
              tcp: { ...defaultConfig.serverSettings.tcp, port: tcpPortB }
            }
          }
        }
      ]
    };

    const save = await app.inject({ method: "PUT", url: "/api/config", payload: config });
    const started = await app.inject({ method: "POST", url: "/api/start-all" });
    const status = await app.inject({ method: "GET", url: "/api/status" });
    const stopped = await app.inject({ method: "POST", url: "/api/stop-all" });

    expect(save.statusCode).toBe(200);
    expect(started.json()).toEqual([
      { id: "mqtt-a", ok: true },
      { id: "mqtt-b", ok: true },
      { id: "tcp-a", ok: true },
      { id: "tcp-b", ok: true }
    ]);
    expect(status.json().services).toEqual([
      expect.objectContaining({ id: "mqtt-a", running: true, adapterStatus: { listenAddress: `mqtt://0.0.0.0:${mqttPort}`, connectedClients: 0 } }),
      expect.objectContaining({ id: "mqtt-b", running: true, adapterStatus: { listenAddress: `mqtt://0.0.0.0:${mqttPort}`, connectedClients: 0 } }),
      expect.objectContaining({ id: "tcp-a", running: true, adapterStatus: { listenAddress: `tcp://0.0.0.0:${tcpPortA}`, connectedClients: 0 } }),
      expect.objectContaining({ id: "tcp-b", running: true, adapterStatus: { listenAddress: `tcp://0.0.0.0:${tcpPortB}`, connectedClients: 0 } })
    ]);
    expect(stopped.json()).toEqual([
      { id: "mqtt-a", ok: true },
      { id: "mqtt-b", ok: true },
      { id: "tcp-a", ok: true },
      { id: "tcp-b", ok: true }
    ]);
  });

  it("reports duplicated TCP ports during start-all without crashing the API", async () => {
    const { app, dir } = await createApp();
    cleanup.push(async () => {
      await app.close();
      await rm(dir, { recursive: true, force: true });
    });

    const tcpPort = await getFreePort();
    const config = {
      services: [
        {
          id: "tcp-a",
          name: "TCP A",
          config: {
            ...defaultConfig,
            protocol: "tcp" as const,
            serverSettings: {
              ...defaultConfig.serverSettings,
              tcp: { ...defaultConfig.serverSettings.tcp, port: tcpPort }
            }
          }
        },
        {
          id: "tcp-b",
          name: "TCP B",
          config: {
            ...defaultConfig,
            protocol: "tcp" as const,
            serverSettings: {
              ...defaultConfig.serverSettings,
              tcp: { ...defaultConfig.serverSettings.tcp, port: tcpPort }
            }
          }
        }
      ]
    };

    await app.inject({ method: "PUT", url: "/api/config", payload: config });

    const started = await app.inject({ method: "POST", url: "/api/start-all" });
    const status = await app.inject({ method: "GET", url: "/api/status" });
    const stopped = await app.inject({ method: "POST", url: "/api/stop-all" });

    expect(started.statusCode).toBe(200);
    expect(started.json()).toEqual([
      { id: "tcp-a", ok: true },
      expect.objectContaining({ id: "tcp-b", ok: false })
    ]);
    expect(status.statusCode).toBe(200);
    expect(stopped.statusCode).toBe(200);
  });

  it("previews a generated message without starting the simulator", async () => {
    const { app, dir } = await createApp();
    cleanup.push(async () => {
      await app.close();
      await rm(dir, { recursive: true, force: true });
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/preview",
      payload: {
        ...defaultConfig,
        parameters: [{ name: "aa", type: "integer", enabled: true, min: 5, max: 5 }]
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ message: "{\"aa\":5}" });
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
      const requestAddress = address?.replace("0.0.0.0", "127.0.0.1");

      expect(address).toMatch(/^http:\/\/0\.0\.0\.0:\d+$/);

      const response = await fetch(`${requestAddress}/current`);

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
