import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../src/App";

describe("App", () => {
  it("renders service dashboard and opens a service configuration page", () => {
    render(<App />);

    expect(screen.getByText("服务管理")).toBeInTheDocument();
    expect(screen.getByText("服务 1")).toBeInTheDocument();

    fireEvent.click(screen.getByText("进入配置"));

    expect(screen.getByLabelText("协议")).toBeInTheDocument();
    expect(screen.getByText("消息模板")).toBeInTheDocument();

    fireEvent.click(screen.getByText("参数页"));

    expect(screen.getByText("自定义参数")).toBeInTheDocument();
  });
});
