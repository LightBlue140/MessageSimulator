import { DataType, OPCUAServer, Variant } from "node-opcua";
import type { AdapterContext, AdapterStatus, SimulatorAdapter } from "./types.js";

const toDataType = (value: string) => {
  switch (value) {
    case "Double":
      return DataType.Double;
    case "Boolean":
      return DataType.Boolean;
    default:
      return DataType.String;
  }
};

const coerceSnapshot = (snapshot: string, dataType: string): string | number | boolean => {
  if (dataType === "Double") {
    const parsed = JSON.parse(snapshot) as unknown;
    return typeof parsed === "number" ? parsed : Number(parsed);
  }

  if (dataType === "Boolean") {
    const parsed = JSON.parse(snapshot) as unknown;
    return Boolean(parsed);
  }

  return snapshot;
};

export class OpcUaAdapter implements SimulatorAdapter {
  private server?: OPCUAServer;
  private timer?: ReturnType<typeof setInterval>;

  async start(context: AdapterContext): Promise<void> {
    const settings = context.config.serverSettings.opcua;
    this.server = new OPCUAServer({
      port: settings.port,
      resourcePath: settings.endpointPath,
      buildInfo: {
        productName: "MessageSimulator",
        buildNumber: "1",
        buildDate: new Date()
      }
    });

    await this.server.initialize();
    const addressSpace = this.server.engine.addressSpace;
    if (addressSpace === null) {
      throw new Error("OPC UA address space was not initialized");
    }

    const namespace = addressSpace.registerNamespace(settings.namespace);
    const folder = namespace.addFolder(addressSpace.rootFolder.objects, {
      browseName: "MessageSimulator"
    });
    let currentValue = coerceSnapshot(context.getSnapshot(), settings.dataType);

    namespace.addVariable({
      componentOf: folder,
      browseName: "Message",
      nodeId: settings.nodeId,
      dataType: settings.dataType,
      value: {
        get: () => new Variant({ dataType: toDataType(settings.dataType), value: currentValue })
      }
    });

    await this.server.start();
    this.timer = setInterval(() => {
      currentValue = coerceSnapshot(context.getSnapshot(), settings.dataType);
      context.logs.add("info", `OPC UA updated ${settings.nodeId}`);
    }, context.config.randomizeIntervalSeconds * 1000);
  }

  async stop(): Promise<void> {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    await this.server?.shutdown(100);
    this.server = undefined;
  }

  getStatus(): AdapterStatus {
    return { connectedClients: 0 };
  }
}
