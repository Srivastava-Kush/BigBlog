import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Loader from "../../components/loader.component";

describe("Loader component", () => {
  it("renders without crashing", () => {
    const { container } = render(<Loader />);
    expect(container.firstChild).toBeTruthy();
  });

  it("contains an SVG element for the spinner", () => {
    const { container } = render(<Loader />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("applies the animate-spin CSS class to the SVG", () => {
    const { container } = render(<Loader />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("animate-spin");
  });

  it("wraps the spinner in a container div", () => {
    const { container } = render(<Loader />);
    const wrapper = container.querySelector("div");
    expect(wrapper).toBeInTheDocument();
  });
});
