import { useState } from "react";
import { MessageTemplate } from "./components/MessageTemplate";
import { ParameterEditor } from "./components/ParameterEditor";
import { ProtocolSettings } from "./components/ProtocolSettings";
import { StatusPanel } from "./components/StatusPanel";
import { defaultConfig } from "./types";

export function App() {
  const [config, setConfig] = useState(defaultConfig);
  const [running] = useState(false);

  return (
    <main>
      <h1>模拟消息发送器</h1>
      <StatusPanel running={running} />
      <ProtocolSettings config={config} setConfig={setConfig} />
      <section>
        <label>
          发送间隔（秒）
          <input
            type="number"
            value={config.sendIntervalSeconds}
            readOnly={config.protocol === "http"}
          />
        </label>
        <label>
          随机刷新间隔（秒）
          <input type="number" value={config.randomizeIntervalSeconds} readOnly />
        </label>
      </section>
      <MessageTemplate
        value={config.messageTemplate}
        onChange={(messageTemplate) => setConfig({ ...config, messageTemplate })}
      />
      <ParameterEditor />
    </main>
  );
}
