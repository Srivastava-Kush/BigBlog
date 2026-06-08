/**
 * Frontend test setup — loaded by Vitest before each test file.
 *
 * Sets up @testing-library/jest-dom matchers and provides lightweight
 * mocks for modules that depend on browser APIs or network calls.
 */

import "@testing-library/jest-dom";
import { vi } from "vitest";
import React from "react";

// ── React Router mock ─────────────────────────────────────────────────────────
// Many components call useNavigate / useParams / Link.  We provide stubs so
// components can be rendered in isolation without a full Router tree.

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ blog_id: "test-blog-id", query: "test-query", id: "test-user" }),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

// ── Framer Motion mock ────────────────────────────────────────────────────────
// Replace animated elements with plain divs so tests don't depend on the
// animation engine or requestAnimationFrame.

vi.mock("framer-motion", () => ({
  motion: new Proxy(
    {},
    {
      get: (_, tag) =>
        ({ children, ...props }) =>
          React.createElement(tag, props, children),
    },
  ),
  AnimatePresence: ({ children }) => children,
}));

// ── Axios mock ────────────────────────────────────────────────────────────────

vi.mock("axios", () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

// ── Firebase mock ─────────────────────────────────────────────────────────────

vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
}));

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(),
  GoogleAuthProvider: vi.fn().mockImplementation(() => ({})),
  signInWithPopup: vi.fn(),
}));

// ── react-hot-toast mock ──────────────────────────────────────────────────────

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
  Toaster: () => null,
}));
