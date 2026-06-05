import path from "path";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    exclude: [...configDefaults.exclude, "e2e/**", "playwright.config.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});