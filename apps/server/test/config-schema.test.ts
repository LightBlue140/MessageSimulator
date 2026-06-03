import { describe, expect, it } from "vitest";
import {
  appConfigSchema,
  cloneServiceForCopy,
  defaultAppConfig,
  defaultConfig,
  simulatorConfigSchema,
  toAppConfig
} from "../src/config/schema.js";

describe("simulatorConfigSchema", () => {
  it("accepts the default HTTP configuration", () => {
    expect(simulatorConfigSchema.parse(defaultConfig).protocol).toBe("http");
  });

  it("rejects invalid intervals", () => {
    expect(() =>
      simulatorConfigSchema.parse({ ...defaultConfig, randomizeIntervalSeconds: 0 })
    ).toThrow();
  });

  it("rejects a vector parameter without components", () => {
    expect(() =>
      simulatorConfigSchema.parse({
        ...defaultConfig,
        parameters: [
          { name: "pos", type: "vector", enabled: true, components: [] }
        ]
      })
    ).toThrow();
  });

  it("rejects duplicate top-level parameter names", () => {
    expect(() =>
      simulatorConfigSchema.parse({
        ...defaultConfig,
        parameters: [
          { name: "aa", type: "integer", enabled: true, min: 0, max: 999 },
          { name: "aa", type: "float", enabled: true, min: 0, max: 1, decimals: 2 }
        ]
      })
    ).toThrow();
  });

  it("rejects duplicate vector component names", () => {
    expect(() =>
      simulatorConfigSchema.parse({
        ...defaultConfig,
        parameters: [
          {
            name: "pos",
            type: "vector",
            enabled: true,
            components: [
              { name: "x", min: 0, max: 1, decimals: 2 },
              { name: "x", min: 0, max: 1, decimals: 2 }
            ]
          }
        ]
      })
    ).toThrow();
  });

  it("rejects a parameter range with max below min", () => {
    expect(() =>
      simulatorConfigSchema.parse({
        ...defaultConfig,
        parameters: [
          { name: "aa", type: "integer", enabled: true, min: 10, max: 1 }
        ]
      })
    ).toThrow();
  });

  it("accepts optional MQTT credentials", () => {
    const parsed = simulatorConfigSchema.parse({
      ...defaultConfig,
      serverSettings: {
        ...defaultConfig.serverSettings,
        mqtt: {
          ...defaultConfig.serverSettings.mqtt,
          username: "operator",
          password: "secret"
        }
      }
    });

    expect(parsed.serverSettings.mqtt.username).toBe("operator");
    expect(parsed.serverSettings.mqtt.password).toBe("secret");
  });
});

describe("appConfigSchema", () => {
  it("accepts the default multi-service configuration", () => {
    const parsed = appConfigSchema.parse(defaultAppConfig);

    expect(parsed.services).toHaveLength(1);
    expect(parsed.services[0].config.protocol).toBe("http");
  });

  it("upgrades a legacy single-service config into an app config", () => {
    const parsed = toAppConfig({ ...defaultConfig, messageTemplate: "legacy={aa}" });

    expect(parsed.services).toHaveLength(1);
    expect(parsed.services[0]).toMatchObject({
      id: "service-1",
      name: "服务 1",
      config: { messageTemplate: "legacy={aa}" }
    });
  });

  it("copies a service and changes duplicated MQTT topics", () => {
    const source = {
      id: "mqtt-1",
      name: "MQTT",
      config: {
        ...defaultConfig,
        protocol: "mqtt" as const,
        serverSettings: {
          ...defaultConfig.serverSettings,
          mqtt: { ...defaultConfig.serverSettings.mqtt, topic: "simulator/message" }
        }
      }
    };

    const copy = cloneServiceForCopy(source, [source]);

    expect(copy.id).not.toBe(source.id);
    expect(copy.name).toBe("MQTT 副本");
    expect(copy.config.serverSettings.mqtt.port).toBe(source.config.serverSettings.mqtt.port);
    expect(copy.config.serverSettings.mqtt.topic).toBe("simulator/message-copy-1");
    expect(copy.config.messageTemplate).toBe(source.config.messageTemplate);
  });
});
