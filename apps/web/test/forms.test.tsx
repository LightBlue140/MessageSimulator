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

  it("uses a single input for string candidates", () => {
    openDefaultService();

    fireEvent.click(screen.getByText("参数页"));
    fireEvent.change(screen.getByLabelText("参数类型 aa"), { target: { value: "string" } });
    fireEvent.change(screen.getByLabelText("候选值 aa"), { target: { value: "one" } });

    expect(screen.getByLabelText("候选值 aa")).toHaveValue("one");
  });

  it("marks send interval unused for HTTP", () => {
    openDefaultService();

    expect(screen.getByLabelText("发送间隔（秒）")).toHaveAttribute("readonly");
  });
});
