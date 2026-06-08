import { render, screen } from "@testing-library/react";
import { within } from "@testing-library/dom";
import { fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/App";
import { ConnectionInfo } from "../src/components/ConnectionInfo";
import { defaultConfig } from "../src/types";

const openDefaultService = () => {
  fireEvent.click(screen.getByText("进入配置"));
};

describe("runtime controls", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("does not request proxied config when the backend is offline", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).not.toHaveBeenCalledWith("/api/config");
  });

  it("keeps global file controls on the service dashboard and detail controls in one toolbar", () => {
    render(<App />);

    expect(screen.queryByLabelText("配置文件路径")).not.toBeInTheDocument();
    expect(screen.getByText("服务管理")).toBeInTheDocument();
    expect(screen.getByText("全部启动")).toBeInTheDocument();
    expect(screen.getByText("全部停止")).toBeInTheDocument();
    expect(screen.getByText("新建服务")).toBeInTheDocument();
    expect(screen.getByText("日志页")).toBeInTheDocument();
    const quickActions = screen.getByLabelText("服务快捷操作");
    expect(within(quickActions).getByText("全部启动")).not.toHaveClass("active-button");
    expect(within(quickActions).getByText("全部停止")).not.toHaveClass("active-button");
    expect(within(quickActions).getByText("新建服务")).toBeInTheDocument();

    openDefaultService();

    const toolbar = screen.getByLabelText("操作区");
    expect(within(toolbar).getByText("返回首页")).toBeInTheDocument();
    expect(screen.getByText("模拟数据")).toBeInTheDocument();
    expect(within(toolbar).queryByText("保存配置文件")).not.toBeInTheDocument();
    expect(within(toolbar).queryByText("加载配置文件")).not.toBeInTheDocument();
    expect(within(toolbar).getByText("编辑页")).toBeInTheDocument();
    expect(within(toolbar).getByText("参数页")).toBeInTheDocument();
    expect(within(toolbar).queryByText("启动")).not.toBeInTheDocument();
    expect(within(toolbar).queryByText("停止")).not.toBeInTheDocument();
    expect(within(toolbar).queryByText("复制服务")).not.toBeInTheDocument();
    expect(within(toolbar).queryByText("日志页")).not.toBeInTheDocument();
  });

  it("opens a path picker dialog for saving config files", () => {
    render(<App />);

    fireEvent.click(screen.getByText("保存配置文件"));

    expect(screen.getByRole("dialog", { name: "配置文件路径选择" })).toBeInTheDocument();
    expect(screen.getByLabelText("配置文件路径")).toHaveValue("save/config.json");
    expect(screen.getByText("确认保存")).toBeInTheDocument();
  });

  it("opens a path picker dialog for loading config files", () => {
    render(<App />);

    fireEvent.click(screen.getByText("加载配置文件"));

    expect(screen.getByRole("dialog", { name: "配置文件路径选择" })).toBeInTheDocument();
    expect(screen.getByLabelText("配置文件路径")).toHaveValue("save/config.json");
    expect(screen.getByText("确认加载")).toBeInTheDocument();
  });

  it("prevents clicking the active runtime action repeatedly", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url).includes("/health")) {
        throw new Error("offline");
      }
      if (String(url) === "/api/config") {
        return { ok: true, json: async () => ({}) };
      }
      if (String(url) === "/api/services/service-1/start") {
        return { ok: true, json: async () => ({ services: [{ id: "service-1", name: "服务 1", running: true, logs: [] }] }) };
      }
      if (String(url) === "/api/services/service-1/stop") {
        return { ok: true, json: async () => ({ services: [{ id: "service-1", name: "服务 1", running: false, logs: [] }] }) };
      }
      throw new Error(`Unhandled request ${String(url)} ${init?.method ?? "GET"}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);

    const start = screen.getByText("启动");
    const stop = screen.getByText("停止");

    expect(start).toBeEnabled();
    expect(stop).toBeDisabled();
    expect(start).not.toHaveClass("active-button");
    expect(stop).toHaveClass("active-button");

    fireEvent.click(start);
    await vi.waitFor(() => expect(stop).toBeEnabled());
    expect(start).toBeDisabled();
    expect(start).toHaveClass("active-button");
    expect(stop).not.toHaveClass("active-button");
    expect(screen.getByText("运行中")).toHaveClass("running");

    const requestsAfterStart = fetchMock.mock.calls.length;
    fireEvent.click(start);
    expect(fetchMock).toHaveBeenCalledTimes(requestsAfterStart);

    fireEvent.click(stop);
    await vi.waitFor(() => expect(start).toBeEnabled());
    expect(stop).toBeDisabled();
  });

  it("asks before clearing occupied ports when starting a service", async () => {
    const confirmMock = vi.fn().mockReturnValue(true);
    vi.stubGlobal("confirm", confirmMock);
    const conflictResponse = {
      code: "PORT_CONFLICT",
      conflicts: [{ port: 8080, pids: ["1234"] }]
    };
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url).includes("/health")) {
        throw new Error("offline");
      }
      if (String(url) === "/api/config") {
        return { ok: true, json: async () => ({}) };
      }
      if (String(url) === "/api/services/service-1/start" && init?.body === undefined) {
        return { ok: false, status: 409, text: async () => JSON.stringify(conflictResponse) };
      }
      if (String(url) === "/api/services/service-1/start") {
        return { ok: true, json: async () => ({ services: [{ id: "service-1", name: "鏈嶅姟 1", running: true, logs: [] }] }) };
      }
      throw new Error(`Unhandled request ${String(url)} ${init?.method ?? "GET"}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "启动" }));

    await vi.waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(confirmMock.mock.calls[0][0]).toContain("端口 8080");
    expect(fetchMock).toHaveBeenCalledWith("/api/services/service-1/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ forceClearPorts: true })
    });
    await vi.waitFor(() => expect(screen.getByText("运行中")).toHaveClass("running"));
  });

  it("does not clear occupied ports when the user cancels", async () => {
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(false));
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes("/health")) {
        throw new Error("offline");
      }
      if (String(url) === "/api/config") {
        return { ok: true, json: async () => ({}) };
      }
      if (String(url) === "/api/services/service-1/start") {
        return {
          ok: false,
          status: 409,
          text: async () => JSON.stringify({ code: "PORT_CONFLICT", conflicts: [{ port: 8080, pids: ["1234"] }] })
        };
      }
      throw new Error(`Unhandled request ${String(url)}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "启动" }));

    await vi.waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Port is already in use"));
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/services/service-1/start",
      expect.objectContaining({ body: JSON.stringify({ forceClearPorts: true }) })
    );
  });

  it("deletes a copied service from the service dashboard", async () => {
    const copiedConfig = {
      services: [
        { id: "service-1", name: "服务 1", config: defaultConfig },
        { id: "service-2", name: "服务 1 副本", config: defaultConfig }
      ]
    };
    const singleConfig = {
      services: [{ id: "service-1", name: "服务 1", config: defaultConfig }]
    };
    let storedConfig = singleConfig;
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes("/health")) {
        throw new Error("offline");
      }
      if (String(url) === "/api/config") {
        return { ok: true, json: async () => storedConfig };
      }
      if (String(url) === "/api/services/service-1/copy") {
        storedConfig = copiedConfig;
        return { ok: true, json: async () => copiedConfig.services[1] };
      }
      if (String(url) === "/api/services/service-2") {
        storedConfig = singleConfig;
        return { ok: true, json: async () => ({ id: "service-2", ok: true }) };
      }
      if (String(url) === "/api/status") {
        return { ok: true, json: async () => ({ services: [] }) };
      }
      throw new Error(`Unhandled request ${String(url)}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);

    fireEvent.click(screen.getByText("复制"));
    await vi.waitFor(() => expect(screen.getByText("服务 1 副本")).toBeInTheDocument());

    const copiedCard = screen.getByText("服务 1 副本").closest("article");
    expect(copiedCard).not.toBeNull();
    fireEvent.click(within(copiedCard as HTMLElement).getByText("删除"));

    await vi.waitFor(() => expect(screen.queryByText("服务 1 副本")).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith("/api/services/service-2", { method: "DELETE" });
  });

  it("assigns a free HTTP port when creating a new service", () => {
    render(<App />);

    fireEvent.click(screen.getByText("新建服务"));

    expect(screen.getByText("http://localhost:8081/message")).toBeInTheDocument();
  });

  it("opens configuration from the service card but not from card controls", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes("/health")) {
        throw new Error("offline");
      }
      if (String(url) === "/api/config") {
        return { ok: true, json: async () => ({}) };
      }
      if (String(url) === "/api/services/service-1/start") {
        return { ok: true, json: async () => ({ services: [{ id: "service-1", name: "服务 1", running: true, logs: [] }] }) };
      }
      throw new Error(`Unhandled request ${String(url)}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);

    fireEvent.click(screen.getByText("启动"));
    expect(screen.queryByLabelText("协议")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("服务卡片 服务 1"));
    expect(screen.getByLabelText("协议")).toBeInTheDocument();
  });

  it("exits service name editing when Enter is pressed", () => {
    render(<App />);

    const serviceName = screen.getByText("服务 1");
    fireEvent.doubleClick(serviceName);
    const nameInput = screen.getByDisplayValue("服务 1");

    fireEvent.change(nameInput, { target: { value: "服务 A" } });
    fireEvent.keyDown(nameInput, { key: "Enter" });

    expect(screen.queryByDisplayValue("服务 A")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("协议")).not.toBeInTheDocument();
    expect(screen.getAllByText("服务 A").length).toBeGreaterThan(0);
  });

  it("places config and message in independent scroll regions", () => {
    render(<App />);
    openDefaultService();

    expect(screen.getByLabelText("配置区")).toHaveClass("scroll-region");
    expect(screen.getByLabelText("消息区")).toHaveClass("scroll-region", "resizable-panel");
    expect(screen.queryByLabelText("参数页内容")).not.toBeInTheDocument();
  });

  it("switches parameters from the same configuration toolbar", () => {
    render(<App />);
    openDefaultService();

    fireEvent.click(screen.getByText("参数页"));

    expect(screen.getByLabelText("参数页内容")).toHaveClass("scroll-region", "resizable-panel");
    expect(screen.queryByLabelText("编辑工作区")).not.toBeInTheDocument();
  });

  it("switches logs into a dashboard page", () => {
    render(<App />);

    fireEvent.click(screen.getByText("日志页"));

    expect(screen.getByLabelText("总服务日志页")).toBeInTheDocument();
    expect(screen.getByText("服务页")).toBeInTheDocument();
    expect(screen.getByText("暂无日志")).toBeInTheDocument();
  });

  it("shows protocol-specific connection instructions", () => {
    render(<App />);
    openDefaultService();

    expect(screen.getByText("连接方式")).toBeInTheDocument();
    expect(screen.getByText("GET")).toBeInTheDocument();
    expect(screen.getByText("http://localhost:8080/message")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("协议"), { target: { value: "mqtt" } });

    expect(screen.getByText("MQTT Broker")).toBeInTheDocument();
    expect(screen.getByText("mqtt://localhost:1883")).toBeInTheDocument();
    expect(screen.getByText("simulator/message")).toBeInTheDocument();
    expect(screen.getByText("QoS 0")).toBeInTheDocument();
    expect(screen.getByText("未启用账号密码")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("协议"), { target: { value: "websocket" } });

    expect(screen.getByText("WebSocket URL")).toBeInTheDocument();
    expect(screen.getByText("ws://localhost:8081/ws")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("协议"), { target: { value: "tcp" } });

    expect(screen.getByText("TCP 地址")).toBeInTheDocument();
    expect(screen.getByText("tcp://localhost:9000")).toBeInTheDocument();
    const connectionPanel = screen.getByText("连接方式").closest("section");
    expect(connectionPanel).not.toBeNull();
    expect(within(connectionPanel as HTMLElement).getByText("utf8")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("协议"), { target: { value: "opcua" } });

    expect(screen.getByText("Endpoint")).toBeInTheDocument();
    expect(screen.getByText("opc.tcp://localhost:4840/simulator")).toBeInTheDocument();
    expect(screen.getByText("s=Message")).toBeInTheDocument();
  });

  it("shows the current LAN host for wildcard listen addresses", () => {
    vi.stubGlobal("location", { hostname: "192.168.15.152" });

    render(
      <ConnectionInfo
        config={defaultConfig}
        adapterStatus={{ listenAddress: "http://0.0.0.0:8080" }}
      />
    );

    expect(screen.getByText("http://192.168.15.152:8080/message")).toBeInTheDocument();
  });

  it("shows generated simulated data in a dialog", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes("/health")) {
        throw new Error("offline");
      }
      if (String(url) === "/api/preview") {
        return { ok: true, json: async () => ({ message: "{\"aa\":321}" }) };
      }
      throw new Error(`Unhandled request ${String(url)}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);
    openDefaultService();

    fireEvent.click(screen.getByText("模拟数据"));

    await vi.waitFor(() =>
      expect(screen.getByRole("dialog", { name: "模拟数据预览" })).toBeInTheDocument()
    );
    expect(screen.getByText("{\"aa\":321}")).toBeInTheDocument();
  });

  it("uses a large message template editor", () => {
    render(<App />);
    openDefaultService();

    expect(screen.getByLabelText("消息模板内容")).toHaveAttribute("rows", "16");
  });
});
