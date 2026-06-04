import { connect as connectTcp } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import WebSocket from "ws";
import { TcpAdapter } from "../src/adapters/tcp.js";
import type { AdapterContext } from "../src/adapters/types.js";
import { WebSocketAdapter } from "../src/adapters/websocket.js";
import { defaultConfig } from "../src/config/schema.js";
import { RecentLogs } from "../src/runtime/logs.js";

const contextFor = (protocol: "tcp" | "websocket", port: number): AdapterContext => ({
  config: {
    ...defaultConfig,
    protocol,
    sendIntervalSeconds: 0.05,
    serverSettings: {
      ...defaultConfig.serverSettings,
      tcp: { ...defaultConfig.serverSettings.tcp, port, appendNewline: true },
      websocket: { ...defaultConfig.serverSettings.websocket, port, path: "/ws" }
    }
  },
  getSnapshot: () => "snapshot",
  logs: new RecentLogs()
});

describe("socket adapters", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("constructs TCP and WebSocket adapters with empty client status", () => {
    expect(new TcpAdapter().getStatus()).toEqual({ connectedClients: 0 });
    expect(new WebSocketAdapter().getStatus()).toEqual({ connectedClients: 0 });
  });

  it("sends snapshots to connected WebSocket clients", async () => {
    const adapter = new WebSocketAdapter();
    await adapter.start(contextFor("websocket", 0));
    const address = adapter.getStatus().listenAddress;
    const clientAddress = address?.replace("0.0.0.0", "127.0.0.1");

    try {
      const message = await new Promise<string>((resolve, reject) => {
        const socket = new WebSocket(`${clientAddress}/ws`);
        socket.on("message", (data) => {
          socket.close();
          resolve(data.toString());
        });
        socket.on("error", reject);
      });

      expect(message).toBe("snapshot");
      expect(address).toMatch(/^ws:\/\/0\.0\.0\.0:\d+$/);
      expect(adapter.getStatus().connectedClients).toBe(1);
    } finally {
      await adapter.stop();
    }
    expect(adapter.getStatus().connectedClients).toBe(0);
  });

  it("sends snapshots to connected TCP clients", async () => {
    const adapter = new TcpAdapter();
    await adapter.start(contextFor("tcp", 0));
    const address = adapter.getStatus().listenAddress;
    const port = Number(address?.split(":").pop());

    try {
      const message = await new Promise<string>((resolve, reject) => {
        const socket = connectTcp(port, "127.0.0.1");
        socket.once("data", (data) => {
          socket.destroy();
          resolve(data.toString("utf8"));
        });
        socket.on("error", reject);
      });

      expect(message).toBe("snapshot\n");
      expect(adapter.getStatus().connectedClients).toBe(1);
    } finally {
      await adapter.stop();
    }
    expect(adapter.getStatus().connectedClients).toBe(0);
  });

  it("rejects duplicate socket ports without leaving unhandled listen errors", async () => {
    const tcpFirst = new TcpAdapter();
    const tcpSecond = new TcpAdapter();
    const wsFirst = new WebSocketAdapter();
    const wsSecond = new WebSocketAdapter();

    await tcpFirst.start(contextFor("tcp", 0));
    await wsFirst.start(contextFor("websocket", 0));
    const tcpPort = Number(tcpFirst.getStatus().listenAddress?.split(":").pop());
    const wsPort = Number(wsFirst.getStatus().listenAddress?.split(":").pop());

    try {
      await expect(tcpSecond.start(contextFor("tcp", tcpPort))).rejects.toThrow(/EADDRINUSE/);
      await expect(wsSecond.start(contextFor("websocket", wsPort))).rejects.toThrow(/EADDRINUSE/);
    } finally {
      await tcpSecond.stop();
      await wsSecond.stop();
      await tcpFirst.stop();
      await wsFirst.stop();
    }
  });
});
