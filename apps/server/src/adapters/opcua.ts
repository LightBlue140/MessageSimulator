import { DataType, OPCUAServer, Variant } from "node-opcua";
import { OPCUACertificateManager } from "node-opcua-certificate-manager";
import { join } from "node:path";
import type { AdapterContext, AdapterStatus, SimulatorAdapter } from "./types.js";

interface OpcUaValueState {
  dataType: string;
  value: string | number | boolean;
}

interface SharedOpcUaServer {
  endpointPath: string;
  nodeIds: Set<string>;
  namespaces: Map<string, { folder: any; namespace: any }>;
  refs: number;
  server: OPCUAServer;
  values: Map<string, OpcUaValueState>;
}

const servers = new Map<string, SharedOpcUaServer>();

const serverKeyFor = (port: number, endpointPath: string) => `${port}:${endpointPath}`;

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
  private shared?: SharedOpcUaServer;
  private timer?: ReturnType<typeof setInterval>;
  private key?: string;
  private nodeId?: string;
  private listenAddress?: string;

  async start(context: AdapterContext): Promise<void> {
    const settings = context.config.serverSettings.opcua;
    const key = serverKeyFor(settings.port, settings.endpointPath);
    const shared = await this.getSharedServer(context);
    shared.refs += 1;
    this.shared = shared;
    this.key = key;
    this.nodeId = settings.nodeId;
    this.listenAddress = `opc.tcp://0.0.0.0:${settings.port}${settings.endpointPath}`;

    const currentValue = coerceSnapshot(context.getSnapshot(), settings.dataType);
    shared.values.set(settings.nodeId, { dataType: settings.dataType, value: currentValue });
    this.ensureVariable(context, shared);

    this.timer = setInterval(() => {
      shared.values.set(settings.nodeId, {
        dataType: settings.dataType,
        value: coerceSnapshot(context.getSnapshot(), settings.dataType)
      });
      context.logs.add("info", `OPC UA updated ${settings.nodeId}`);
    }, context.config.randomizeIntervalSeconds * 1000);
  }

  async stop(): Promise<void> {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    const shared = this.shared;
    const key = this.key;
    if (shared === undefined || key === undefined) {
      return;
    }

    shared.refs -= 1;

    if (shared.refs <= 0) {
      await shared.server.shutdown(100);
      servers.delete(key);
    }

    this.shared = undefined;
    this.key = undefined;
    this.nodeId = undefined;
    this.listenAddress = undefined;
  }

  getStatus(): AdapterStatus {
    return { connectedClients: 0, listenAddress: this.listenAddress };
  }

  private async getSharedServer(context: AdapterContext) {
    const settings = context.config.serverSettings.opcua;
    const key = serverKeyFor(settings.port, settings.endpointPath);
    const existing = servers.get(key);
    if (existing !== undefined) {
      return existing;
    }

    const server = new OPCUAServer({
      port: settings.port,
      resourcePath: settings.endpointPath,
      serverCertificateManager: new OPCUACertificateManager({
        rootFolder: join(process.cwd(), ".opcua-pki", "server")
      }),
      userCertificateManager: new OPCUACertificateManager({
        rootFolder: join(process.cwd(), ".opcua-pki", "user")
      }),
      buildInfo: {
        productName: "MessageSimulator",
        buildNumber: "1",
        buildDate: new Date()
      }
    });

    await server.initialize();
    await server.start();

    const shared: SharedOpcUaServer = {
      endpointPath: settings.endpointPath,
      nodeIds: new Set(),
      namespaces: new Map(),
      refs: 0,
      server,
      values: new Map()
    };
    servers.set(key, shared);

    return shared;
  }

  private ensureVariable(context: AdapterContext, shared: SharedOpcUaServer) {
    const settings = context.config.serverSettings.opcua;
    if (shared.nodeIds.has(settings.nodeId)) {
      return;
    }

    const addressSpace = shared.server.engine.addressSpace;
    if (addressSpace === null) {
      throw new Error("OPC UA address space was not initialized");
    }

    let namespaceInfo = shared.namespaces.get(settings.namespace);
    if (namespaceInfo === undefined) {
      const namespace = addressSpace.registerNamespace(settings.namespace);
      const folder = namespace.addFolder(addressSpace.rootFolder.objects, {
        browseName: "MessageSimulator"
      });
      namespaceInfo = { folder, namespace };
      shared.namespaces.set(settings.namespace, namespaceInfo);
    }

    namespaceInfo.namespace.addVariable({
      componentOf: namespaceInfo.folder,
      browseName: settings.nodeId.replace(/^s=/, ""),
      nodeId: settings.nodeId,
      dataType: settings.dataType,
      minimumSamplingInterval: 1000,
      value: {
        get: () => {
          const state = shared.values.get(settings.nodeId);
          return new Variant({
            dataType: toDataType(state?.dataType ?? settings.dataType),
            value: state?.value ?? ""
          });
        }
      }
    });
    shared.nodeIds.add(settings.nodeId);
  }
}
