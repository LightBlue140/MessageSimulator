import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { defaultConfig, simulatorConfigSchema, type SimulatorConfig } from "./schema.js";

const cloneDefaultConfig = () => simulatorConfigSchema.parse(structuredClone(defaultConfig));

const isMissingFileError = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";

export class ConfigStore {
  constructor(private readonly filePath: string) {}

  async load(): Promise<SimulatorConfig> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      return simulatorConfigSchema.parse(JSON.parse(raw));
    } catch (error) {
      if (isMissingFileError(error)) {
        return cloneDefaultConfig();
      }
      throw error;
    }
  }

  async save(config: SimulatorConfig): Promise<void> {
    const parsed = simulatorConfigSchema.parse(config);
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(parsed, null, 2), "utf8");
  }
}
