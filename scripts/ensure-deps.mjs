import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const requireFromRoot = createRequire(join(rootDir, "package.json"));
const criticalPackages = ["tsx", "vite", "fastify", "react", "ws", "node-opcua"];

export function getInstallReason({ hasNodeModules, missingPackages }) {
  if (!hasNodeModules) {
    return "node_modules is missing";
  }

  if (missingPackages.length > 0) {
    return `missing packages: ${missingPackages.join(", ")}`;
  }

  return null;
}

function findMissingPackages() {
  return criticalPackages.filter((packageName) => {
    try {
      requireFromRoot.resolve(packageName);
      return false;
    } catch {
      return true;
    }
  });
}

function runInstall() {
  const command = process.platform === "win32" ? "npm.cmd" : "npm";
  const child = spawn(command, ["install"], {
    cwd: rootDir,
    stdio: "inherit",
    windowsHide: true
  });

  return new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`npm install failed with exit code ${code ?? "unknown"}`));
    });
  });
}

export async function ensureDependencies() {
  const reason = getInstallReason({
    hasNodeModules: existsSync(join(rootDir, "node_modules")),
    missingPackages: findMissingPackages()
  });

  if (reason === null) {
    console.log("Dependencies are ready.");
    return;
  }

  console.log(`Dependencies need installation: ${reason}`);
  console.log("Running npm install...");
  await runInstall();
  console.log("Dependencies installed.");
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  ensureDependencies().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
