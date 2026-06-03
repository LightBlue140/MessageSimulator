import { z } from "zod";

const port = z.number().int().min(1).max(65535);
const seconds = z.number().min(0.1);
const parameterName = z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/);

const numberRange = {
  min: z.number(),
  max: z.number()
};

const hasUniqueNames = (values: Array<{ name: string }>) =>
  new Set(values.map((value) => value.name)).size === values.length;

const integerParameterSchema = z.object({
  name: parameterName,
  type: z.literal("integer"),
  enabled: z.boolean(),
  min: z.number().int(),
  max: z.number().int()
});

const floatParameterSchema = z.object({
  name: parameterName,
  type: z.literal("float"),
  enabled: z.boolean(),
  min: z.number(),
  max: z.number(),
  decimals: z.number().int().min(0).max(10)
});

const vectorComponentSchema = z
  .object({
    name: parameterName,
    ...numberRange,
    decimals: z.number().int().min(0).max(10)
  })
  .refine((value) => value.max >= value.min, "max must be greater than or equal to min");

export const parameterSchema = z
  .discriminatedUnion("type", [
    integerParameterSchema,
    floatParameterSchema,
    z.object({
      name: parameterName,
      type: z.literal("string"),
      enabled: z.boolean(),
      candidates: z.array(z.string()).min(1)
    }),
    z.object({
      name: parameterName,
      type: z.literal("boolean"),
      enabled: z.boolean(),
      trueProbability: z.number().min(0).max(1)
    }),
    z.object({
      name: parameterName,
      type: z.literal("vector"),
      enabled: z.boolean(),
      components: z
        .array(vectorComponentSchema)
        .min(1)
        .refine(hasUniqueNames, "component names must be unique")
    })
  ])
  .superRefine((value, ctx) => {
    if ((value.type === "integer" || value.type === "float") && value.max < value.min) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "max must be greater than or equal to min"
      });
    }
  });

export const protocolSchema = z.enum(["http", "mqtt", "websocket", "tcp", "opcua"]);

export const serverSettingsSchema = z.object({
  http: z.object({ port, path: z.string().startsWith("/"), contentType: z.string().min(1) }),
  mqtt: z.object({
    port,
    topic: z.string().min(1),
    qos: z.union([z.literal(0), z.literal(1), z.literal(2)]),
    retain: z.boolean(),
    username: z.string().optional(),
    password: z.string().optional()
  }),
  websocket: z.object({ port, path: z.string().startsWith("/") }),
  tcp: z.object({ port, appendNewline: z.boolean(), encoding: z.enum(["utf8", "ascii"]) }),
  opcua: z.object({
    port,
    endpointPath: z.string().startsWith("/"),
    namespace: z.string().min(1),
    nodeId: z.string().min(1),
    dataType: z.enum(["String", "Double", "Boolean"])
  })
});

export const simulatorConfigSchema = z
  .object({
    protocol: protocolSchema,
    serverSettings: serverSettingsSchema,
    messageTemplate: z.string(),
    parameters: z.array(parameterSchema),
    sendIntervalSeconds: seconds,
    randomizeIntervalSeconds: seconds
  })
  .refine((value) => hasUniqueNames(value.parameters), "parameter names must be unique");

export type SimulatorConfig = z.infer<typeof simulatorConfigSchema>;
export type ParameterConfig = z.infer<typeof parameterSchema>;

export const simulatorServiceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  config: simulatorConfigSchema
});

export const appConfigSchema = z
  .object({
    services: z.array(simulatorServiceSchema).min(1)
  })
  .refine((value) => hasUniqueNames(value.services.map((service) => ({ name: service.id }))), "service ids must be unique");

export type SimulatorService = z.infer<typeof simulatorServiceSchema>;
export type AppConfig = z.infer<typeof appConfigSchema>;

export const defaultConfig: SimulatorConfig = {
  protocol: "http",
  serverSettings: {
    http: { port: 8080, path: "/message", contentType: "application/json" },
    mqtt: { port: 1883, topic: "simulator/message", qos: 0, retain: false },
    websocket: { port: 8081, path: "/ws" },
    tcp: { port: 9000, appendNewline: true, encoding: "utf8" },
    opcua: {
      port: 4840,
      endpointPath: "/simulator",
      namespace: "MessageSimulator",
      nodeId: "s=Message",
      dataType: "String"
    }
  },
  messageTemplate: "{\"aa\":100}",
  parameters: [{ name: "aa", type: "integer", enabled: true, min: 0, max: 999 }],
  sendIntervalSeconds: 1,
  randomizeIntervalSeconds: 5
};

export const defaultAppConfig: AppConfig = {
  services: [{ id: "service-1", name: "服务 1", config: defaultConfig }]
};

const nextServiceId = (services: SimulatorService[]) => {
  let index = services.length + 1;
  const existingIds = new Set(services.map((service) => service.id));

  while (existingIds.has(`service-${index}`)) {
    index += 1;
  }

  return `service-${index}`;
};

const nextMqttTopic = (topic: string, services: SimulatorService[]) => {
  const existingTopics = new Set(
    services
      .filter((service) => service.config.protocol === "mqtt")
      .map((service) => service.config.serverSettings.mqtt.topic)
  );
  let index = 1;
  let candidate = `${topic}-copy-${index}`;

  while (existingTopics.has(candidate)) {
    index += 1;
    candidate = `${topic}-copy-${index}`;
  }

  return candidate;
};

const nextOpcUaNodeId = (nodeId: string, services: SimulatorService[]) => {
  const existingNodeIds = new Set(
    services
      .filter((service) => service.config.protocol === "opcua")
      .map((service) => service.config.serverSettings.opcua.nodeId)
  );
  const baseNodeId = nodeId.startsWith("s=") ? nodeId.slice(2) : nodeId;
  const prefix = nodeId.startsWith("s=") ? "s=" : "";
  let index = 1;
  let candidate = `${prefix}${baseNodeId}-copy-${index}`;

  while (existingNodeIds.has(candidate)) {
    index += 1;
    candidate = `${prefix}${baseNodeId}-copy-${index}`;
  }

  return candidate;
};

export const toAppConfig = (input: unknown): AppConfig => {
  const parsedAppConfig = appConfigSchema.safeParse(input);
  if (parsedAppConfig.success) {
    return parsedAppConfig.data;
  }

  const parsedSimulatorConfig = simulatorConfigSchema.parse(input);
  return appConfigSchema.parse({
    services: [{ id: "service-1", name: "服务 1", config: parsedSimulatorConfig }]
  });
};

export const cloneServiceForCopy = (
  service: SimulatorService,
  existingServices: SimulatorService[]
): SimulatorService => {
  const copy = simulatorServiceSchema.parse({
    id: nextServiceId(existingServices),
    name: `${service.name} 副本`,
    config: structuredClone(service.config)
  });

  if (copy.config.protocol === "mqtt") {
    copy.config.serverSettings.mqtt.topic = nextMqttTopic(
      service.config.serverSettings.mqtt.topic,
      existingServices
    );
  }

  if (copy.config.protocol === "opcua") {
    copy.config.serverSettings.opcua.nodeId = nextOpcUaNodeId(
      service.config.serverSettings.opcua.nodeId,
      existingServices
    );
  }

  return copy;
};
