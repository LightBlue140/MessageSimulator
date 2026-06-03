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

  it("keeps runtime controls on the service dashboard and configuration controls in one toolbar", () => {
    render(<App />);

    expect(screen.queryByLabelText("配置文件路径")).not.toBeInTheDocument();
    expect(screen.getByText("服务管理")).toBeInTheDocument();
    expect(screen.getByText("全部启动")).toBeInTheDocument();
    expect(screen.getByText("全部停止")).toBeInTheDocument();
    expect(screen.getByText("新建服务")).toBeInTheDocument();
    expect(screen.getByText("日志页")).toBeInTheDocument();

    openDefaultService();

    const toolbar = screen.getByLabelText("操作区");
    expect(within(toolbar).getByText("返回首页")).toBeInTheDocument();
    expect(screen.getByText("模拟数据")).toBeInTheDocument();
    expect(screen.getByText("保存配置文件")).toBeInTheDocument();
    expect(screen.getByText("加载配置文件")).toBeInTheDocument();
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

    fireEvent.click(start);
    await vi.waitFor(() => expect(stop).toBeEnabled());
    expect(start).toBeDisabled();

    fireEvent.click(start);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    fireEvent.click(stop);
    await vi.waitFor(() => expect(start).toBeEnabled());
    expect(stop).toBeDisabled();
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
