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
});
