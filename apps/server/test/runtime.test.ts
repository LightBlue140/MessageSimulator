import { afterEach, describe, expect, it, vi } from "vitest";
import type { SimulatorConfig } from "../src/config/schema.js";
import { defaultConfig } from "../src/config/schema.js";
import type { AdapterContext, AdapterStatus, SimulatorAdapter } from "../src/adapters/types.js";
import type { AppConfig } from "../src/config/schema.js";
import { MultiServiceRuntime } from "../src/runtime/multi-runtime.js";
import { SimulatorRuntime } from "../src/runtime/runtime.js";

class TestAdapter implements SimulatorAdapter {
  public starts = 0;
  public stops = 0;
  public context?: AdapterContext;
  public status: AdapterStatus = { connectedClients: 1, requestCount: 2 };
  public startError?: Error;
  public stopErrors: Error[] = [];

  async start(context: AdapterContext) {
    this.starts += 1;
    this.context = context;

    if (this.startError !== undefined) {
      throw this.startError;
    }
  }

  async stop() {
    this.stops += 1;

    const error = this.stopErrors.shift();
    if (error !== undefined) {
      throw error;
    }
  }

  getStatus() {
    return this.status;
  }
}

const testConfig = (overrides: Partial<SimulatorConfig> = {}): SimulatorConfig => ({
  ...defaultConfig,
  parameters: [{ name: "aa", type: "integer", enabled: true, min: 1, max: 1 }],
  messageTemplate: "{\"aa\":100}",
  randomizeIntervalSeconds: 60,
  ...overrides
});

describe("SimulatorRuntime", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("creates the first snapshot and starts the selected adapter", async () => {
    const adapter = new TestAdapter();
    const runtime = new SimulatorRuntime({ http: adapter });

    try {
      await runtime.start(testConfig());

      expect(adapter.starts).toBe(1);
      expect(adapter.context?.config.protocol).toBe("http");
      expect(adapter.context?.getSnapshot()).toBe("{\"aa\":1}");
      expect(runtime.getStatus().lastMessage).toMatch(/"aa":\d+/);
      expect(runtime.getStatus()).toMatchObject({
        running: true,
        protocol: "http",
        adapterStatus: { connectedClients: 1, requestCount: 2 }
      });
    } finally {
      await runtime.stop();
    }
  });

  it("stops the active adapter and resets status", async () => {
    const adapter = new TestAdapter();
    const runtime = new SimulatorRuntime({ http: adapter });

    await runtime.start(testConfig());
    await runtime.stop();

    expect(adapter.stops).toBe(1);
    expect(runtime.getStatus()).toMatchObject({
      running: false,
      protocol: undefined,
      lastMessage: undefined,
      adapterStatus: undefined
    });
    expect(runtime.getStatus().logs.map((entry) => entry.message)).toContain("Simulator stopped");
  });

  it("rejects starting while already running", async () => {
    const adapter = new TestAdapter();
    const runtime = new SimulatorRuntime({ http: adapter });

    try {
      await runtime.start(testConfig());

      await expect(runtime.start(testConfig())).rejects.toThrow("Simulator is already running");
      expect(adapter.starts).toBe(1);
    } finally {
      await runtime.stop();
    }
  });

  it("validates config before starting an adapter", async () => {
    const adapter = new TestAdapter();
    const runtime = new SimulatorRuntime({ http: adapter });

    await expect(runtime.start({ ...testConfig(), randomizeIntervalSeconds: 0 })).rejects.toThrow();
    expect(adapter.starts).toBe(0);
  });

  it("refreshes an expired HTTP snapshot without logging randomization", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    vi.spyOn(Math, "random").mockReturnValueOnce(0).mockReturnValueOnce(0.99);

    const adapter = new TestAdapter();
    const runtime = new SimulatorRuntime({ http: adapter });

    try {
      await runtime.start(
        testConfig({
          randomizeIntervalSeconds: 0.1,
          parameters: [{ name: "aa", type: "integer", enabled: true, min: 1, max: 3 }]
        })
      );
      const initialLogCount = runtime.getStatus().logs.length;

      vi.setSystemTime(101);

      expect(adapter.context?.getSnapshot()).toBe("{\"aa\":3}");
      expect(runtime.getStatus().logs).toHaveLength(initialLogCount);
    } finally {
      await runtime.stop();
    }
  });

  it("cleans up the adapter and reports stopped when adapter start fails", async () => {
    const adapter = new TestAdapter();
    adapter.startError = new Error("start failed");
    const runtime = new SimulatorRuntime({ http: adapter });

    await expect(runtime.start(testConfig())).rejects.toThrow("start failed");

    expect(adapter.stops).toBe(1);
    expect(runtime.getStatus()).toMatchObject({
      running: false,
      protocol: undefined,
      lastMessage: undefined,
      adapterStatus: undefined
    });
  });

  it("keeps running and allows retry when adapter stop fails", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    vi.spyOn(Math, "random").mockReturnValueOnce(0).mockReturnValueOnce(0.99);

    const adapter = new TestAdapter();
    adapter.stopErrors.push(new Error("stop failed"));
    const runtime = new SimulatorRuntime({ http: adapter });

    await runtime.start(
      testConfig({
        randomizeIntervalSeconds: 0.1,
        parameters: [{ name: "aa", type: "integer", enabled: true, min: 1, max: 3 }]
      })
    );

    await runtime.stop();

    expect(runtime.getStatus()).toMatchObject({
      running: true,
      protocol: "http"
    });
    expect(runtime.getStatus().logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ level: "error", message: "Failed to stop simulator: stop failed" })
      ])
    );

    await vi.advanceTimersByTimeAsync(100);
    expect(runtime.getStatus().lastMessage).toBe("{\"aa\":3}");

    await runtime.stop();

    expect(adapter.stops).toBe(2);
    expect(runtime.getStatus().running).toBe(false);
  });
});

describe("MultiServiceRuntime", () => {
  it("starts and stops individual services", async () => {
    const adapter = new TestAdapter();
    const appConfig: AppConfig = {
      services: [{ id: "service-a", name: "HTTP A", config: testConfig() }]
    };
    const runtime = new MultiServiceRuntime(() => new SimulatorRuntime({ http: adapter }));

    await runtime.startService(appConfig, "service-a");

    expect(adapter.starts).toBe(1);
    expect(runtime.getStatus().services[0]).toMatchObject({
      id: "service-a",
      name: "HTTP A",
      running: true,
      protocol: "http"
    });

    await runtime.stopService("service-a");

    expect(adapter.stops).toBe(1);
    expect(runtime.getStatus().services[0]).toMatchObject({
      id: "service-a",
      running: false,
      protocol: undefined
    });
  });

  it("starts all stopped services and stops all running services", async () => {
    const adapters = [new TestAdapter(), new TestAdapter()];
    let index = 0;
    const appConfig: AppConfig = {
      services: [
        { id: "service-a", name: "HTTP A", config: testConfig() },
        { id: "service-b", name: "HTTP B", config: testConfig() }
      ]
    };
    const runtime = new MultiServiceRuntime(() => new SimulatorRuntime({ http: adapters[index++] }));

    await runtime.startAll(appConfig);

    expect(adapters.map((adapter) => adapter.starts)).toEqual([1, 1]);
    expect(runtime.getStatus().services.map((service) => service.running)).toEqual([true, true]);

    await runtime.stopAll();

    expect(adapters.map((adapter) => adapter.stops)).toEqual([1, 1]);
    expect(runtime.getStatus().services.map((service) => service.running)).toEqual([false, false]);
  });

  it("reports a service start failure without blocking other services", async () => {
    const failingAdapter = new TestAdapter();
    failingAdapter.startError = new Error("port busy");
    const okAdapter = new TestAdapter();
    const adapters = [failingAdapter, okAdapter];
    let index = 0;
    const appConfig: AppConfig = {
      services: [
        { id: "service-a", name: "Bad", config: testConfig() },
        { id: "service-b", name: "Good", config: testConfig() }
      ]
    };
    const runtime = new MultiServiceRuntime(() => new SimulatorRuntime({ http: adapters[index++] }));

    const result = await runtime.startAll(appConfig);

    expect(result).toEqual([
      { id: "service-a", ok: false, error: "port busy" },
      { id: "service-b", ok: true }
    ]);
    expect(runtime.getStatus().services).toEqual([
      expect.objectContaining({ id: "service-a", running: false, error: "port busy" }),
      expect.objectContaining({ id: "service-b", running: true, error: undefined })
    ]);
  });
});
