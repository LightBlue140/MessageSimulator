import { useEffect, useState } from "react";
import { getConfig, previewMessage, saveConfig, startSimulator, stopSimulator } from "./api";
import { ConnectionInfo } from "./components/ConnectionInfo";
import { LogViewer, type UiLogEntry } from "./components/LogViewer";
import { MessageTemplate } from "./components/MessageTemplate";
import { ParameterEditor } from "./components/ParameterEditor";
import { ProtocolSettings } from "./components/ProtocolSettings";
import { StatusPanel } from "./components/StatusPanel";
import type { AdapterStatus } from "./types";
import { defaultConfig } from "./types";
import "./App.css";

interface RuntimeStatus {
  running: boolean;
  logs: UiLogEntry[];
  lastMessage?: string;
  adapterStatus?: AdapterStatus;
}

export function App() {
  const [config, setConfig] = useState(defaultConfig);
  const [status, setStatus] = useState<RuntimeStatus>({ running: false, logs: [] });
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    getConfig()
      .then((loadedConfig) => {
        if (!cancelled) {
          setConfig(loadedConfig);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const runAction = async (action: () => Promise<void>) => {
    setError("");
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  };

  const handlePreview = () =>
    runAction(async () => {
      const result = await previewMessage(config);
      setPreview(result.message);
    });

  const handleStart = () =>
    runAction(async () => {
      await saveConfig(config);
      setStatus(await startSimulator());
    });

  const handleStop = () =>
    runAction(async () => {
      setStatus(await stopSimulator());
    });

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <span className="eyebrow">Protocol Simulator</span>
          <h1>模拟消息发送器</h1>
          <p>配置协议、消息模板和随机参数，启动后按当前连接方式接入测试。</p>
        </div>
        <StatusPanel running={status.running} />
      </header>
      <section className="toolbar panel">
        <button className="primary-action" type="button" onClick={handleStart}>
          启动
        </button>
        <button type="button" onClick={handleStop}>
          停止
        </button>
        <button type="button" onClick={handlePreview}>
          预览生成消息
        </button>
      </section>
      {error && <p role="alert">{error}</p>}
      {preview && (
        <section className="panel">
          <h2>预览</h2>
          <pre>{preview}</pre>
        </section>
      )}
      <div className="workspace-grid">
        <section className="panel config-panel">
          <div className="section-title">
            <span className="eyebrow">Setup</span>
            <h2>协议配置</h2>
          </div>
          <ProtocolSettings config={config} setConfig={setConfig} />
          <div className="interval-grid">
            <label>
              发送间隔（秒）
              <input
                type="number"
                value={config.sendIntervalSeconds}
                readOnly={config.protocol === "http"}
                onChange={(event) =>
                  setConfig({ ...config, sendIntervalSeconds: Number(event.target.value) })
                }
              />
            </label>
            <label>
              随机刷新间隔（秒）
              <input
                type="number"
                value={config.randomizeIntervalSeconds}
                onChange={(event) =>
                  setConfig({ ...config, randomizeIntervalSeconds: Number(event.target.value) })
                }
              />
            </label>
          </div>
        </section>
        <ConnectionInfo config={config} adapterStatus={status.adapterStatus} />
        <section className="panel template-panel">
          <MessageTemplate
            value={config.messageTemplate}
            onChange={(messageTemplate) => setConfig({ ...config, messageTemplate })}
          />
        </section>
        <section className="panel params-panel">
          <ParameterEditor
            parameters={config.parameters}
            onChange={(parameters) => setConfig({ ...config, parameters })}
          />
        </section>
        <section className="panel logs-panel">
          <LogViewer logs={status.logs} />
        </section>
      </div>
    </main>
  );
}
