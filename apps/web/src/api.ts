import type { SimulatorConfig } from "./types";

const baseUrl = "/api";

export async function saveConfig(config: SimulatorConfig) {
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

export async function startSimulator() {
  const response = await fetch(`${baseUrl}/start`, { method: "POST" });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

export async function stopSimulator() {
  const response = await fetch(`${baseUrl}/stop`, { method: "POST" });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}
