import { describe, expect, it } from "vitest";
import { findPortConflictsFromNetstat } from "../src/runtime/ports.js";

describe("port manager helpers", () => {
  it("finds listening process ids for requested ports and ignores the current process", () => {
    const output = [
      "  TCP    0.0.0.0:8080           0.0.0.0:0              LISTENING       1234",
      "  TCP    [::]:8080              [::]:0                 LISTENING       1234",
      "  TCP    0.0.0.0:9000           0.0.0.0:0              LISTENING       4321",
      "  TCP    0.0.0.0:3001           0.0.0.0:0              LISTENING       9999",
      "  TCP    127.0.0.1:8080         127.0.0.1:51000        ESTABLISHED     5555"
    ].join("\n");

    expect(findPortConflictsFromNetstat(output, [8080, 9000], 4321)).toEqual([
      { port: 8080, pids: ["1234"] }
    ]);
  });
});
