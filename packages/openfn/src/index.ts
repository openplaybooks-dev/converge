// ─── Core ───────────────────────────────────────────────────
export { openfn, sendFeedback } from "./openfn.js";
export type { SendFeedbackOptions } from "./openfn.js";
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
export { GlobalQueue, getDefaultQueue, setDefaultQueue } from "./queue.js";
export type { GlobalQueueOptions } from "./queue.js";

// ─── Types ──────────────────────────────────────────────────
export type {
  // Execution
  ExecutionMode,
  PromptInput,
  // Hooks
  OpenFnHooks,
  ComposeHooks,
  // openfn
  OpenFnOptions,
  OpenFnResult,
  OpenFn,
  // compose
  ToolDef,
  ComposeOptions,
} from "./types.js";
