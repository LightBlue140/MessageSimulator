import type { AppConfig, MultiServiceRuntimeStatus, SimulatorConfig, SimulatorService } from "./types";

const baseUrl = "/api";

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
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json() as Promise<AppConfig>;
}

export async function saveConfig(config: AppConfig) {
  const response = await fetch(`${baseUrl}/config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config)
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

export async function saveConfigFile(config: AppConfig, path: string) {
  const response = await fetch(`${baseUrl}/config-file/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, config })
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json() as Promise<{ path: string; config: AppConfig }>;
}

export async function loadConfigFile(path: string) {
  const response = await fetch(`${baseUrl}/config-file/load`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path })
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json() as Promise<{ path: string; config: AppConfig }>;
}

export async function startService(serviceId: string) {
  const response = await fetch(`${baseUrl}/services/${serviceId}/start`, { method: "POST" });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json() as Promise<MultiServiceRuntimeStatus>;
}

export async function stopService(serviceId: string) {
  const response = await fetch(`${baseUrl}/services/${serviceId}/stop`, { method: "POST" });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json() as Promise<MultiServiceRuntimeStatus>;
}

export async function startAllServices() {
  const response = await fetch(`${baseUrl}/start-all`, { method: "POST" });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

export async function stopAllServices() {
  const response = await fetch(`${baseUrl}/stop-all`, { method: "POST" });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

export async function copyService(serviceId: string) {
  const response = await fetch(`${baseUrl}/services/${serviceId}/copy`, { method: "POST" });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json() as Promise<SimulatorService>;
}

export async function getStatus() {
  const response = await fetch(`${baseUrl}/status`);
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json() as Promise<MultiServiceRuntimeStatus>;
}

export async function previewMessage(config: SimulatorConfig) {
  const response = await fetch(`${baseUrl}/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config)
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json() as Promise<{ message: string }>;
}
