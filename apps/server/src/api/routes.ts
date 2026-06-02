import type { FastifyInstance, FastifyReply } from "fastify";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ZodError } from "zod";
import { HttpAdapter } from "../adapters/http.js";
import { MqttAdapter } from "../adapters/mqtt.js";
import { OpcUaAdapter } from "../adapters/opcua.js";
import { TcpAdapter } from "../adapters/tcp.js";
import { WebSocketAdapter } from "../adapters/websocket.js";
import { simulatorConfigSchema, type SimulatorConfig } from "../config/schema.js";
import { ConfigStore } from "../config/store.js";
import { generateMessageSnapshot } from "../generator/replacement.js";
import { SimulatorRuntime } from "../runtime/runtime.js";

export interface RegisterRoutesOptions {
  configStore?: ConfigStore;
  defaultSavePath?: string;
  runtime?: SimulatorRuntime;
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
  return resolve(inputPath);
};

const createDefaultRuntime = () =>
  new SimulatorRuntime({
    http: new HttpAdapter(),
    websocket: new WebSocketAdapter(),
    tcp: new TcpAdapter(),
    mqtt: new MqttAdapter(),
    opcua: new OpcUaAdapter()
  });

const sendValidationError = (reply: FastifyReply, error: ZodError) =>
  reply.status(400).send({ error: "Invalid simulator config", issues: error.issues });

export async function registerRoutes(app: FastifyInstance, options: RegisterRoutesOptions = {}) {
  const configStore = options.configStore ?? new ConfigStore(defaultConfigPath);
  const defaultSavePath =
    options.defaultSavePath ?? process.env.SIMULATOR_SAVE_PATH ?? join(findRepoRoot(), "save", "config.json");
  const runtime = options.runtime ?? createDefaultRuntime();
  let currentConfig: SimulatorConfig | undefined;

  const loadCurrentConfig = async () => {
    currentConfig ??= await configStore.load();
    return currentConfig;
  };

  app.get("/api/config", async () => loadCurrentConfig());

  app.put("/api/config", async (request, reply) => {
    const parsed = simulatorConfigSchema.safeParse(request.body);

    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    currentConfig = parsed.data;
    await configStore.save(currentConfig);
    return currentConfig;
  });

  app.post("/api/config-file/save", async (request, reply) => {
    const body = request.body as { path?: unknown; config?: unknown };
    const parsed = simulatorConfigSchema.safeParse(body.config);

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
    return { path: filePath, config: currentConfig };
  });

  app.get("/api/status", async () => runtime.getStatus());

  app.post("/api/preview", async (request, reply) => {
    const parsed = simulatorConfigSchema.safeParse(request.body);

    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    return { message: generateMessageSnapshot(parsed.data.messageTemplate, parsed.data.parameters) };
  });

  app.post("/api/start", async () => {
    await runtime.start(await loadCurrentConfig());
    return runtime.getStatus();
  });

  app.post("/api/stop", async () => {
    await runtime.stop();
    return runtime.getStatus();
  });
}
