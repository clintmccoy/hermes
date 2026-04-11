import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      exclude: [
        "node_modules/",
        "src/test/",
        "src/app/",
        "src/components/",
        "src/lib/supabase/", // infrastructure glue — tested via integration, not unit tests
        "**/*.d.ts",
        "*.config.*",
      ],
      // Enforce 80% coverage on the calculation engine.
      // UI components are excluded above — they get E2E coverage later.
      thresholds: {
        "src/lib/**": {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
