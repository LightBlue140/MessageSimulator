export type Protocol = "http" | "mqtt" | "websocket" | "tcp" | "opcua";

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
    http: { port: number; path: string; contentType: string };
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

export interface AdapterStatus {
  connectedClients?: number;
  requestCount?: number;
  listenAddress?: string;
}

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
