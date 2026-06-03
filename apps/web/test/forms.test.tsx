import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../src/App";

const openDefaultService = () => {
  render(<App />);
  fireEvent.click(screen.getByText("进入配置"));
};

describe("dynamic forms", () => {
  it("shows MQTT fields after protocol switch", () => {
    openDefaultService();

    fireEvent.change(screen.getByLabelText("协议"), { target: { value: "mqtt" } });

    expect(screen.getByLabelText("Topic")).toBeInTheDocument();
    expect(screen.getByLabelText("QoS")).toBeInTheDocument();
    expect(screen.getByLabelText("保留消息")).toBeInTheDocument();
    expect(screen.getByLabelText("启用用户名和密码")).toBeInTheDocument();
    expect(screen.queryByLabelText("用户名")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("启用用户名和密码"));
    expect(screen.getByLabelText("用户名")).toBeInTheDocument();
    expect(screen.getByLabelText("密码")).toBeInTheDocument();
  });

  it("shows vector component controls after parameter type switch", () => {
    openDefaultService();

    fireEvent.click(screen.getByText("参数页"));
    fireEvent.click(screen.getByText("新增参数"));
    fireEvent.change(screen.getByLabelText("参数类型 param2"), { target: { value: "vector" } });

    expect(screen.getByText("分量")).toBeInTheDocument();
    expect(screen.getByLabelText("分量名 x")).toBeInTheDocument();
    expect(screen.getByText("新增分量")).toBeInTheDocument();
  });

  it("shows each custom parameter as a single row", () => {
    openDefaultService();

    fireEvent.click(screen.getByText("参数页"));
    expect(screen.getByLabelText("参数 aa")).toHaveClass("parameter-row");
  });

  it("keeps checkbox explanations beside the switch", () => {
    openDefaultService();

    fireEvent.click(screen.getByText("参数页"));

    expect(screen.getByLabelText("启用").closest("label")).toHaveClass("checkbox-label");
  });

  it("uses multiline string enum candidates", () => {
    openDefaultService();

    fireEvent.click(screen.getByText("参数页"));
    fireEvent.change(screen.getByLabelText("参数类型 aa"), { target: { value: "string" } });
    fireEvent.change(screen.getByLabelText("候选值 aa"), { target: { value: "one\ntwo\n" } });

    expect(screen.getByLabelText("候选值 aa")).toHaveValue("one\ntwo\n");
  });

  it("edits the service name from the dashboard and configuration page", () => {
    render(<App />);

    expect(screen.queryByLabelText("服务名称 服务 1")).not.toBeInTheDocument();
    fireEvent.doubleClick(screen.getByText("服务 1"));
    fireEvent.change(screen.getByLabelText("服务名称 服务 1"), { target: { value: "MQTT 服务" } });
    fireEvent.blur(screen.getByLabelText("服务名称 MQTT 服务"));
    expect(screen.getByText("MQTT 服务")).toBeInTheDocument();

    fireEvent.click(screen.getByText("进入配置"));
    expect(screen.queryByLabelText("服务名称")).not.toBeInTheDocument();
    fireEvent.doubleClick(screen.getByRole("button", { name: "MQTT 服务" }));
    fireEvent.change(screen.getByLabelText("服务名称"), { target: { value: "TCP 服务" } });
    fireEvent.blur(screen.getByLabelText("服务名称"));
    fireEvent.click(screen.getByText("返回首页"));

    expect(screen.getByText("TCP 服务")).toBeInTheDocument();
  });

  it("toggles dark mode", () => {
    render(<App />);

    fireEvent.click(screen.getByText("黑夜模式"));

    expect(screen.getByRole("main")).toHaveClass("dark-mode");
    expect(screen.getByText("白天模式")).toBeInTheDocument();
  });

  it("marks send interval unused for HTTP", () => {
    openDefaultService();

    expect(screen.getByLabelText("发送间隔（秒）")).toHaveAttribute("readonly");
  });
});
