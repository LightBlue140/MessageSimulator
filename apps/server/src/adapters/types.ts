import type { SimulatorConfig } from "../config/schema.js";
import type { RecentLogs } from "../runtime/logs.js";

export interface AdapterStatus {
  connectedClients?: number;
  requestCount?: number;
  listenAddress?: string;
}

export interface AdapterContext {
  config: SimulatorConfig;
  getSnapshot: () => string;
  logs: RecentLogs;
}

export interface SimulatorAdapter {
  start: (context: AdapterContext) => Promise<void>;
  stop: () => Promise<void>;
  getStatus: () => AdapterStatus;
}
