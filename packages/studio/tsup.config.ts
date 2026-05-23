import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
  },
  format: ["esm"],
  dts: false,
  sourcemap: false,
  clean: true,
  splitting: false,
  treeshake: true,
  minify: false,
  target: "node18",
  shims: true,
  external: [
    "yaml",
    "@openplaybooks/converge-core",
    "@openplaybooks/converge-core/playbook",
    "@openplaybooks/converge-core/task/playbook",
  ],
});
