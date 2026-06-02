import { describe, expect, it } from "vitest";
import { defaultConfig, simulatorConfigSchema } from "../src/config/schema.js";

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
