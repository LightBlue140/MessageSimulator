import { describe, expect, it } from "vitest";
import { MqttAdapter } from "../src/adapters/mqtt.js";
import { OpcUaAdapter } from "../src/adapters/opcua.js";

describe("MQTT and OPC UA adapters", () => {
  it("construct with empty status", () => {
    expect(new MqttAdapter().getStatus()).toEqual({ connectedClients: 0 });
    expect(new OpcUaAdapter().getStatus()).toEqual({ connectedClients: 0 });
  });
});
