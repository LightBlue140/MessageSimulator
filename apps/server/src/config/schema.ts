import { z } from "zod";

const port = z.number().int().min(1).max(65535);
const seconds = z.number().min(0.1);
const parameterName = z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/);

const numberRange = {
  min: z.number(),
  max: z.number()
};

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
      components: z.array(vectorComponentSchema).min(1)
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
    retain: z.boolean()
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

export const simulatorConfigSchema = z.object({
  protocol: protocolSchema,
  serverSettings: serverSettingsSchema,
  messageTemplate: z.string(),
  parameters: z.array(parameterSchema),
  sendIntervalSeconds: seconds,
  randomizeIntervalSeconds: seconds
});

export type SimulatorConfig = z.infer<typeof simulatorConfigSchema>;
export type ParameterConfig = z.infer<typeof parameterSchema>;

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
