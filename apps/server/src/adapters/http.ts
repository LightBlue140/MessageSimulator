import Fastify, { type FastifyInstance } from "fastify";
import type { AddressInfo } from "node:net";
import type { AdapterContext, AdapterStatus, SimulatorAdapter } from "./types.js";

export class HttpAdapter implements SimulatorAdapter {
  private app?: FastifyInstance;
  private requestCount = 0;
  private listenAddress?: string;

  async start(context: AdapterContext): Promise<void> {
    const settings = context.config.serverSettings.http;
    const app = Fastify();

    app.get(settings.path, async (_request, reply) => {
      this.requestCount += 1;
      context.logs.add("info", `HTTP GET ${settings.path}`);
      return reply.type(settings.contentType).send(context.getSnapshot());
    });

    this.app = app;
    this.requestCount = 0;
    this.listenAddress = await app.listen({ host: "127.0.0.1", port: settings.port });
  }

  async stop(): Promise<void> {
    const app = this.app;

    if (app !== undefined) {
      await app.close();
    }

    this.app = undefined;
    this.requestCount = 0;
    this.listenAddress = undefined;
  }

  getStatus(): AdapterStatus {
    return {
      requestCount: this.requestCount,
      listenAddress: this.listenAddress ?? this.addressFromServer()
    };
  }

  private addressFromServer() {
    const address = this.app?.server.address();

    if (address === undefined || address === null || typeof address === "string") {
      return undefined;
    }

    const { address: host, port } = address as AddressInfo;
    return `http://${host}:${port}`;
  }
}
