import { describe, expect, it } from "vitest";
import { createServer } from "node:net";
import { MqttAdapter } from "../src/adapters/mqtt.js";
import { OpcUaAdapter } from "../src/adapters/opcua.js";
import type { AdapterContext } from "../src/adapters/types.js";
import { defaultConfig } from "../src/config/schema.js";
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

describe("MQTT and OPC UA adapters", () => {
  it("construct with empty status", () => {
    expect(new MqttAdapter().getStatus()).toEqual({ connectedClients: 0 });
    expect(new OpcUaAdapter().getStatus()).toEqual({ connectedClients: 0 });
  });

  it("reports the MQTT listen address after start", async () => {
    const adapter = new MqttAdapter();
    const context: AdapterContext = {
      config: {
        ...defaultConfig,
        protocol: "mqtt",
        serverSettings: {
          ...defaultConfig.serverSettings,
          mqtt: { ...defaultConfig.serverSettings.mqtt, port: 0 }
        }
      },
      getSnapshot: () => "snapshot",
      logs: new RecentLogs()
    };

    try {
      await adapter.start(context);

      expect(adapter.getStatus().listenAddress).toMatch(/^mqtt:\/\/0\.0\.0\.0:\d+$/);
    } finally {
      await adapter.stop();
    }
  });

  it("allows multiple MQTT publishers to share the same broker port", async () => {
    const port = await getFreePort();
    const first = new MqttAdapter();
    const second = new MqttAdapter();
    const contextFor = (topic: string): AdapterContext => ({
      config: {
        ...defaultConfig,
        protocol: "mqtt",
        serverSettings: {
          ...defaultConfig.serverSettings,
          mqtt: { ...defaultConfig.serverSettings.mqtt, port, topic }
        }
      },
      getSnapshot: () => topic,
      logs: new RecentLogs()
    });

    try {
      await first.start(contextFor("simulator/one"));
      await second.start(contextFor("simulator/two"));

      expect(first.getStatus().listenAddress).toBe(`mqtt://0.0.0.0:${port}`);
      expect(second.getStatus().listenAddress).toBe(`mqtt://0.0.0.0:${port}`);
    } finally {
      await second.stop();
      await first.stop();
    }
  });

  it("keeps the shared MQTT broker alive when one publisher stops", async () => {
    const port = await getFreePort();
    const first = new MqttAdapter();
    const second = new MqttAdapter();
    const third = new MqttAdapter();
    const contextFor = (topic: string): AdapterContext => ({
      config: {
        ...defaultConfig,
        protocol: "mqtt",
        serverSettings: {
          ...defaultConfig.serverSettings,
          mqtt: { ...defaultConfig.serverSettings.mqtt, port, topic }
        }
      },
      getSnapshot: () => topic,
      logs: new RecentLogs()
    });

    try {
      await first.start(contextFor("simulator/one"));
      await second.start(contextFor("simulator/two"));
      await first.stop();

      expect(second.getStatus().listenAddress).toBe(`mqtt://0.0.0.0:${port}`);

      await third.start(contextFor("simulator/three"));
      expect(third.getStatus().listenAddress).toBe(`mqtt://0.0.0.0:${port}`);
    } finally {
      await third.stop();
      await second.stop();
      await first.stop();
    }
  });
});
