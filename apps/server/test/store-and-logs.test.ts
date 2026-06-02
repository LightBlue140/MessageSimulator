import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { defaultConfig } from "../src/config/schema.js";
import { ConfigStore } from "../src/config/store.js";
import { RecentLogs } from "../src/runtime/logs.js";

describe("ConfigStore", () => {
  it("persists and loads simulator config", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sim-config-"));
    const store = new ConfigStore(join(dir, "config.json"));
    await store.save({ ...defaultConfig, messageTemplate: "aa=100" });
    expect((await store.load()).messageTemplate).toBe("aa=100");
    await rm(dir, { recursive: true, force: true });
  });
});

describe("RecentLogs", () => {
  it("keeps the newest entries within the limit", () => {
    const logs = new RecentLogs(2);
    logs.add("info", "one");
    logs.add("info", "two");
    logs.add("info", "three");
    expect(logs.list().map((entry) => entry.message)).toEqual(["two", "three"]);
  });
});
