import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../src/App";

describe("App", () => {
  it("renders editor view and opens parameter page", () => {
    render(<App />);

    expect(screen.getByLabelText("协议")).toBeInTheDocument();
    expect(screen.getByText("消息模板")).toBeInTheDocument();

    fireEvent.click(screen.getByText("参数页"));

    expect(screen.getByText("自定义参数")).toBeInTheDocument();
  });
});
