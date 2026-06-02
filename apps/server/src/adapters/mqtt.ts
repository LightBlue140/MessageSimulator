import { createServer, type AddressInfo, type Server } from "node:net";
import aedes from "aedes";
const { createBroker } = aedes;
import type { AdapterContext, AdapterStatus, SimulatorAdapter } from "./types.js";

export class MqttAdapter implements SimulatorAdapter {
  private broker?: ReturnType<typeof createBroker>;
  private server?: Server;
  private timer?: ReturnType<typeof setInterval>;
  private connectedClients = 0;
  private listenAddress?: string;

  async start(context: AdapterContext): Promise<void> {
    const settings = context.config.serverSettings.mqtt;
    this.broker = createBroker();
    this.broker.authenticate = (_client, username, password, done) => {
      if (!settings.username && !settings.password) {
        done(null, true);
        return;
      }

      const passwordText = password?.toString();
      done(null, username === settings.username && passwordText === settings.password);
    };
    this.broker.on("client", () => {
      this.connectedClients += 1;
      context.logs.add("info", "MQTT client connected");
    });
    this.broker.on("clientDisconnect", () => {
      this.connectedClients = Math.max(0, this.connectedClients - 1);
      context.logs.add("info", "MQTT client disconnected");
    });

    this.server = createServer(this.broker.handle);
    await new Promise<void>((resolve) => {
      this.server!.listen(settings.port, "127.0.0.1", resolve);
    });
    this.listenAddress = this.addressFromServer();

    this.timer = setInterval(() => {
      this.broker?.publish(
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

    await new Promise<void>((resolve) => {
      this.server?.close(() => resolve()) ?? resolve();
    });
    await new Promise<void>((resolve) => {
      this.broker?.close(() => resolve()) ?? resolve();
    });

    this.server = undefined;
    this.broker = undefined;
    this.connectedClients = 0;
    this.listenAddress = undefined;
  }

  getStatus(): AdapterStatus {
    return { connectedClients: this.connectedClients, listenAddress: this.listenAddress };
  }

  private addressFromServer() {
    const address = this.server?.address();
    if (address === undefined || address === null || typeof address === "string") {
      return undefined;
    }
    const { address: host, port } = address as AddressInfo;
    return `mqtt://${host}:${port}`;
  }
}
