import type { AppConfig, MultiServiceRuntimeStatus, SimulatorConfig, SimulatorService } from "./types";

const baseUrl = "/api";

export interface PortConflict {
  port: number;
  pids: string[];
}

export class PortConflictError extends Error {
  constructor(readonly conflicts: PortConflict[]) {
    super("Port is already in use");
  }
}

const throwIfRequestFailed = async (response: Response) => {
  if (response.ok) {
    return;
  }

  const text = await response.text();
  try {
    const body = JSON.parse(text) as { code?: string; conflicts?: PortConflict[]; error?: string };
    if (response.status === 409 && body.code === "PORT_CONFLICT" && Array.isArray(body.conflicts)) {
      throw new PortConflictError(body.conflicts);
    }
    throw new Error(body.error ?? text);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(text);
    }
    throw error;
  }
};

export async function isBackendAvailable() {
  const protocol = window.location.protocol === "https:" ? "https" : "http";
  const host = window.location.hostname || "localhost";
  try {
    const response = await fetch(`${protocol}://${host}:3001/health`);
    return response.ok;
  } catch {
    return false;
  }
}

export async function getConfig() {
  const response = await fetch(`${baseUrl}/config`);
  await throwIfRequestFailed(response);
  return response.json() as Promise<AppConfig>;
}

export async function getNetworkInfo() {
  const response = await fetch(`${baseUrl}/network`);
  await throwIfRequestFailed(response);
  return response.json() as Promise<{ host: string }>;
}

export async function saveConfig(config: AppConfig) {
  const response = await fetch(`${baseUrl}/config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config)
  });
  await throwIfRequestFailed(response);
  return response.json();
}

export async function saveConfigFile(config: AppConfig, path: string) {
  const response = await fetch(`${baseUrl}/config-file/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, config })
  });
  await throwIfRequestFailed(response);
  return response.json() as Promise<{ path: string; config: AppConfig }>;
}

export async function loadConfigFile(path: string) {
  const response = await fetch(`${baseUrl}/config-file/load`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path })
  });
  await throwIfRequestFailed(response);
  return response.json() as Promise<{ path: string; config: AppConfig }>;
}

export async function startService(serviceId: string, options: { forceClearPorts?: boolean } = {}) {
  const response = await fetch(`${baseUrl}/services/${serviceId}/start`, requestOptions(options.forceClearPorts));
  await throwIfRequestFailed(response);
  return response.json() as Promise<MultiServiceRuntimeStatus>;
}

export async function stopService(serviceId: string) {
  const response = await fetch(`${baseUrl}/services/${serviceId}/stop`, { method: "POST" });
  await throwIfRequestFailed(response);
  return response.json() as Promise<MultiServiceRuntimeStatus>;
}

export async function startAllServices(options: { forceClearPorts?: boolean } = {}) {
  const response = await fetch(`${baseUrl}/start-all`, requestOptions(options.forceClearPorts));
  await throwIfRequestFailed(response);
  return response.json();
}

export async function stopAllServices() {
  const response = await fetch(`${baseUrl}/stop-all`, { method: "POST" });
  await throwIfRequestFailed(response);
  return response.json();
}

export async function copyService(serviceId: string) {
  const response = await fetch(`${baseUrl}/services/${serviceId}/copy`, { method: "POST" });
  await throwIfRequestFailed(response);
  return response.json() as Promise<SimulatorService>;
}

export async function deleteService(serviceId: string) {
  const response = await fetch(`${baseUrl}/services/${serviceId}`, { method: "DELETE" });
  await throwIfRequestFailed(response);
  return response.json() as Promise<{ id: string; ok: boolean }>;
}

export async function getStatus() {
  const response = await fetch(`${baseUrl}/status`);
  await throwIfRequestFailed(response);
  return response.json() as Promise<MultiServiceRuntimeStatus>;
}

export async function previewMessage(config: SimulatorConfig) {
  const response = await fetch(`${baseUrl}/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config)
  });
  await throwIfRequestFailed(response);
  return response.json() as Promise<{ message: string }>;
}

function requestOptions(forceClearPorts?: boolean): RequestInit {
  if (forceClearPorts !== true) {
    return { method: "POST" };
  }

  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ forceClearPorts: true })
  };
}
