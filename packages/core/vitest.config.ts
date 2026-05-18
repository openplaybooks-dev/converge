import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "agentfn/skills": resolve(__dirname, "../agentfn/src/skills.ts"),
      agentfn: resolve(__dirname, "../agentfn/src/index.ts"),
      "@openplaybooks/claudefn": resolve(__dirname, "../claudefn/src/index.ts"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    globals: true,
    testTimeout: 30_000,
  },
});
