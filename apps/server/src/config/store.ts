import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { appConfigSchema, defaultAppConfig, toAppConfig, type AppConfig } from "./schema.js";

const cloneDefaultConfig = () => appConfigSchema.parse(structuredClone(defaultAppConfig));

const isMissingFileError = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";

export class ConfigStore {
  constructor(private readonly filePath: string) {}

  async load(): Promise<AppConfig> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      return toAppConfig(JSON.parse(raw));
    } catch (error) {
      if (isMissingFileError(error)) {
        return cloneDefaultConfig();
      }
      throw error;
    }
  }

  async save(config: AppConfig): Promise<void> {
    const parsed = appConfigSchema.parse(config);
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(parsed, null, 2), "utf8");
  }
}
