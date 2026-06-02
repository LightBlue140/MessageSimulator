import { render, screen } from "@testing-library/react";
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
});
