import type { SimulatorConfig } from "../config/schema.js";
import { simulatorConfigSchema } from "../config/schema.js";
import { generateMessageSnapshot } from "../generator/replacement.js";
import type { AdapterStatus, SimulatorAdapter } from "../adapters/types.js";
import { RecentLogs, type LogEntry } from "./logs.js";

type Protocol = SimulatorConfig["protocol"];

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

interface ActiveSimulator {
  adapter: SimulatorAdapter;
  config: SimulatorConfig;
  lastMessage: string;
  lastRandomizedAt: number;
  timer: ReturnType<typeof setInterval>;
}

export interface SimulatorRuntimeStatus {
  running: boolean;
  protocol?: Protocol;
  lastMessage?: string;
  logs: LogEntry[];
  adapterStatus?: AdapterStatus;
}

export class SimulatorRuntime {
  private active?: ActiveSimulator;
  private readonly logs = new RecentLogs();

  constructor(private readonly adapters: Partial<Record<Protocol, SimulatorAdapter>>) {}

  async start(configInput: unknown) {
    if (this.active !== undefined) {
      throw new Error("Simulator is already running");
    }

    const config = simulatorConfigSchema.parse(configInput);
    const adapter = this.adapters[config.protocol];

    if (adapter === undefined) {
      throw new Error(`No adapter registered for protocol ${config.protocol}`);
    }

    const createSnapshot = () => generateMessageSnapshot(config.messageTemplate, config.parameters);

    const active: ActiveSimulator = {
      adapter,
      config,
      lastMessage: createSnapshot(),
      lastRandomizedAt: Date.now(),
      timer: setInterval(() => {
        active.lastMessage = createSnapshot();
        active.lastRandomizedAt = Date.now();
      }, config.randomizeIntervalSeconds * 1000)
    };

    this.active = active;

    try {
      await adapter.start({
        config,
        getSnapshot: () => this.getSnapshot(),
        logs: this.logs
      });
      this.logs.add("info", `Simulator started using ${config.protocol}`);
    } catch (error) {
      clearInterval(active.timer);
      try {
        await adapter.stop();
      } catch (cleanupError) {
        this.logs.add("error", `Failed to clean up simulator after start failure: ${errorMessage(cleanupError)}`);
      } finally {
        this.active = undefined;
      }

      throw error;
    }
  }

  async stop() {
    const active = this.active;

    if (active === undefined) {
      return;
    }

    try {
      await active.adapter.stop();
      this.logs.add("info", "Simulator stopped");
    } catch (error) {
      this.logs.add("error", `Failed to stop simulator: ${errorMessage(error)}`);
    } finally {
      clearInterval(active.timer);
      this.active = undefined;
    }
  }

  getStatus(): SimulatorRuntimeStatus {
    const active = this.active;

    if (active === undefined) {
      return {
        running: false,
        protocol: undefined,
        lastMessage: undefined,
        logs: this.logs.list(),
        adapterStatus: undefined
      };
    }

    return {
      running: true,
      protocol: active.config.protocol,
      lastMessage: active.lastMessage,
      logs: this.logs.list(),
      adapterStatus: active.adapter.getStatus()
    };
  }

  private getSnapshot() {
    const active = this.active;

    if (active === undefined) {
      throw new Error("Simulator is not running");
    }

    if (active.config.protocol === "http" && this.randomizationExpired(active)) {
      active.lastMessage = generateMessageSnapshot(active.config.messageTemplate, active.config.parameters);
      active.lastRandomizedAt = Date.now();
    }

    return active.lastMessage;
  }

  private randomizationExpired(active: ActiveSimulator) {
    return Date.now() - active.lastRandomizedAt >= active.config.randomizeIntervalSeconds * 1000;
  }
}
