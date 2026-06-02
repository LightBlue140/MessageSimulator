import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { defaultConfig } from "../src/config/schema.js";
import { ConfigStore } from "../src/config/store.js";
import { RecentLogs } from "../src/runtime/logs.js";

describe("ConfigStore", () => {
  it("persists and loads simulator config", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sim-config-"));
    try {
      const store = new ConfigStore(join(dir, "config.json"));
      await store.save({ ...defaultConfig, messageTemplate: "aa=100" });
      expect((await store.load()).messageTemplate).toBe("aa=100");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("returns a cloned default config when the file is missing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sim-config-"));
    try {
      const store = new ConfigStore(join(dir, "missing.json"));
      const loaded = await store.load();
      loaded.serverSettings.http.port = 1234;
      expect((await store.load()).serverSettings.http.port).toBe(defaultConfig.serverSettings.http.port);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("throws when the config file contains invalid JSON", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sim-config-"));
    try {
      const configPath = join(dir, "config.json");
      await writeFile(configPath, "{", "utf8");
      const store = new ConfigStore(configPath);
      await expect(store.load()).rejects.toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
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

  it("rejects invalid limits", () => {
    for (const limit of [0, -1, 1.5, Number.POSITIVE_INFINITY, Number.NaN]) {
      expect(() => new RecentLogs(limit)).toThrow();
    }
  });

  it("returns cloned entries from list", () => {
    const logs = new RecentLogs(1);
    logs.add("info", "original");
    const [entry] = logs.list();
    entry.message = "changed";
    expect(logs.list()[0]?.message).toBe("original");
  });
});
