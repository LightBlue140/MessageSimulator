import type { AppConfig, SimulatorService } from "../config/schema.js";
import type { SimulatorRuntime, SimulatorRuntimeStatus } from "./runtime.js";

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

export interface ServiceRuntimeStatus extends SimulatorRuntimeStatus {
  id: string;
  name: string;
  error?: string;
}

export interface MultiServiceRuntimeStatus {
  services: ServiceRuntimeStatus[];
}

export interface RuntimeActionResult {
  id: string;
  ok: boolean;
  error?: string;
}

export class MultiServiceRuntime {
  private readonly runtimes = new Map<string, SimulatorRuntime>();
  private readonly services = new Map<string, Pick<SimulatorService, "id" | "name">>();
  private readonly errors = new Map<string, string>();

  constructor(private readonly createRuntime: () => SimulatorRuntime) {}

  async startService(config: AppConfig, serviceId: string): Promise<RuntimeActionResult> {
    const service = this.findService(config, serviceId);
    const runtime = this.runtimeFor(service.id);
    const status = runtime.getStatus();

    this.services.set(service.id, { id: service.id, name: service.name });
    if (status.running) {
      return { id: service.id, ok: true };
    }

    try {
      await runtime.start(service.config);
      this.errors.delete(service.id);
      return { id: service.id, ok: true };
    } catch (error) {
      const message = errorMessage(error);
      this.errors.set(service.id, message);
      return { id: service.id, ok: false, error: message };
    }
  }

  async stopService(serviceId: string): Promise<RuntimeActionResult> {
    const runtime = this.runtimes.get(serviceId);
    if (runtime === undefined) {
      this.errors.delete(serviceId);
      return { id: serviceId, ok: true };
    }

    try {
      await runtime.stop();
      this.errors.delete(serviceId);
      return { id: serviceId, ok: true };
    } catch (error) {
      const message = errorMessage(error);
      this.errors.set(serviceId, message);
      return { id: serviceId, ok: false, error: message };
    }
  }

  async startAll(config: AppConfig): Promise<RuntimeActionResult[]> {
    const results: RuntimeActionResult[] = [];

    for (const service of config.services) {
      results.push(await this.startService(config, service.id));
    }

    return results;
  }

  async stopAll(): Promise<RuntimeActionResult[]> {
    const results: RuntimeActionResult[] = [];

    for (const serviceId of [...this.runtimes.keys()]) {
      results.push(await this.stopService(serviceId));
    }

    return results;
  }

  syncServices(config: AppConfig) {
    for (const service of config.services) {
      this.services.set(service.id, { id: service.id, name: service.name });
    }

    const configuredIds = new Set(config.services.map((service) => service.id));
    for (const serviceId of this.services.keys()) {
      if (!configuredIds.has(serviceId) && !this.runtimes.get(serviceId)?.getStatus().running) {
        this.services.delete(serviceId);
        this.runtimes.delete(serviceId);
        this.errors.delete(serviceId);
      }
    }
  }

  getStatus(): MultiServiceRuntimeStatus {
    return {
      services: [...this.services.values()].map((service) => {
        const runtimeStatus = this.runtimes.get(service.id)?.getStatus() ?? {
          running: false,
          protocol: undefined,
          lastMessage: undefined,
          logs: [],
          adapterStatus: undefined
        };

        return {
          ...runtimeStatus,
          id: service.id,
          name: service.name,
          error: this.errors.get(service.id)
        };
      })
    };
  }

  private runtimeFor(serviceId: string) {
    let runtime = this.runtimes.get(serviceId);
    if (runtime === undefined) {
      runtime = this.createRuntime();
      this.runtimes.set(serviceId, runtime);
    }
    return runtime;
  }

  private findService(config: AppConfig, serviceId: string) {
    const service = config.services.find((candidate) => candidate.id === serviceId);
    if (service === undefined) {
      throw new Error(`Service not found: ${serviceId}`);
    }
    return service;
  }
}
