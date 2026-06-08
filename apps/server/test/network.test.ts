import { describe, expect, it } from "vitest";
import { getLanHost } from "../src/runtime/network.js";

describe("network helpers", () => {
  it("prefers LAN IPv4 addresses over loopback and other addresses", () => {
    expect(
      getLanHost({
        Loopback: [{ address: "127.0.0.1", family: "IPv4", internal: true, cidr: "127.0.0.1/8", mac: "", netmask: "255.0.0.0" }],
        Ethernet: [{ address: "192.168.15.152", family: "IPv4", internal: false, cidr: "192.168.15.152/24", mac: "", netmask: "255.255.255.0" }],
        Virtual: [{ address: "172.20.1.5", family: "IPv4", internal: false, cidr: "172.20.1.5/16", mac: "", netmask: "255.255.0.0" }]
      })
    ).toBe("192.168.15.152");
  });
});
