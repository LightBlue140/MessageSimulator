import type { AdapterStatus, SimulatorConfig } from "../types";

const browserHost = () => globalThis.location?.hostname || "localhost";
const localUrl = (host: string, scheme: string, port: number, path = "") => `${scheme}://${host}:${port}${path}`;
const displayAddress = (host: string, address: string | undefined) =>
  address?.replace("://0.0.0.0:", `://${host}:`);

export function ConnectionInfo({
  config,
  adapterStatus,
  compact = false,
  host = browserHost()
}: {
  config: SimulatorConfig;
  adapterStatus?: AdapterStatus;
  compact?: boolean;
  host?: string;
}) {
  const actual = displayAddress(host, adapterStatus?.listenAddress);
  const mqtt = config.serverSettings.mqtt;
  const sectionClassName = compact ? "connection-panel compact-connection" : "panel connection-panel";

  return (
    <section className={sectionClassName}>
      {!compact && (
        <div className="section-title">
          <span className="eyebrow">Connection</span>
          <h2>连接方式</h2>
        </div>
      )}

      {config.protocol === "http" && (
        <dl className="connection-grid">
          <dt>方法</dt>
          <dd><code>{config.serverSettings.http.method}</code></dd>
          <dt>URL</dt>
          <dd><code>{actual ? `${actual}${config.serverSettings.http.path}` : localUrl(host, "http", config.serverSettings.http.port, config.serverSettings.http.path)}</code></dd>
          <dt>Content-Type</dt>
          <dd>{config.serverSettings.http.contentType}</dd>
        </dl>
      )}

      {config.protocol === "mqtt" && (
        <dl className="connection-grid">
          <dt>MQTT Broker</dt>
          <dd><code>{actual ?? localUrl(host, "mqtt", mqtt.port)}</code></dd>
          <dt>订阅 Topic</dt>
          <dd><code>{mqtt.topic}</code></dd>
          <dt>QoS</dt>
          <dd>QoS {mqtt.qos}</dd>
          <dt>认证</dt>
          <dd>{mqtt.username ? `${mqtt.username} / ${mqtt.password ? "密码已设置" : "无密码"}` : "未启用账号密码"}</dd>
        </dl>
      )}

      {config.protocol === "websocket" && (
        <dl className="connection-grid">
          <dt>WebSocket URL</dt>
          <dd><code>{actual ? `${actual}${config.serverSettings.websocket.path}` : localUrl(host, "ws", config.serverSettings.websocket.port, config.serverSettings.websocket.path)}</code></dd>
        </dl>
      )}

      {config.protocol === "tcp" && (
        <dl className="connection-grid">
          <dt>TCP 地址</dt>
          <dd><code>{actual ?? localUrl(host, "tcp", config.serverSettings.tcp.port)}</code></dd>
          <dt>编码</dt>
          <dd>{config.serverSettings.tcp.encoding}</dd>
          <dt>换行</dt>
          <dd>{config.serverSettings.tcp.appendNewline ? "发送后追加换行" : "不追加换行"}</dd>
        </dl>
      )}

      {config.protocol === "opcua" && (
        <dl className="connection-grid">
          <dt>Endpoint</dt>
          <dd><code>{actual ?? localUrl(host, "opc.tcp", config.serverSettings.opcua.port, config.serverSettings.opcua.endpointPath)}</code></dd>
          <dt>NodeId</dt>
          <dd><code>{config.serverSettings.opcua.nodeId}</code></dd>
          <dt>数据类型</dt>
          <dd>{config.serverSettings.opcua.dataType}</dd>
        </dl>
      )}
    </section>
  );
}
