import type { FastifyInstance, FastifyReply } from "fastify";
import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ZodError } from "zod";
import { HttpAdapter } from "../adapters/http.js";
import { MqttAdapter } from "../adapters/mqtt.js";
import { OpcUaAdapter } from "../adapters/opcua.js";
import { TcpAdapter } from "../adapters/tcp.js";
import { WebSocketAdapter } from "../adapters/websocket.js";
import {
  appConfigSchema,
  cloneServiceForCopy,
  simulatorConfigSchema,
  type AppConfig
} from "../config/schema.js";
import { ConfigStore } from "../config/store.js";
import { generateMessageSnapshot } from "../generator/replacement.js";
import { MultiServiceRuntime } from "../runtime/multi-runtime.js";
import { SimulatorRuntime } from "../runtime/runtime.js";

export interface RegisterRoutesOptions {
  configStore?: ConfigStore;
  defaultSavePath?: string;
  runtime?: MultiServiceRuntime;
}

const defaultConfigPath = process.env.SIMULATOR_CONFIG_PATH ?? "data/config.json";

const findRepoRoot = () => {
  let current = dirname(fileURLToPath(import.meta.url));

  while (true) {
    const packagePath = join(current, "package.json");
    if (existsSync(packagePath)) {
      try {
        const packageJson = JSON.parse(readFileSync(packagePath, "utf8")) as { name?: string };
        if (packageJson.name === "message-simulator") {
          return current;
        }
      } catch {
        // Keep walking upward if this package.json is not readable.
      }
    }

    const parent = dirname(current);
    if (parent === current) {
      return process.cwd();
    }
    current = parent;
  }
};

const resolveSavePath = (inputPath: unknown, defaultSavePath: string) => {
  if (typeof inputPath !== "string" || inputPath.trim() === "") {
    return defaultSavePath;
  }

  const trimmedPath = inputPath.trim();
  if (isAbsolute(trimmedPath)) {
    return resolve(trimmedPath);
  }

  return resolve(dirname(dirname(defaultSavePath)), trimmedPath);
};

const createSimulatorRuntime = () =>
  new SimulatorRuntime({
    http: new HttpAdapter(),
    websocket: new WebSocketAdapter(),
    tcp: new TcpAdapter(),
    mqtt: new MqttAdapter(),
    opcua: new OpcUaAdapter()
  });

const createDefaultRuntime = () => new MultiServiceRuntime(createSimulatorRuntime);

const sendValidationError = (reply: FastifyReply, error: ZodError) =>
  reply.status(400).send({ error: "Invalid simulator config", issues: error.issues });

export async function registerRoutes(app: FastifyInstance, options: RegisterRoutesOptions = {}) {
  const configStore = options.configStore ?? new ConfigStore(defaultConfigPath);
  const defaultSavePath =
    options.defaultSavePath ?? process.env.SIMULATOR_SAVE_PATH ?? join(findRepoRoot(), "save", "config.json");
  const runtime = options.runtime ?? createDefaultRuntime();
  let currentConfig: AppConfig | undefined;

  const loadCurrentConfig = async () => {
    currentConfig ??= await configStore.load();
    return currentConfig;
  };

  app.get("/api/config", async () => loadCurrentConfig());

  app.put("/api/config", async (request, reply) => {
    const parsed = appConfigSchema.safeParse(request.body);

    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    currentConfig = parsed.data;
    await configStore.save(currentConfig);
    return currentConfig;
  });

  app.post("/api/config-file/save", async (request, reply) => {
    const body = request.body as { path?: unknown; config?: unknown };
    const parsed = appConfigSchema.safeParse(body.config);

    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    const filePath = resolveSavePath(body.path, defaultSavePath);
    currentConfig = parsed.data;
    await new ConfigStore(filePath).save(currentConfig);
    return { path: filePath, config: currentConfig };
  });

  app.post("/api/config-file/load", async (request) => {
    const body = request.body as { path?: unknown };
    const filePath = resolveSavePath(body.path, defaultSavePath);
    currentConfig = await new ConfigStore(filePath).load();
    runtime.syncServices(currentConfig);
    return { path: filePath, config: currentConfig };
  });

  app.get("/api/status", async () => {
    runtime.syncServices(await loadCurrentConfig());
    return runtime.getStatus();
  });

  app.post("/api/services/:id/copy", async (request, reply) => {
    const config = await loadCurrentConfig();
    const { id } = request.params as { id: string };
    const service = config.services.find((candidate) => candidate.id === id);

    if (service === undefined) {
      return reply.status(404).send({ error: `Service not found: ${id}` });
    }

    const copy = cloneServiceForCopy(service, config.services);
    currentConfig = { services: [...config.services, copy] };
    await configStore.save(currentConfig);
    runtime.syncServices(currentConfig);
    return copy;
  });

  app.delete("/api/services/:id", async (request, reply) => {
    const config = await loadCurrentConfig();
    const { id } = request.params as { id: string };
    const service = config.services.find((candidate) => candidate.id === id);

    if (service === undefined) {
      return reply.status(404).send({ error: `Service not found: ${id}` });
    }

    if (config.services.length <= 1) {
      return reply.status(400).send({ error: "At least one service is required" });
    }

    await runtime.stopService(id);
    currentConfig = { services: config.services.filter((candidate) => candidate.id !== id) };
    await configStore.save(currentConfig);
    runtime.syncServices(currentConfig);
    return { id, ok: true };
  });

  app.post("/api/preview", async (request, reply) => {
    const parsed = simulatorConfigSchema.safeParse(request.body);

    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    return { message: generateMessageSnapshot(parsed.data.messageTemplate, parsed.data.parameters) };
  });

  app.post("/api/services/:id/start", async (request) => {
    const { id } = request.params as { id: string };
    const config = await loadCurrentConfig();
    await runtime.startService(config, id);
    return runtime.getStatus();
  });

  app.post("/api/services/:id/stop", async (request) => {
    const { id } = request.params as { id: string };
    await runtime.stopService(id);
    runtime.syncServices(await loadCurrentConfig());
    return runtime.getStatus();
  });

  app.post("/api/start-all", async () => runtime.startAll(await loadCurrentConfig()));

  app.post("/api/stop-all", async () => {
    const config = await loadCurrentConfig();
    const results = [];
    for (const service of config.services) {
      results.push(await runtime.stopService(service.id));
    }
    runtime.syncServices(config);
    return results;
  });
}
