import { createServer, type AddressInfo, type Server } from "node:net";
import aedes from "aedes";
const { createBroker } = aedes;
import type { AdapterContext, AdapterStatus, SimulatorAdapter } from "./types.js";
import type { RecentLogs } from "../runtime/logs.js";

interface SharedBroker {
  broker: ReturnType<typeof createBroker>;
  connectedClients: number;
  logs: Set<RecentLogs>;
  refs: number;
  server: Server;
}

const brokers = new Map<number, SharedBroker>();

const resolveAfter = (milliseconds: number, action: (done: () => void) => void) =>
  new Promise<void>((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      resolve();
    };
    const timeout = setTimeout(done, milliseconds);

    try {
      action(done);
    } catch {
      done();
    }
  });

const closeSharedBroker = async (shared: SharedBroker) => {
  await resolveAfter(2500, (done) => {
    shared.server.close(done);
  });
  await resolveAfter(2500, (done) => {
    shared.broker.close(done);
  });
};

export class MqttAdapter implements SimulatorAdapter {
  private shared?: SharedBroker;
  private timer?: ReturnType<typeof setInterval>;
  private logs?: RecentLogs;
  private listenAddress?: string;
  private port?: number;

  async start(context: AdapterContext): Promise<void> {
    const settings = context.config.serverSettings.mqtt;
    this.port = settings.port;
    this.shared = await this.getSharedBroker(context);
    this.shared.refs += 1;
    this.shared.logs.add(context.logs);
    this.logs = context.logs;
    this.listenAddress = this.addressFromServer();

    this.timer = setInterval(() => {
      this.shared?.broker.publish(
        {
          cmd: "publish",
          dup: false,
          topic: settings.topic,
          payload: Buffer.from(context.getSnapshot()),
          qos: settings.qos,
          retain: settings.retain
        },
        () => undefined
      );
      context.logs.add("info", `MQTT published ${settings.topic}`);
    }, context.config.sendIntervalSeconds * 1000);
  }

  async stop(): Promise<void> {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    const shared = this.shared;
    const port = this.port;

    if (shared === undefined || port === undefined) {
      return;
    }

    if (this.logs !== undefined) {
      shared.logs.delete(this.logs);
      this.logs = undefined;
    }

    shared.refs = Math.max(0, shared.refs - 1);

    try {
      if (shared.refs <= 0) {
        await closeSharedBroker(shared);
        brokers.delete(port);
      }
    } finally {
      this.shared = undefined;
      this.port = undefined;
      this.listenAddress = undefined;
      this.logs = undefined;
    }
  }

  getStatus(): AdapterStatus {
    return { connectedClients: this.shared?.connectedClients ?? 0, listenAddress: this.listenAddress };
  }

  private async getSharedBroker(context: AdapterContext) {
    const settings = context.config.serverSettings.mqtt;
    const existing = brokers.get(settings.port);
    if (existing !== undefined) {
      return existing;
    }

    const broker = createBroker();
    const server = createServer(broker.handle);
    const shared: SharedBroker = { broker, connectedClients: 0, logs: new Set(), refs: 0, server };

    broker.authenticate = (_client, username, password, done) => {
      if (!settings.username && !settings.password) {
        done(null, true);
        return;
      }

      const passwordText = password?.toString();
      done(null, username === settings.username && passwordText === settings.password);
    };
    broker.on("client", () => {
      shared.connectedClients += 1;
      for (const logs of shared.logs) {
        logs.add("info", "MQTT client connected");
      }
    });
    broker.on("clientDisconnect", () => {
      shared.connectedClients = Math.max(0, shared.connectedClients - 1);
      for (const logs of shared.logs) {
        logs.add("info", "MQTT client disconnected");
      }
    });

    await new Promise<void>((resolve) => {
      server.listen(settings.port, "0.0.0.0", resolve);
    });

    brokers.set(settings.port, shared);

    return shared;
  }

  private addressFromServer() {
    const address = this.shared?.server.address();
    if (address === undefined || address === null || typeof address === "string") {
      return undefined;
    }
    const { address: host, port } = address as AddressInfo;
    return `mqtt://${host}:${port}`;
  }
}
