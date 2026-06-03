/**
 * @openplaybooks/converge-tbench — Terminal-bench runner for Converge
 *
 * Evaluate AI agents against ~100+ real-world terminal tasks
 * (sysadmin, code compilation, ML training, data processing)
 * in sandboxed Docker containers.
 */

/* ── Dataset ─────────────────────────────────────────────────────── */

export type { TBenchTask } from "./dataset/types.ts";
export { loadTasks } from "./dataset/loader.ts";
export { filterTasks, type FilterOptions } from "./dataset/filter.ts";

/* ── Docker ──────────────────────────────────────────────────────── */

export { DockerContainer } from "./docker/container.ts";
export {
  buildTaskImage,
  startTaskContainer,
  runTaskTests,
} from "./docker/task-container.ts";

/* ── Executor ────────────────────────────────────────────────────── */

export { tbenchExecutor } from "./executor/tbench-executor.ts";
export { buildAgentPrompt, proxyExec } from "./executor/agent-harness.ts";

/* ── Metrics ─────────────────────────────────────────────────────── */

export type {
  TBenchResult,
  TaskResult,
  CategoryBreakdown,
} from "./metrics/types.ts";
export {
  collectTBenchMetrics,
  formatReport,
} from "./metrics/tbench-metrics.ts";

/* ── Seed ─────────────────────────────────────────────────────────── */

export { taskSpawner } from "./seed/task-spawner.ts";

/* ── CLI ─────────────────────────────────────────────────────────── */

export {
  tbenchCommand,
  type TBenchCommandOptions,
} from "./cli/tbench-command.ts";
