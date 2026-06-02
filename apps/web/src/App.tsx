import { useState } from "react";
import { previewMessage, saveConfig, startSimulator, stopSimulator } from "./api";
import { LogViewer, type UiLogEntry } from "./components/LogViewer";
import { MessageTemplate } from "./components/MessageTemplate";
import { ParameterEditor } from "./components/ParameterEditor";
import { ProtocolSettings } from "./components/ProtocolSettings";
import { StatusPanel } from "./components/StatusPanel";
import { defaultConfig } from "./types";

interface RuntimeStatus {
  running: boolean;
  logs: UiLogEntry[];
  lastMessage?: string;
}

export function App() {
  const [config, setConfig] = useState(defaultConfig);
  const [status, setStatus] = useState<RuntimeStatus>({ running: false, logs: [] });
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");

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
    <main>
      <h1>模拟消息发送器</h1>
      <StatusPanel running={status.running} />
      <section>
        <button type="button" onClick={handleStart}>
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
        <section>
          <h2>预览</h2>
          <pre>{preview}</pre>
        </section>
      )}
      <ProtocolSettings config={config} setConfig={setConfig} />
      <section>
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
      </section>
      <MessageTemplate
        value={config.messageTemplate}
        onChange={(messageTemplate) => setConfig({ ...config, messageTemplate })}
      />
      <ParameterEditor
        parameters={config.parameters}
        onChange={(parameters) => setConfig({ ...config, parameters })}
      />
      <LogViewer logs={status.logs} />
    </main>
  );
}
