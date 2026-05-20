import { defineConfig } from "tsup";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  entry: {
    index: "src/index.ts",
    client: "src/client/index.ts",
    "studio-api": "src/studio-api.ts",
    run: "src/run/index.ts",
    plan: "src/plan.ts",
    playbook: "src/playbook.ts",
    planner: "src/playbooks/planner/index.ts",
    agents: "src/agents/index.ts",
    checkpoint: "src/checkpoint/index.ts",
    config: "src/config/index.ts",
    dag: "src/dag/index.ts",
    hash: "src/hash/index.ts",
    hooks: "src/hooks/index.ts",
    journal: "src/journal/index.ts",
    manifest: "src/manifest/index.ts",
    metrics: "src/metrics/index.ts",
    navigator: "src/navigator/index.ts",
    select: "src/select/index.ts",
    storage: "src/storage/index.ts",
    "task/playbook": "src/task/playbook/index.ts",
    "task/goal": "src/task/goal/index.ts",
    "task/unit": "src/task/unit/index.ts",
    "task/gap": "src/task/gap/index.ts",
    "task/discovery": "src/task/discovery/index.ts",
    "task/facts": "src/task/facts/index.ts",
    "task/spawn": "src/task/spawn/index.ts",
    validation: "src/validation/index.ts",
  },
  format: ["esm"],
  dts: true,
  sourcemap: false,
  clean: true,
  splitting: false,
  treeshake: true,
  minify: false,
  target: "node18",
  shims: true,
  // Bundle workspace dependencies
  noExternal: [/@openplaybooks\/.*/],
  external: ["glob", "yaml", "tsx", /^tsx\/.*/],
  esbuildOptions(options) {
    // Add path aliases for workspace packages
    options.alias = {
      "@openplaybooks/agentfn": path.resolve(__dirname, "../agentfn/src/index.ts"),
      "@openplaybooks/agentfn/skills": path.resolve(
        __dirname,
        "../agentfn/src/skills.ts",
      ),
      "@openplaybooks/claudefn": path.resolve(
        __dirname,
        "../claudefn/src/index.ts",
      ),
      "@openplaybooks/kimifn": path.resolve(__dirname, "../kimifn/src/index.ts"),
      "@openplaybooks/qwenfn": path.resolve(__dirname, "../qwenfn/src/index.ts"),
      "@openplaybooks/geminifn": path.resolve(
        __dirname,
        "../geminifn/src/index.ts",
      ),
      "@openplaybooks/codets": path.resolve(__dirname, "../codets/src/index.ts"),
    };
  },
});
