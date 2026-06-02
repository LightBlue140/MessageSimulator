import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../src/App";

describe("dynamic forms", () => {
  it("shows MQTT fields after protocol switch", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("协议"), { target: { value: "mqtt" } });

    expect(screen.getByLabelText("Topic")).toBeInTheDocument();
    expect(screen.getByLabelText("QoS")).toBeInTheDocument();
  });

  it("shows vector component controls after parameter type switch", () => {
    render(<App />);

    fireEvent.click(screen.getByText("新增参数"));
    fireEvent.change(screen.getByLabelText("参数类型 param2"), { target: { value: "vector" } });

    expect(screen.getByText("分量")).toBeInTheDocument();
    expect(screen.getByLabelText("分量名 x")).toBeInTheDocument();
    expect(screen.getByText("新增分量")).toBeInTheDocument();
  });

  it("marks send interval unused for HTTP", () => {
    render(<App />);

    expect(screen.getByLabelText("发送间隔（秒）")).toHaveAttribute("readonly");
  });
});
