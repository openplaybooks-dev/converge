import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

const PACKAGES = resolve(__dirname, "packages");

export default defineConfig({
  resolve: {
    alias: {
      "@openplaybooks/codexfn": resolve(PACKAGES, "codexfn/src/index.ts"),
      "@openplaybooks/claudefn": resolve(PACKAGES, "claudefn/src/index.ts"),
      "@openplaybooks/agentfn": resolve(PACKAGES, "agentfn/src/index.ts"),
      "@openplaybooks/converge-core": resolve(PACKAGES, "core/src/index.ts"),
      "@openplaybooks/kimifn": resolve(PACKAGES, "kimifn/src/index.ts"),
      "@openplaybooks/qwenfn": resolve(PACKAGES, "qwenfn/src/index.ts"),
      "@openplaybooks/geminifn": resolve(PACKAGES, "geminifn/src/index.ts"),
      "@openplaybooks/openfn": resolve(PACKAGES, "openfn/src/index.ts"),
      "@openplaybooks/acpfn": resolve(PACKAGES, "acpfn/src/index.ts"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    globals: true,
    testTimeout: 10_000,
    fileParallelism: false,
  },
});
