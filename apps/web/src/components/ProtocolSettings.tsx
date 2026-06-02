import type { Protocol, SimulatorConfig } from "../types";

interface ProtocolSettingsProps {
  config: SimulatorConfig;
  setConfig: (config: SimulatorConfig) => void;
}

export function ProtocolSettings({ config, setConfig }: ProtocolSettingsProps) {
  return (
    <section>
      <label>
        协议
        <select
          value={config.protocol}
          onChange={(event) =>
            setConfig({ ...config, protocol: event.target.value as Protocol })
          }
        >
          <option value="http">HTTP</option>
          <option value="mqtt">MQTT</option>
          <option value="websocket">WebSocket</option>
          <option value="tcp">TCP</option>
          <option value="opcua">OPC UA</option>
        </select>
      </label>
      <p>当前协议：{config.protocol}</p>
    </section>
  );
}
