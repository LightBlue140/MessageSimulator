import { describe, expect, it } from "vitest";
import { MqttAdapter } from "../src/adapters/mqtt.js";
import { OpcUaAdapter } from "../src/adapters/opcua.js";
import type { AdapterContext } from "../src/adapters/types.js";
import { defaultConfig } from "../src/config/schema.js";
import { RecentLogs } from "../src/runtime/logs.js";

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
});
