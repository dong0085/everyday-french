import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: { include: ["tests/unit/**/*.test.ts"], environment: "node" },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // "server-only" throws outside Next's server build; tests run on the server anyway.
      "server-only": fileURLToPath(new URL("./tests/unit/empty.ts", import.meta.url)),
    },
  },
});
