/**
 * @openplaybooks/converge-swebench — SWE-bench runner for Converge
 *
 * Evaluate AI coding agents against SWE-bench Lite (300 instances).
 * Each instance checks out a Python repo, gives an agent the bug report,
 * collects its patch, and validates via the project's test suite.
 */

/* ── Dataset ─────────────────────────────────────────────────────── */

export type { SWEBenchInstance } from "./dataset/types.ts";
export { loadDataset } from "./dataset/loader.ts";
export { filterInstances, type FilterOptions } from "./dataset/filter.ts";

/* ── Docker ──────────────────────────────────────────────────────── */

export { DockerContainer } from "./docker/container.ts";
export { generateDockerfile } from "./docker/dockerfile.ts";
export { ImageCache } from "./docker/image-cache.ts";

/* ── Executor ────────────────────────────────────────────────────── */

export { swebenchExecutor } from "./executor/swebench-executor.ts";
export {
  validatePatch,
  type PatchValidationResult,
} from "./executor/patch-validator.ts";
export { buildAgentPrompt, proxyExec } from "./executor/agent-harness.ts";

/* ── Metrics ─────────────────────────────────────────────────────── */

export type { SWEBenchResult, InstanceResult } from "./metrics/types.ts";
export {
  collectSWEBenchMetrics,
  formatReport,
} from "./metrics/swebench-metrics.ts";

/* ── Seed ─────────────────────────────────────────────────────────── */

export { instanceSpawner } from "./seed/instance-spawner.ts";

/* ── CLI ─────────────────────────────────────────────────────────── */

export {
  swebenchCommand,
  type SWEBenchCommandOptions,
} from "./cli/swebench-command.ts";
