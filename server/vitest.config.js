import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.js"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["app.js", "Schema/**/*.js"],
      exclude: ["server.js", "node_modules/**", "tests/**"],
    },
    // Run test files sequentially — all share one in-memory MongoDB instance
    fileParallelism: false,
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
  },
});
