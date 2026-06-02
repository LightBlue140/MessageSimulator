import { useEffect, useState } from "react";
import {
  getConfig,
  isBackendAvailable,
  loadConfigFile,
  previewMessage,
  saveConfig,
  saveConfigFile,
  startSimulator,
  stopSimulator
} from "./api";
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
  const [configFilePath, setConfigFilePath] = useState("");
  const [view, setView] = useState<"editor" | "parameters" | "logs">("editor");

  useEffect(() => {
    let cancelled = false;

    isBackendAvailable()
      .then((available) => (available ? getConfig() : undefined))
      .then((loadedConfig) => {
        if (!cancelled && loadedConfig !== undefined) {
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

  const handleSaveConfigFile = () =>
    runAction(async () => {
      const result = await saveConfigFile(config, configFilePath);
      setConfigFilePath(result.path);
    });

  const handleLoadConfigFile = () =>
    runAction(async () => {
      const result = await loadConfigFile(configFilePath);
      setConfig(result.config);
      setConfigFilePath(result.path);
      setView("editor");
    });

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">Protocol Simulator</span>
          <h1>模拟消息发送器</h1>
        </div>
        <StatusPanel running={status.running} />
      </header>
      <section className="toolbar panel" aria-label="操作区">
        <label className="file-path-control">
          配置保存路径
          <input
            placeholder="save/config.json"
            value={configFilePath}
            onChange={(event) => setConfigFilePath(event.target.value)}
          />
        </label>
        <div className="action-group">
          <button className="primary-action" type="button" onClick={handleStart}>
            启动
          </button>
          <button type="button" onClick={handleStop}>
            停止
          </button>
          <button type="button" onClick={handlePreview}>
            预览生成消息
          </button>
          <button type="button" onClick={handleSaveConfigFile}>
            保存配置文件
          </button>
          <button type="button" onClick={handleLoadConfigFile}>
            加载配置文件
          </button>
        </div>
        <div className="view-switcher">
          <button
            className={view === "editor" ? "active-tab" : ""}
            type="button"
            onClick={() => setView("editor")}
          >
            编辑页
          </button>
          <button
            className={view === "parameters" ? "active-tab" : ""}
            type="button"
            onClick={() => setView("parameters")}
          >
            参数页
          </button>
          <button
            className={view === "logs" ? "active-tab" : ""}
            type="button"
            onClick={() => setView("logs")}
          >
            日志页
          </button>
        </div>
      </section>
      {error && <p role="alert">{error}</p>}
      {view === "editor" && (
        <div className="editor-layout" aria-label="编辑工作区">
          <section className="panel scroll-region config-panel" aria-label="配置区">
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
            <ConnectionInfo config={config} adapterStatus={status.adapterStatus} />
          </section>
          <section className="panel scroll-region resizable-panel template-panel" aria-label="消息区">
            <MessageTemplate
              value={config.messageTemplate}
              onChange={(messageTemplate) => setConfig({ ...config, messageTemplate })}
            />
            {preview && (
              <section className="preview-panel">
                <h2>预览</h2>
                <pre>{preview}</pre>
              </section>
            )}
          </section>
        </div>
      )}
      {view === "parameters" && (
        <section className="panel scroll-region resizable-panel params-page" aria-label="参数页内容">
          <ParameterEditor
            parameters={config.parameters}
            onChange={(parameters) => setConfig({ ...config, parameters })}
          />
        </section>
      )}
      {view === "logs" && (
        <section className="panel scroll-region log-page" aria-label="日志页内容">
          <LogViewer logs={status.logs} />
        </section>
      )}
    </main>
  );
}
