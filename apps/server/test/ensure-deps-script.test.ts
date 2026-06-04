import { describe, expect, it } from "vitest";
// @ts-expect-error The startup helper is an executable mjs script outside the server package.
import { getInstallReason } from "../../../scripts/ensure-deps.mjs";

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
});
