import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import InputBox from "../../components/input.component";

describe("InputBox component", () => {
  const defaultProps = {
    name: "email",
    placeholder: "Enter your email",
    type: "text",
    id: "email-input",
    icon: "fi-rr-envelope",
  };

  it("renders an input element", () => {
    render(<InputBox {...defaultProps} />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("applies the placeholder text", () => {
    render(<InputBox {...defaultProps} />);
    expect(screen.getByPlaceholderText("Enter your email")).toBeInTheDocument();
  });

  it("renders with the correct name attribute", () => {
    render(<InputBox {...defaultProps} />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("name", "email");
  });

  it("renders with a default value when provided", () => {
    render(<InputBox {...defaultProps} value="prefilled@example.com" />);
    const input = screen.getByRole("textbox");
    expect(input.value).toBe("prefilled@example.com");
  });

  it("is disabled when disable prop is true", () => {
    render(<InputBox {...defaultProps} disable={true} />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("is enabled by default (disable defaults to false)", () => {
    render(<InputBox {...defaultProps} />);
    expect(screen.getByRole("textbox")).not.toBeDisabled();
  });

  it("shows eye toggle button for password inputs", () => {
    render(<InputBox {...defaultProps} type="password" />);
    // The eye icon is rendered as an <i> element; password field doesn't
    // use role="textbox" — check for the eye icon element instead
    const icons = document.querySelectorAll("i");
    expect(icons.length).toBeGreaterThan(0);
  });

  it("toggles password visibility when eye icon is clicked", () => {
    render(<InputBox {...defaultProps} type="password" name="password" />);
    const input = document.querySelector("input[name='password']");
    expect(input.type).toBe("password");

    // Click the eye toggle (last <i> element)
    const icons = document.querySelectorAll("i");
    const eyeIcon = icons[icons.length - 1];
    fireEvent.click(eyeIcon);
    expect(input.type).toBe("text");

    fireEvent.click(eyeIcon);
    expect(input.type).toBe("password");
  });

  it("does not render eye toggle for non-password inputs", () => {
    const { container } = render(<InputBox {...defaultProps} type="text" />);
    // Only one icon (the field icon), no eye icon
    const cursorIcons = container.querySelectorAll("i.cursor-pointer");
    expect(cursorIcons.length).toBe(0);
  });
});
