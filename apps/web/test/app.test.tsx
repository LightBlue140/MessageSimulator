import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../src/App";

describe("App", () => {
  it("renders protocol selector and parameter editor", () => {
    render(<App />);

    expect(screen.getByLabelText("协议")).toBeInTheDocument();
    expect(screen.getByText("自定义参数")).toBeInTheDocument();
    expect(screen.getByText("消息模板")).toBeInTheDocument();
  });
});
