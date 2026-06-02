import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export function findPidsForPorts(netstatOutput, ports) {
  const wantedPorts = new Set(ports.map((port) => String(port)));
  const pids = new Set();

  for (const line of netstatOutput.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 5 || parts[0] !== "TCP" || parts[3] !== "LISTENING") {
      continue;
    }

    const localAddress = parts[1];
    const port = localAddress.slice(localAddress.lastIndexOf(":") + 1);
    if (wantedPorts.has(port)) {
      pids.add(parts[4]);
    }
  }

  return pids;
}

async function clearPorts(ports) {
  if (ports.length === 0) {
    console.log("No ports provided.");
    return;
  }

  if (process.platform !== "win32") {
    console.log("Port cleanup is only enabled on Windows. Skipping.");
    return;
  }

  const { stdout } = await execFileAsync("netstat", ["-ano", "-p", "tcp"], {
    windowsHide: true
  });
  const pids = findPidsForPorts(stdout, ports);

  if (pids.size === 0) {
    console.log(`Ports are free: ${ports.join(", ")}`);
    return;
  }

  for (const pid of pids) {
    console.log(`Killing process ${pid} using requested port.`);
    try {
      process.kill(Number(pid));
      await wait(300);
    } catch {
      await execFileAsync("taskkill", ["/PID", pid, "/F"], { windowsHide: true });
    }
  }
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  const ports = process.argv.slice(2).map((value) => Number(value)).filter(Number.isInteger);
  clearPorts(ports).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
