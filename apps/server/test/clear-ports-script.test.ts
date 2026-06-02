import { describe, expect, it } from "vitest";
// @ts-expect-error The startup helper is an executable mjs script outside the server package.
import { findPidsForPorts } from "../../../scripts/clear-ports.mjs";

describe("clear ports script", () => {
  it("finds listening process ids for requested ports", () => {
    const output = [
      "  TCP    0.0.0.0:3001           0.0.0.0:0              LISTENING       1234",
      "  TCP    [::]:5173              [::]:0                 LISTENING       5678",
      "  TCP    127.0.0.1:1883         127.0.0.1:51000        ESTABLISHED     9999"
    ].join("\n");

    expect(findPidsForPorts(output, [3001, 5173])).toEqual(new Set(["1234", "5678"]));
  });
});
