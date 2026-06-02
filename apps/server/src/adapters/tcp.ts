import { createServer, type Server, type Socket } from "node:net";
import type { AddressInfo } from "node:net";
import type { AdapterContext, AdapterStatus, SimulatorAdapter } from "./types.js";

export class TcpAdapter implements SimulatorAdapter {
  private server?: Server;
  private timer?: ReturnType<typeof setInterval>;
  private readonly clients = new Set<Socket>();
  private listenAddress?: string;

  async start(context: AdapterContext): Promise<void> {
    const settings = context.config.serverSettings.tcp;
    this.server = createServer((socket) => {
      this.clients.add(socket);
      context.logs.add("info", "TCP client connected");
      socket.on("close", () => {
        this.clients.delete(socket);
        context.logs.add("info", "TCP client disconnected");
      });
    });

    await new Promise<void>((resolve) => {
      this.server!.listen(settings.port, "0.0.0.0", resolve);
    });

    this.listenAddress = this.addressFromServer();
    this.timer = setInterval(() => {
      const payload = context.getSnapshot() + (settings.appendNewline ? "\n" : "");
      for (const socket of this.clients) {
        socket.write(payload, settings.encoding);
      }
      if (this.clients.size > 0) {
        context.logs.add("info", `TCP sent to ${this.clients.size} clients`);
      }
    }, context.config.sendIntervalSeconds * 1000);
  }

  async stop(): Promise<void> {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    for (const socket of this.clients) {
      socket.destroy();
    }
    this.clients.clear();

    await new Promise<void>((resolve) => {
      this.server?.close(() => resolve()) ?? resolve();
    });

    this.server = undefined;
    this.listenAddress = undefined;
  }

  getStatus(): AdapterStatus {
    return {
      connectedClients: this.clients.size,
      listenAddress: this.listenAddress ?? this.addressFromServer()
    };
  }

  private addressFromServer() {
    const address = this.server?.address();
    if (address === undefined || address === null || typeof address === "string") {
      return undefined;
    }
    const { address: host, port } = address as AddressInfo;
    return `tcp://${host}:${port}`;
  }
}
