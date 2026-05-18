import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      claudefn: resolve(__dirname, "../claudefn/src/index.ts"),
      kimifn: resolve(__dirname, "../kimifn/src/index.ts"),
      qwenfn: resolve(__dirname, "../qwenfn/src/index.ts"),
      geminifn: resolve(__dirname, "../geminifn/src/index.ts"),
      "@openplaybooks/claudefn": resolve(__dirname, "../claudefn/src/index.ts"),
      "@openplaybooks/kimifn": resolve(__dirname, "../kimifn/src/index.ts"),
      "@openplaybooks/qwenfn": resolve(__dirname, "../qwenfn/src/index.ts"),
      "@openplaybooks/geminifn": resolve(__dirname, "../geminifn/src/index.ts"),
      "@openplaybooks/openfn": resolve(__dirname, "../openfn/src/index.ts"),
      "@openplaybooks/acpfn": resolve(__dirname, "../acpfn/src/index.ts"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    globals: true,
    testTimeout: 10_000,
  },
});
