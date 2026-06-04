import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { WebSocketServer, type WebSocket } from "ws";
import type { AdapterContext, AdapterStatus, SimulatorAdapter } from "./types.js";

export class WebSocketAdapter implements SimulatorAdapter {
  private server?: Server;
  private wss?: WebSocketServer;
  private timer?: ReturnType<typeof setInterval>;
  private readonly clients = new Set<WebSocket>();
  private listenAddress?: string;

  async start(context: AdapterContext): Promise<void> {
    const settings = context.config.serverSettings.websocket;
    this.server = createServer();
    this.wss = new WebSocketServer({ server: this.server, path: settings.path });
    this.wss.on("error", () => undefined);

    this.wss.on("connection", (socket) => {
      this.clients.add(socket);
      context.logs.add("info", "WebSocket client connected");
      socket.on("close", () => {
        this.clients.delete(socket);
        context.logs.add("info", "WebSocket client disconnected");
      });
    });

    await new Promise<void>((resolve, reject) => {
      const server = this.server!;
      const keepHandled = () => undefined;
      const onError = (error: Error) => {
        server.off("error", keepHandled);
        server.off("listening", onListening);
        reject(error);
      };
      const onListening = () => {
        server.off("error", keepHandled);
        server.off("error", onError);
        resolve();
      };
      server.on("error", keepHandled);
      server.once("error", onError);
      server.once("listening", onListening);
      server.listen(settings.port, "0.0.0.0");
    });

    this.listenAddress = this.addressFromServer();
    this.timer = setInterval(() => {
      for (const socket of this.clients) {
        socket.send(context.getSnapshot());
      }
      if (this.clients.size > 0) {
        context.logs.add("info", `WebSocket sent to ${this.clients.size} clients`);
      }
    }, context.config.sendIntervalSeconds * 1000);
  }

  async stop(): Promise<void> {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    for (const socket of this.clients) {
      socket.close();
    }
    this.clients.clear();

    await new Promise<void>((resolve) => {
      if (this.wss === undefined) {
        resolve();
        return;
      }
      if (this.server === undefined || !this.server.listening) {
        this.wss.close();
        resolve();
        return;
      }
      this.wss.close(() => resolve());
    });
    await new Promise<void>((resolve) => {
      if (this.server === undefined || !this.server.listening) {
        resolve();
        return;
      }
      this.server.close(() => resolve());
    });

    this.wss = undefined;
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
    return `ws://${host}:${port}`;
  }
}
