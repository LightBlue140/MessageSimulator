import { describe, expect, it } from "vitest";
import { generateRandomValue } from "../src/generator/random.js";
import { generateMessageSnapshot } from "../src/generator/replacement.js";
import type { ParameterConfig } from "../src/config/schema.js";

describe("generateMessageSnapshot", () => {
  it("recursively replaces enabled JSON object properties and traverses arrays", () => {
    const template = JSON.stringify({
      aa: 100,
      nested: { aa: 100, untouched: 1 },
      samples: [{ aa: 100 }, { disabled: "keep" }]
    });
    const parameters: ParameterConfig[] = [
      { name: "aa", type: "integer", enabled: true, min: 5, max: 5 },
      { name: "disabled", type: "string", enabled: false, candidates: ["replace"] }
    ];

    const result = JSON.parse(generateMessageSnapshot(template, parameters)) as {
      aa: number;
      nested: { aa: number; untouched: number };
      samples: Array<{ aa?: number; disabled?: string }>;
    };

    expect(result).toEqual({
      aa: 5,
      nested: { aa: 5, untouched: 1 },
      samples: [{ aa: 5 }, { disabled: "keep" }]
    });
  });

  it("replaces string assignment values without matching partial parameter names", () => {
    const parameters: ParameterConfig[] = [
      { name: "aa", type: "integer", enabled: true, min: 7, max: 7 },
      { name: "flag", type: "boolean", enabled: true, trueProbability: 1 }
    ];

    expect(generateMessageSnapshot("aa=100 aaa=100 flag=false", parameters)).toBe(
      "aa=7 aaa=100 flag=true"
    );
  });

  it("generates independent values for repeated occurrences in a single pass", () => {
    const parameters: ParameterConfig[] = [
      { name: "pick", type: "integer", enabled: true, min: 1, max: 3 }
    ];

    const originalRandom = Math.random;
    Math.random = (() => {
      const values = [0, 0.5, 0.99];
      return () => values.shift() ?? 0;
    })();

    try {
      const result = JSON.parse(
        generateMessageSnapshot("{\"pick\":0,\"items\":[{\"pick\":0},{\"pick\":0}]}", parameters)
      ) as { pick: number; items: Array<{ pick: number }> };

      expect([result.pick, result.items[0]?.pick, result.items[1]?.pick]).toEqual([1, 2, 3]);
    } finally {
      Math.random = originalRandom;
    }
  });
});

describe("generateRandomValue", () => {
  it("generates vector objects from component ranges", () => {
    const parameter: ParameterConfig = {
      name: "position",
      type: "vector",
      enabled: true,
      components: [
        { name: "x", min: 1, max: 1, decimals: 2 },
        { name: "y", min: 2.5, max: 2.5, decimals: 1 }
      ]
    };

    expect(generateRandomValue(parameter)).toEqual({ x: 1, y: 2.5 });
  });
});
