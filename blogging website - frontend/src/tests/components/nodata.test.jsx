import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import NoDataMessage from "../../components/nodata.component";

describe("NoDataMessage component", () => {
  it("renders without crashing", () => {
    const { container } = render(<NoDataMessage message="Nothing here" />);
    expect(container.firstChild).toBeTruthy();
  });

  it("displays the message prop", () => {
    render(<NoDataMessage message="No posts found" />);
    expect(screen.getByText("No posts found")).toBeInTheDocument();
  });

  it("renders different messages correctly", () => {
    const { rerender } = render(<NoDataMessage message="First message" />);
    expect(screen.getByText("First message")).toBeInTheDocument();

    rerender(<NoDataMessage message="Second message" />);
    expect(screen.getByText("Second message")).toBeInTheDocument();
  });

  it("renders inside a div container", () => {
    const { container } = render(<NoDataMessage message="Test" />);
    expect(container.querySelector("div")).toBeInTheDocument();
  });
});
