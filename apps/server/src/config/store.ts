import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { defaultConfig, simulatorConfigSchema, type SimulatorConfig } from "./schema.js";

export class ConfigStore {
  constructor(private readonly filePath: string) {}

  async load(): Promise<SimulatorConfig> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      return simulatorConfigSchema.parse(JSON.parse(raw));
    } catch (error) {
      return defaultConfig;
    }
  }

  async save(config: SimulatorConfig): Promise<void> {
    const parsed = simulatorConfigSchema.parse(config);
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(parsed, null, 2), "utf8");
  }
}
