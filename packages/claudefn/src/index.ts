// ─── Core ───────────────────────────────────────────────────
export { claudefn, sendFeedback } from "./claudefn.js";
export type { SendFeedbackOptions } from "./claudefn.js";
export { extractJson, resolvePrompt } from "./utils.js";

// ─── Compose ────────────────────────────────────────────────
export {
  compose,
  parseToolCalls,
  buildToolPreamble,
  buildCodePreamble,
  extractCode,
  executeCode,
} from "./compose.js";

// ─── Queue ──────────────────────────────────────────────────
export {
  GlobalQueue,
  getDefaultQueue,
  setDefaultQueue,
} from "./queue.js";
export type { GlobalQueueOptions } from "./queue.js";

// ─── Types ──────────────────────────────────────────────────
export type {
  // Execution
  ExecutionMode,
  PromptInput,
  // Hooks
  ClaudeFnHooks,
  ComposeHooks,
  // claudefn
  ClaudeFnOptions,
  ClaudeFnResult,
  ClaudeFn,
  // compose
  ToolDef,
  ComposeOptions,
} from "./types.js";
