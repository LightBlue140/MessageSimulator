import { useEffect, useMemo, useState } from "react";
import {
  copyService,
  getConfig,
  getStatus,
  isBackendAvailable,
  loadConfigFile,
  previewMessage,
  saveConfig,
  saveConfigFile,
  startAllServices,
  startService,
  stopAllServices,
  stopService
} from "./api";
import { ConnectionInfo } from "./components/ConnectionInfo";
import { LogViewer } from "./components/LogViewer";
import { MessageTemplate } from "./components/MessageTemplate";
import { ParameterEditor } from "./components/ParameterEditor";
import { ProtocolSettings } from "./components/ProtocolSettings";
import type { AppConfig, MultiServiceRuntimeStatus, ServiceRuntimeStatus, SimulatorConfig } from "./types";
import { defaultAppConfig, defaultConfig } from "./types";
import "./App.css";

const defaultConfigFilePath = "save/config.json";
type ConfigFileDialogMode = "save" | "load";
type DashboardView = "services" | "logs";
type DetailView = "editor" | "parameters";
const logsPerPage = 20;

const statusFor = (status: MultiServiceRuntimeStatus, serviceId: string): ServiceRuntimeStatus | undefined =>
  status.services.find((service) => service.id === serviceId);

const cloneConfig = (config: SimulatorConfig): SimulatorConfig => structuredClone(config);

const nextServiceId = (services: AppConfig["services"]) => {
  let index = services.length + 1;
  const existing = new Set(services.map((service) => service.id));
  while (existing.has(`service-${index}`)) {
    index += 1;
  }
  return `service-${index}`;
};

export function App() {
  const [appConfig, setAppConfig] = useState<AppConfig>(defaultAppConfig);
  const [runtimeStatus, setRuntimeStatus] = useState<MultiServiceRuntimeStatus>({ services: [] });
  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>();
  const [dashboardView, setDashboardView] = useState<DashboardView>("services");
  const [detailView, setDetailView] = useState<DetailView>("editor");
  const [darkMode, setDarkMode] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | undefined>();
  const [editingDetailName, setEditingDetailName] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [configFilePath, setConfigFilePath] = useState(defaultConfigFilePath);
  const [configFileDialogMode, setConfigFileDialogMode] = useState<ConfigFileDialogMode | undefined>();
  const [pendingAction, setPendingAction] = useState<string | undefined>();

  const selectedService = appConfig.services.find((service) => service.id === selectedServiceId);
  const runningCount = useMemo(
    () => runtimeStatus.services.filter((service) => service.running).length,
    [runtimeStatus.services]
  );
  const dashboardLogs = useMemo(
    () =>
      runtimeStatus.services.flatMap((service) =>
        service.logs.map((log) => ({ ...log, message: `[${service.name}] ${log.message}` }))
      ),
    [runtimeStatus.services]
  );

  useEffect(() => {
    let cancelled = false;

    isBackendAvailable()
      .then((available) => (available ? Promise.all([getConfig(), getStatus()]) : undefined))
      .then((loaded) => {
        if (!cancelled && loaded !== undefined) {
          const [loadedConfig, loadedStatus] = loaded;
          setAppConfig(loadedConfig);
          setRuntimeStatus(loadedStatus);
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

  const updateSelectedConfig = (config: SimulatorConfig) => {
    if (selectedService === undefined) {
      return;
    }
    setAppConfig({
      services: appConfig.services.map((service) =>
        service.id === selectedService.id ? { ...service, config } : service
      )
    });
  };

  const updateServiceName = (serviceId: string, name: string) => {
    setAppConfig({
      services: appConfig.services.map((service) =>
        service.id === serviceId ? { ...service, name } : service
      )
    });
  };

  const handleStartAll = () =>
    runAction(async () => {
      setPendingAction("start-all");
      try {
        await saveConfig(appConfig);
        await startAllServices();
        setRuntimeStatus(await getStatus());
      } finally {
        setPendingAction(undefined);
      }
    });

  const handleStopAll = () =>
    runAction(async () => {
      setPendingAction("stop-all");
      try {
        await stopAllServices();
        setRuntimeStatus(await getStatus());
      } finally {
        setPendingAction(undefined);
      }
    });

  const handleStartService = (serviceId: string) =>
    runAction(async () => {
      setPendingAction(`start-${serviceId}`);
      try {
        await saveConfig(appConfig);
        setRuntimeStatus(await startService(serviceId));
      } finally {
        setPendingAction(undefined);
      }
    });

  const handleStopService = (serviceId: string) =>
    runAction(async () => {
      setPendingAction(`stop-${serviceId}`);
      try {
        setRuntimeStatus(await stopService(serviceId));
      } finally {
        setPendingAction(undefined);
      }
    });

  const handleCopyService = (serviceId: string) =>
    runAction(async () => {
      await saveConfig(appConfig);
      await copyService(serviceId);
      const loaded = await getConfig();
      setAppConfig(loaded);
      setSelectedServiceId(undefined);
      setDashboardView("services");
      setRuntimeStatus(await getStatus());
    });

  const handleAddService = () => {
    const id = nextServiceId(appConfig.services);
    setAppConfig({
      services: [
        ...appConfig.services,
        { id, name: `服务 ${appConfig.services.length + 1}`, config: cloneConfig(defaultConfig) }
      ]
    });
    setSelectedServiceId(id);
    setDetailView("editor");
  };

  const handlePreview = () =>
    runAction(async () => {
      if (selectedService === undefined) {
        return;
      }
      const result = await previewMessage(selectedService.config);
      setPreview(result.message);
    });

  const closeConfigFileDialog = () => setConfigFileDialogMode(undefined);

  const handleConfirmConfigFile = () =>
    runAction(async () => {
      if (configFileDialogMode === "save") {
        const result = await saveConfigFile(appConfig, configFilePath);
        setConfigFilePath(result.path);
      }

      if (configFileDialogMode === "load") {
        const result = await loadConfigFile(configFilePath);
        setAppConfig(result.config);
        setConfigFilePath(result.path);
        setSelectedServiceId(undefined);
      }

      closeConfigFileDialog();
    });

  return (
    <main className={darkMode ? "app-shell dark-mode" : "app-shell"}>
      <header className="topbar">
        <div>
          <span className="eyebrow">Protocol Simulator</span>
          <h1>模拟消息发送器</h1>
        </div>
        <div className="topbar-actions">
          <button type="button" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? "白天模式" : "黑夜模式"}
          </button>
          <section aria-label="运行总览" className="status-summary">
            <strong>{runningCount}</strong>
            <span>运行中 / {appConfig.services.length} 个服务</span>
          </section>
        </div>
      </header>

      {selectedService === undefined ? (
        <ServiceDashboard
          appConfig={appConfig}
          dashboardLogs={dashboardLogs}
          dashboardView={dashboardView}
          editingServiceId={editingServiceId}
          logsPage={logsPage}
          pendingAction={pendingAction}
          runtimeStatus={runtimeStatus}
          onAdd={handleAddService}
          onCopy={handleCopyService}
          onLoad={() => setConfigFileDialogMode("load")}
          onSave={() => setConfigFileDialogMode("save")}
          onSelect={(serviceId) => {
            setSelectedServiceId(serviceId);
            setDetailView("editor");
          }}
          onRename={updateServiceName}
          onRenameBlur={() => setEditingServiceId(undefined)}
          onRenameStart={setEditingServiceId}
          onStart={handleStartService}
          onStartAll={handleStartAll}
          onStop={handleStopService}
          onStopAll={handleStopAll}
          onLogsPageChange={setLogsPage}
          onViewChange={(view) => {
            setDashboardView(view);
            setLogsPage(1);
          }}
        />
      ) : (
        <ServiceDetail
          config={selectedService.config}
          detailView={detailView}
          editingName={editingDetailName}
          preview={preview}
          serviceName={selectedService.name}
          onBack={() => setSelectedServiceId(undefined)}
          onChange={updateSelectedConfig}
          onClosePreview={() => setPreview("")}
          onLoad={() => setConfigFileDialogMode("load")}
          onNameChange={(name) => updateServiceName(selectedService.id, name)}
          onNameEditEnd={() => setEditingDetailName(false)}
          onNameEditStart={() => setEditingDetailName(true)}
          onPreview={handlePreview}
          onSave={() => setConfigFileDialogMode("save")}
          onViewChange={setDetailView}
        />
      )}

      {error && <p role="alert">{error}</p>}
      {configFileDialogMode && (
        <div className="modal-backdrop">
          <section
            aria-label="配置文件路径选择"
            aria-modal="true"
            className="panel config-file-dialog"
            role="dialog"
          >
            <div className="section-title">
              <span className="eyebrow">Config File</span>
              <h2>{configFileDialogMode === "save" ? "保存配置文件" : "加载配置文件"}</h2>
            </div>
            <label>
              配置文件路径
              <input
                autoFocus
                placeholder={defaultConfigFilePath}
                value={configFilePath}
                onChange={(event) => setConfigFilePath(event.target.value)}
              />
            </label>
            <p className="dialog-hint">默认保存到项目根目录的 save 文件夹，可输入相对路径或绝对路径。</p>
            <div className="dialog-actions">
              <button type="button" onClick={closeConfigFileDialog}>
                取消
              </button>
              <button className="active-button" type="button" onClick={handleConfirmConfigFile}>
                {configFileDialogMode === "save" ? "确认保存" : "确认加载"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function ServiceDashboard({
  appConfig,
  dashboardLogs,
  dashboardView,
  editingServiceId,
  logsPage,
  pendingAction,
  runtimeStatus,
  onAdd,
  onCopy,
  onLoad,
  onSave,
  onSelect,
  onRename,
  onRenameBlur,
  onRenameStart,
  onStart,
  onStartAll,
  onStop,
  onStopAll,
  onLogsPageChange,
  onViewChange
}: {
  appConfig: AppConfig;
  dashboardLogs: Array<ServiceRuntimeStatus["logs"][number]>;
  dashboardView: DashboardView;
  editingServiceId?: string;
  logsPage: number;
  pendingAction?: string;
  runtimeStatus: MultiServiceRuntimeStatus;
  onAdd: () => void;
  onCopy: (serviceId: string) => void;
  onLoad: () => void;
  onSave: () => void;
  onSelect: (serviceId: string) => void;
  onRename: (serviceId: string, name: string) => void;
  onRenameBlur: () => void;
  onRenameStart: (serviceId: string) => void;
  onStart: (serviceId: string) => void;
  onStartAll: () => void;
  onStop: (serviceId: string) => void;
  onStopAll: () => void;
  onLogsPageChange: (page: number) => void;
  onViewChange: (view: DashboardView) => void;
}) {
  const totalLogPages = Math.max(1, Math.ceil(dashboardLogs.length / logsPerPage));
  const safeLogsPage = Math.min(logsPage, totalLogPages);
  const pageStart = (safeLogsPage - 1) * logsPerPage;
  const visibleLogs = dashboardLogs.slice(pageStart, pageStart + logsPerPage);

  return (
    <section className="panel scroll-region dashboard-page" aria-label="服务管理页">
      <div className="dashboard-header">
        <div className="section-title">
          <span className="eyebrow">Services</span>
          <h2>服务管理</h2>
        </div>
        <div className="action-group">
          <button className={dashboardView === "services" ? "active-button" : ""} type="button" onClick={() => onViewChange("services")}>
            服务页
          </button>
          <button className={dashboardView === "logs" ? "active-button" : ""} type="button" onClick={() => onViewChange("logs")}>
            日志页
          </button>
          <button className="active-button" type="button" disabled={pendingAction !== undefined} onClick={onStartAll}>
            全部启动
          </button>
          <button type="button" disabled={pendingAction !== undefined} onClick={onStopAll}>
            全部停止
          </button>
          <button type="button" onClick={onAdd}>
            新建服务
          </button>
          <button type="button" onClick={onSave}>
            保存配置文件
          </button>
          <button type="button" onClick={onLoad}>
            加载配置文件
          </button>
        </div>
      </div>
      {dashboardView === "services" ? (
        <div className="service-grid">
          {appConfig.services.map((service) => {
            const status = statusFor(runtimeStatus, service.id);
            const running = status?.running ?? false;
            return (
              <article className="service-card" key={service.id}>
                <div>
                  <span className={running ? "status-pill running" : "status-pill"}>{running ? "运行中" : "已停止"}</span>
                  <EditableServiceName
                    className="service-name-field"
                    editing={editingServiceId === service.id}
                    label={`服务名称 ${service.name}`}
                    name={service.name}
                    onBlur={onRenameBlur}
                    onChange={(name) => onRename(service.id, name)}
                    onEdit={() => onRenameStart(service.id)}
                  />
                  <p>{service.config.protocol.toUpperCase()}</p>
                </div>
                <ConnectionInfo config={service.config} adapterStatus={status?.adapterStatus} compact />
                {status?.error && <p className="service-error">{status.error}</p>}
                <div className="card-actions">
                  <button type="button" onClick={() => onSelect(service.id)}>
                    进入配置
                  </button>
                  <button type="button" onClick={() => onCopy(service.id)}>
                    复制
                  </button>
                  <button
                    className={running ? "" : "active-button"}
                    type="button"
                    disabled={running || pendingAction !== undefined}
                    onClick={() => onStart(service.id)}
                  >
                    启动
                  </button>
                  <button
                    type="button"
                    disabled={!running || pendingAction !== undefined}
                    onClick={() => onStop(service.id)}
                  >
                    停止
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <section className="log-page" aria-label="总服务日志页">
          <LogViewer logs={visibleLogs} />
          <div className="pagination-row">
            <button type="button" disabled={safeLogsPage <= 1} onClick={() => onLogsPageChange(safeLogsPage - 1)}>
              上一页
            </button>
            <span>
              第 {safeLogsPage} / {totalLogPages} 页
            </span>
            <button
              type="button"
              disabled={safeLogsPage >= totalLogPages}
              onClick={() => onLogsPageChange(safeLogsPage + 1)}
            >
              下一页
            </button>
          </div>
        </section>
      )}
    </section>
  );
}

function EditableServiceName({
  className,
  editing,
  label,
  name,
  onBlur,
  onChange,
  onEdit
}: {
  className?: string;
  editing: boolean;
  label: string;
  name: string;
  onBlur: () => void;
  onChange: (name: string) => void;
  onEdit: () => void;
}) {
  if (editing) {
    return (
      <label className={className}>
        {label}
        <input
          autoFocus
          value={name}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    );
  }

  return (
    <button className={`editable-name ${className ?? ""}`} type="button" onDoubleClick={onEdit}>
      {name}
    </button>
  );
}

function ServiceDetail({
  config,
  detailView,
  editingName,
  preview,
  serviceName,
  onBack,
  onChange,
  onClosePreview,
  onLoad,
  onNameChange,
  onNameEditEnd,
  onNameEditStart,
  onPreview,
  onSave,
  onViewChange
}: {
  config: SimulatorConfig;
  detailView: DetailView;
  editingName: boolean;
  preview: string;
  serviceName: string;
  onBack: () => void;
  onChange: (config: SimulatorConfig) => void;
  onClosePreview: () => void;
  onLoad: () => void;
  onNameChange: (name: string) => void;
  onNameEditEnd: () => void;
  onNameEditStart: () => void;
  onPreview: () => void;
  onSave: () => void;
  onViewChange: (view: DetailView) => void;
}) {
  return (
    <>
      <section className="toolbar panel" aria-label="操作区">
        <div className="action-group">
          <button type="button" onClick={onBack}>
            返回首页
          </button>
          <button type="button" onClick={onPreview}>
            模拟数据
          </button>
          <button type="button" onClick={onSave}>
            保存配置文件
          </button>
          <button type="button" onClick={onLoad}>
            加载配置文件
          </button>
          <button className={detailView === "editor" ? "active-button" : ""} type="button" onClick={() => onViewChange("editor")}>
            编辑页
          </button>
          <button className={detailView === "parameters" ? "active-button" : ""} type="button" onClick={() => onViewChange("parameters")}>
            参数页
          </button>
        </div>
      </section>

      {detailView === "editor" && (
        <div className="editor-layout" aria-label="编辑工作区">
          <section className="panel scroll-region config-panel" aria-label="配置区">
            <div className="section-title">
              <span className="eyebrow">{serviceName}</span>
              <h2>协议配置</h2>
            </div>
            <EditableServiceName
              className="detail-name-field"
              editing={editingName}
              label="服务名称"
              name={serviceName}
              onBlur={onNameEditEnd}
              onChange={onNameChange}
              onEdit={onNameEditStart}
            />
            <ProtocolSettings config={config} setConfig={onChange} />
            <div className="interval-grid">
              <label>
                发送间隔（秒）
                <input
                  type="number"
                  value={config.sendIntervalSeconds}
                  readOnly={config.protocol === "http"}
                  onChange={(event) => onChange({ ...config, sendIntervalSeconds: Number(event.target.value) })}
                />
              </label>
              <label>
                随机刷新间隔（秒）
                <input
                  type="number"
                  value={config.randomizeIntervalSeconds}
                  onChange={(event) => onChange({ ...config, randomizeIntervalSeconds: Number(event.target.value) })}
                />
              </label>
            </div>
            <ConnectionInfo config={config} />
          </section>
          <section className="panel scroll-region resizable-panel template-panel" aria-label="消息区">
            <MessageTemplate
              value={config.messageTemplate}
              onChange={(messageTemplate) => onChange({ ...config, messageTemplate })}
            />
          </section>
        </div>
      )}

      {detailView === "parameters" && (
        <section className="panel scroll-region resizable-panel params-page" aria-label="参数页内容">
          <ParameterEditor parameters={config.parameters} onChange={(parameters) => onChange({ ...config, parameters })} />
        </section>
      )}
      {preview && (
        <div className="modal-backdrop">
          <section className="panel preview-dialog" role="dialog" aria-modal="true" aria-label="模拟数据预览">
            <div className="section-title">
              <span className="eyebrow">Preview</span>
              <h2>模拟数据</h2>
            </div>
            <pre>{preview}</pre>
            <div className="dialog-actions">
              <button className="active-button" type="button" onClick={onClosePreview}>
                关闭
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
