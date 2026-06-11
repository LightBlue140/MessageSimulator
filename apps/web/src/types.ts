export type Protocol = "http" | "mqtt" | "websocket" | "tcp" | "opcua";
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ParameterConfig =
  | { name: string; type: "integer"; enabled: boolean; min: number; max: number }
  | { name: string; type: "float"; enabled: boolean; min: number; max: number; decimals: number }
  | { name: string; type: "string"; enabled: boolean; candidates: string[] }
  | { name: string; type: "boolean"; enabled: boolean; trueProbability: number }
  | {
      name: string;
      type: "vector";
      enabled: boolean;
      components: Array<{ name: string; min: number; max: number; decimals: number }>;
    };

export interface SimulatorConfig {
  protocol: Protocol;
  serverSettings: {
    http: { port: number; path: string; method: HttpMethod; contentType: string };
    mqtt: {
      port: number;
      topic: string;
      qos: 0 | 1 | 2;
      retain: boolean;
      username?: string;
      password?: string;
    };
    websocket: { port: number; path: string };
    tcp: { port: number; appendNewline: boolean; encoding: "utf8" | "ascii" };
    opcua: {
      port: number;
      endpointPath: string;
      namespace: string;
      nodeId: string;
      dataType: "String" | "Double" | "Boolean";
    };
  };
  messageTemplate: string;
  parameters: ParameterConfig[];
  sendIntervalSeconds: number;
  randomizeIntervalSeconds: number;
}

export interface SimulatorService {
  id: string;
  name: string;
  config: SimulatorConfig;
}

export interface AppConfig {
  services: SimulatorService[];
}

export interface AdapterStatus {
  connectedClients?: number;
  requestCount?: number;
  listenAddress?: string;
}

export interface ServiceRuntimeStatus {
  id: string;
  name: string;
  running: boolean;
  protocol?: Protocol;
  lastMessage?: string;
  logs: Array<{ id: number; level: "info" | "error"; message: string; timestamp: string }>;
  adapterStatus?: AdapterStatus;
  error?: string;
}

export interface MultiServiceRuntimeStatus {
  services: ServiceRuntimeStatus[];
}

export const defaultConfig: SimulatorConfig = {
  protocol: "http",
  serverSettings: {
    http: { port: 8080, path: "/message", method: "GET", contentType: "application/json" },
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
