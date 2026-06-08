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

export function getInstallCommand({
  platform = process.platform,
  nodePath = process.execPath
} = {}) {
  if (platform === "win32") {
    return {
      command: nodePath,
      args: [join(dirname(nodePath), "node_modules", "npm", "bin", "npm-cli.js"), "install"]
    };
  }

  return { command: "npm", args: ["install"] };
}

function runInstall() {
  const { command, args } = getInstallCommand();
  const child = spawn(command, args, {
    cwd: rootDir,
    env: process.env,
    stdio: "inherit"
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
