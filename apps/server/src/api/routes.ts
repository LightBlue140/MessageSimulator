import type { FastifyInstance, FastifyReply } from "fastify";
import { ZodError } from "zod";
import { HttpAdapter } from "../adapters/http.js";
import { MqttAdapter } from "../adapters/mqtt.js";
import { OpcUaAdapter } from "../adapters/opcua.js";
import { TcpAdapter } from "../adapters/tcp.js";
import { WebSocketAdapter } from "../adapters/websocket.js";
import { simulatorConfigSchema, type SimulatorConfig } from "../config/schema.js";
import { ConfigStore } from "../config/store.js";
import { SimulatorRuntime } from "../runtime/runtime.js";

export interface RegisterRoutesOptions {
  configStore?: ConfigStore;
  runtime?: SimulatorRuntime;
}

const defaultConfigPath = process.env.SIMULATOR_CONFIG_PATH ?? "data/config.json";

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

  app.get("/api/status", async () => runtime.getStatus());

  app.post("/api/start", async () => {
    await runtime.start(await loadCurrentConfig());
    return runtime.getStatus();
  });

  app.post("/api/stop", async () => {
    await runtime.stop();
    return runtime.getStatus();
  });
}
