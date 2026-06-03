import type { Protocol, SimulatorConfig } from "../types";

interface ProtocolSettingsProps {
  config: SimulatorConfig;
  setConfig: (config: SimulatorConfig) => void;
}

export function ProtocolSettings({ config, setConfig }: ProtocolSettingsProps) {
  const mqttCredentialsEnabled =
    config.serverSettings.mqtt.username !== undefined || config.serverSettings.mqtt.password !== undefined;
  const updateSettings = <T extends keyof SimulatorConfig["serverSettings"]>(
    protocol: T,
    settings: SimulatorConfig["serverSettings"][T]
  ) => {
    setConfig({
      ...config,
      serverSettings: { ...config.serverSettings, [protocol]: settings }
    });
  };

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
      {config.protocol === "http" && (
        <>
          <label>
            HTTP 路径
            <input
              value={config.serverSettings.http.path}
              onChange={(event) =>
                updateSettings("http", { ...config.serverSettings.http, path: event.target.value })
              }
            />
          </label>
          <label>
            Content-Type
            <input
              value={config.serverSettings.http.contentType}
              onChange={(event) =>
                updateSettings("http", {
                  ...config.serverSettings.http,
                  contentType: event.target.value
                })
              }
            />
          </label>
        </>
      )}
      {config.protocol === "mqtt" && (
        <>
          <label>
            Topic
            <input
              value={config.serverSettings.mqtt.topic}
              onChange={(event) =>
                updateSettings("mqtt", { ...config.serverSettings.mqtt, topic: event.target.value })
              }
            />
          </label>
          <label>
            QoS
            <select
              value={config.serverSettings.mqtt.qos}
              onChange={(event) =>
                updateSettings("mqtt", {
                  ...config.serverSettings.mqtt,
                  qos: Number(event.target.value) as 0 | 1 | 2
                })
              }
            >
              <option value="0">0</option>
              <option value="1">1</option>
              <option value="2">2</option>
            </select>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={config.serverSettings.mqtt.retain}
              onChange={(event) =>
                updateSettings("mqtt", {
                  ...config.serverSettings.mqtt,
                  retain: event.target.checked
                })
              }
            />
            保留消息
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={mqttCredentialsEnabled}
              onChange={(event) =>
                updateSettings("mqtt", {
                  ...config.serverSettings.mqtt,
                  username: event.target.checked ? (config.serverSettings.mqtt.username ?? "") : undefined,
                  password: event.target.checked ? (config.serverSettings.mqtt.password ?? "") : undefined
                })
              }
            />
            启用用户名和密码
          </label>
          {mqttCredentialsEnabled && (
            <>
              <label>
                用户名
                <input
                  value={config.serverSettings.mqtt.username ?? ""}
                  onChange={(event) =>
                    updateSettings("mqtt", {
                      ...config.serverSettings.mqtt,
                      username: event.target.value
                    })
                  }
                />
              </label>
              <label>
                密码
                <input
                  type="password"
                  value={config.serverSettings.mqtt.password ?? ""}
                  onChange={(event) =>
                    updateSettings("mqtt", {
                      ...config.serverSettings.mqtt,
                      password: event.target.value
                    })
                  }
                />
              </label>
            </>
          )}
        </>
      )}
      {config.protocol === "websocket" && (
        <label>
          WebSocket 路径
          <input
            value={config.serverSettings.websocket.path}
            onChange={(event) =>
              updateSettings("websocket", {
                ...config.serverSettings.websocket,
                path: event.target.value
              })
            }
          />
        </label>
      )}
      {config.protocol === "tcp" && (
        <>
          <label>
            TCP Encoding
            <select
              value={config.serverSettings.tcp.encoding}
              onChange={(event) =>
                updateSettings("tcp", {
                  ...config.serverSettings.tcp,
                  encoding: event.target.value as "utf8" | "ascii"
                })
              }
            >
              <option value="utf8">utf8</option>
              <option value="ascii">ascii</option>
            </select>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={config.serverSettings.tcp.appendNewline}
              onChange={(event) =>
                updateSettings("tcp", {
                  ...config.serverSettings.tcp,
                  appendNewline: event.target.checked
                })
              }
            />
            追加换行
          </label>
        </>
      )}
      {config.protocol === "opcua" && (
        <>
          <label>
            NodeId
            <input
              value={config.serverSettings.opcua.nodeId}
              onChange={(event) =>
                updateSettings("opcua", {
                  ...config.serverSettings.opcua,
                  nodeId: event.target.value
                })
              }
            />
          </label>
          <label>
            数据类型
            <select
              value={config.serverSettings.opcua.dataType}
              onChange={(event) =>
                updateSettings("opcua", {
                  ...config.serverSettings.opcua,
                  dataType: event.target.value as "String" | "Double" | "Boolean"
                })
              }
            >
              <option value="String">String</option>
              <option value="Double">Double</option>
              <option value="Boolean">Boolean</option>
            </select>
          </label>
        </>
      )}
    </section>
  );
}
