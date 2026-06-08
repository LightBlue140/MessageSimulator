import { describe, expect, it } from "vitest";
// @ts-expect-error The startup helper is an executable mjs script outside the server package.
import { getInstallCommand, getInstallReason } from "../../../scripts/ensure-deps.mjs";

describe("ensure deps script", () => {
  it("requires install when node_modules is missing", () => {
    expect(
      getInstallReason({
        hasNodeModules: false,
        missingPackages: []
      })
    ).toBe("node_modules is missing");
  });

  it("requires install when critical packages are missing", () => {
    expect(
      getInstallReason({
        hasNodeModules: true,
        missingPackages: ["tsx", "vite"]
      })
    ).toBe("missing packages: tsx, vite");
  });

  it("skips install when dependencies are already present", () => {
    expect(
      getInstallReason({
        hasNodeModules: true,
        missingPackages: []
      })
    ).toBeNull();
  });

  it("runs npm through node on Windows to avoid npm.cmd spawn issues", () => {
    expect(
      getInstallCommand({
        platform: "win32",
        nodePath: "D:\\AI\\MessageSimulator\\.runtime\\node\\node.exe"
      })
    ).toEqual({
      command: "D:\\AI\\MessageSimulator\\.runtime\\node\\node.exe",
      args: [
        "D:\\AI\\MessageSimulator\\.runtime\\node\\node_modules\\npm\\bin\\npm-cli.js",
        "install"
      ]
    });
  });
});
