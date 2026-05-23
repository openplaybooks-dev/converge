import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

const PACKAGES = resolve(__dirname, "..");

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "@openplaybooks/acpfn",
        replacement: resolve(PACKAGES, "acpfn/src/index.ts"),
      },
      {
        find: "@openplaybooks/agentfn",
        replacement: resolve(PACKAGES, "agentfn/src/index.ts"),
      },
      {
        find: "@openplaybooks/converge-core/task/playbook",
        replacement: resolve(PACKAGES, "core/src/task/playbook/index.ts"),
      },
      {
        find: "@openplaybooks/converge-core/task/review",
        replacement: resolve(PACKAGES, "core/src/task/review.ts"),
      },
      {
        find: "@openplaybooks/converge-core/playbook",
        replacement: resolve(PACKAGES, "core/src/playbook.ts"),
      },
      {
        find: "@openplaybooks/converge-core/config",
        replacement: resolve(PACKAGES, "core/src/config/index.ts"),
      },
      {
        find: /^@openplaybooks\/converge-core$/,
        replacement: resolve(PACKAGES, "core/src/index.ts"),
      },
      {
        find: "@openplaybooks/claudefn",
        replacement: resolve(PACKAGES, "claudefn/src/index.ts"),
      },
      {
        find: "@openplaybooks/geminifn",
        replacement: resolve(PACKAGES, "geminifn/src/index.ts"),
      },
      {
        find: "@openplaybooks/kimifn",
        replacement: resolve(PACKAGES, "kimifn/src/index.ts"),
      },
      {
        find: "@openplaybooks/openfn",
        replacement: resolve(PACKAGES, "openfn/src/index.ts"),
      },
      {
        find: "@openplaybooks/qwenfn",
        replacement: resolve(PACKAGES, "qwenfn/src/index.ts"),
      },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
