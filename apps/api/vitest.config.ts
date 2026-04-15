import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/tests/setup.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL:
        "postgresql://aidflow:aidflow_test@localhost:5432/aidflow_test",
      REDIS_URL: "redis://localhost:6379",
      JWT_ACCESS_SECRET: "ci_access_secret_min_32_chars_xxxxxxxxxxxx",
      JWT_REFRESH_SECRET: "ci_refresh_secret_min_32_chars_xxxxxxxxxxx",
      ENCRYPTION_KEY:
        "0000000000000000000000000000000000000000000000000000000000000000",
      CORS_ORIGINS: "http://localhost:5173",
    },
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
