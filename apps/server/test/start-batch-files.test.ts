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

  it("checks the local Node.js runtime before installing dependencies", () => {
    const startBat = readFileSync(join(rootDir, "start.bat"), "utf8");
    const startServerBat = readFileSync(join(rootDir, "start_server.bat"), "utf8");
    const startWebBat = readFileSync(join(rootDir, "start_web.bat"), "utf8");
    const ensureRuntimeBat = readFileSync(join(rootDir, "scripts", "ensure-runtime.bat"), "utf8");
    const installRuntimePs1 = readFileSync(join(rootDir, "scripts", "install-node-runtime.ps1"), "utf8");

    expect(startBat.indexOf("ensure-runtime.bat")).toBeLessThan(startBat.indexOf("ensure-deps.mjs"));
    expect(startServerBat.indexOf("ensure-runtime.bat")).toBeLessThan(startServerBat.indexOf("ensure-deps.mjs"));
    expect(startWebBat.indexOf("ensure-runtime.bat")).toBeLessThan(startWebBat.indexOf("ensure-deps.mjs"));
    expect(ensureRuntimeBat).toContain("install-node-runtime.ps1");
    expect(installRuntimePs1).toContain(".runtime");
    expect(installRuntimePs1).toContain("nodejs.org/dist");
  });
});
