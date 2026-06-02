import { render, screen } from "@testing-library/react";
import { within } from "@testing-library/dom";
import { fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../src/App";

describe("runtime controls", () => {
  it("shows start stop preview and logs controls", () => {
    render(<App />);

    expect(screen.getByText("启动")).toBeInTheDocument();
    expect(screen.getByText("停止")).toBeInTheDocument();
    expect(screen.getByText("预览生成消息")).toBeInTheDocument();
    expect(screen.getByText("日志")).toBeInTheDocument();
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
