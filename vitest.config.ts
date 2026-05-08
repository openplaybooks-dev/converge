import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

const PACKAGES = resolve(__dirname, "packages");

export default defineConfig({
  resolve: {
    alias: {
      "@converge/codexfn": resolve(PACKAGES, "codexfn/src/index.ts"),
      "@converge/claudefn": resolve(PACKAGES, "claudefn/src/index.ts"),
      "@converge/agentfn": resolve(PACKAGES, "agentfn/src/index.ts"),
      "@converge/core": resolve(PACKAGES, "core/src/index.ts"),
      "@converge/kimifn": resolve(PACKAGES, "kimifn/src/index.ts"),
      "@converge/qwenfn": resolve(PACKAGES, "qwenfn/src/index.ts"),
      "@converge/geminifn": resolve(PACKAGES, "geminifn/src/index.ts"),
      "@converge/openfn": resolve(PACKAGES, "openfn/src/index.ts"),
      "@converge/acpfn": resolve(PACKAGES, "acpfn/src/index.ts"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    globals: true,
    testTimeout: 10_000,
    fileParallelism: false,
  },
});
