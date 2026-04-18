/**
 * Journal System
 *
 * Simple journal system for AI self-planning and gap tracking.
 *
 * Hierarchical File Structure:
 * .converge/journal/
 * ├── project/
 * │   ├── gaps.yml
 * │   ├── events.jsonl
 * │   ├── log.log
 * │   └── summary.md
 * ├── epics/
 * │   └── {epic-id}/
 * │       ├── gaps.yml
 * │       ├── events.jsonl
 * │       ├── log.log
 * │       ├── summary.md
 * │       └── tasks/
 * │           └── {task-id}/
 * │               ├── gaps.yml
 * │               ├── events.jsonl
 * │               ├── log.log
 * │               └── summary.md
 * └── README.md
 */

export * from "./types.ts";
export * from "./structure.ts";
export * from "./writer.ts";
export * from "./reader.ts";
export * from "./re-eval.ts";
export * from "./api.ts";
export * from "./summary-writer.ts";
export * from "./navigator.ts";
export * from "./event-writer.ts";
export * from "./console-formatter.ts";
export * from "./log-streamer.ts";
export { ExecutionTraceLogger } from "./execution-trace.ts";
export type {
  TraceEntry,
  TraceAction,
  TraceSummary,
} from "./execution-trace.ts";
