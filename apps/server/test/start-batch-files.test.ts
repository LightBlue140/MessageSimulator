import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const rootDir = join(__dirname, "..", "..", "..");

describe("startup batch files", () => {
  it("starts backend and frontend through dedicated batch files", () => {
    const startBat = readFileSync(join(rootDir, "start.bat"), "utf8");

    expect(startBat).toContain('start "Server" "%ROOT%\\start_server.bat"');
    expect(startBat).toContain('start "Web" "%ROOT%\\start_web.bat"');
    expect(startBat).not.toContain("cmd /k");
  });
});
