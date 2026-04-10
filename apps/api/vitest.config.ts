import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@dal": path.resolve(__dirname, "src/dal"),
      "@services": path.resolve(__dirname, "src/services"),
      "@middleware": path.resolve(__dirname, "src/middleware"),
      "@config": path.resolve(__dirname, "src/config"),
    },
  },
});
