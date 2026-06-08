import { networkInterfaces, type NetworkInterfaceInfo } from "node:os";

const privateIpv4Rank = (address: string) => {
  if (address.startsWith("192.168.")) {
    return 1;
  }
  if (address.startsWith("10.")) {
    return 2;
  }

  const match = /^172\.(\d+)\./.exec(address);
  if (match !== null) {
    const second = Number(match[1]);
    if (second >= 16 && second <= 31) {
      return 3;
    }
  }

  return 10;
};

export function getLanHost(interfaces = networkInterfaces()) {
  const candidates: NetworkInterfaceInfo[] = [];

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) {
        candidates.push(entry);
      }
    }
  }

  candidates.sort((left, right) => privateIpv4Rank(left.address) - privateIpv4Rank(right.address));
  return candidates[0]?.address ?? "localhost";
}
