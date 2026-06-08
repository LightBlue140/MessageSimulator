import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { SimulatorConfig, SimulatorService } from "../config/schema.js";

const execFileAsync = promisify(execFile);
const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export interface PortConflict {
  port: number;
  pids: string[];
}

export interface PortManager {
  findConflicts: (ports: number[]) => Promise<PortConflict[]>;
  clearConflicts: (conflicts: PortConflict[]) => Promise<void>;
}

export const listenPortForConfig = (config: SimulatorConfig) => {
  switch (config.protocol) {
    case "http":
      return config.serverSettings.http.port;
    case "websocket":
      return config.serverSettings.websocket.port;
    case "tcp":
      return config.serverSettings.tcp.port;
    case "mqtt":
      return config.serverSettings.mqtt.port;
    case "opcua":
      return config.serverSettings.opcua.port;
  }
};

export const listenPortsForServices = (services: SimulatorService[]) => [
  ...new Set(services.map((service) => listenPortForConfig(service.config)))
];

export function findPortConflictsFromNetstat(
  netstatOutput: string,
  ports: number[],
  ownPid = process.pid
): PortConflict[] {
  const wantedPorts = new Set(ports.map((port) => String(port)));
  const portPids = new Map<string, Set<string>>();

  for (const line of netstatOutput.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 5 || parts[0] !== "TCP" || parts[3] !== "LISTENING") {
      continue;
    }

    const localAddress = parts[1];
    const port = localAddress.slice(localAddress.lastIndexOf(":") + 1);
    const pid = parts[4];
    if (wantedPorts.has(port) && pid !== String(ownPid)) {
      const pids = portPids.get(port) ?? new Set<string>();
      pids.add(pid);
      portPids.set(port, pids);
    }
  }

  return [...portPids.entries()]
    .map(([port, pids]) => ({ port: Number(port), pids: [...pids].sort() }))
    .sort((left, right) => left.port - right.port);
}

export class WindowsPortManager implements PortManager {
  async findConflicts(ports: number[]): Promise<PortConflict[]> {
    if (ports.length === 0 || process.platform !== "win32") {
      return [];
    }

    const { stdout } = await execFileAsync("netstat", ["-ano", "-p", "tcp"], {
      windowsHide: true
    });
    return findPortConflictsFromNetstat(stdout, ports);
  }

  async clearConflicts(conflicts: PortConflict[]): Promise<void> {
    if (process.platform !== "win32") {
      return;
    }

    const pids = new Set(conflicts.flatMap((conflict) => conflict.pids));
    for (const pid of pids) {
      if (pid === String(process.pid)) {
        continue;
      }

      try {
        process.kill(Number(pid));
        await wait(300);
      } catch {
        await execFileAsync("taskkill", ["/PID", pid, "/T", "/F"], { windowsHide: true });
      }
    }
  }
}
