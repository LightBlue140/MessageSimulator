import { render, screen } from "@testing-library/react";
import { within } from "@testing-library/dom";
import { fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/App";

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

  it("shows start stop preview and logs controls", () => {
    render(<App />);

    expect(screen.getByLabelText("配置保存路径")).toBeInTheDocument();
    expect(screen.getByLabelText("配置保存路径")).toHaveAttribute("placeholder", "save/config.json");
    expect(screen.getByText("启动")).toBeInTheDocument();
    expect(screen.getByText("停止")).toBeInTheDocument();
    expect(screen.getByText("预览生成消息")).toBeInTheDocument();
    expect(screen.getByText("保存配置文件")).toBeInTheDocument();
    expect(screen.getByText("加载配置文件")).toBeInTheDocument();
    expect(screen.getByText("参数页")).toBeInTheDocument();
    expect(screen.getByText("日志页")).toBeInTheDocument();
  });

  it("places config and message in independent scroll regions", () => {
    render(<App />);

    expect(screen.getByLabelText("配置区")).toHaveClass("scroll-region");
    expect(screen.getByLabelText("消息区")).toHaveClass("scroll-region", "resizable-panel");
    expect(screen.queryByLabelText("参数页内容")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("日志页内容")).not.toBeInTheDocument();
  });

  it("switches parameters into a separate page", () => {
    render(<App />);

    fireEvent.click(screen.getByText("参数页"));

    expect(screen.getByLabelText("参数页内容")).toHaveClass("scroll-region", "resizable-panel");
    expect(screen.queryByLabelText("编辑工作区")).not.toBeInTheDocument();
  });

  it("switches logs into a separate page", () => {
    render(<App />);

    fireEvent.click(screen.getByText("日志页"));

    expect(screen.getByLabelText("日志页内容")).toBeInTheDocument();
    expect(screen.queryByLabelText("编辑工作区")).not.toBeInTheDocument();
  });

  it("shows protocol-specific connection instructions", () => {
    render(<App />);

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

  it("uses a large message template editor", () => {
    render(<App />);

    expect(screen.getByLabelText("消息模板内容")).toHaveAttribute("rows", "16");
  });
});
