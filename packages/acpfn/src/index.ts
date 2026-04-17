// ─── Core ───────────────────────────────────────────────────
export { acpfn, sendFeedback } from "./acpfn.js";
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
  AcpFnHooks,
  ComposeHooks,
  // acpfn
  AcpFnOptions,
  AcpFnResult,
  AcpFn,
  // compose
  ToolDef,
  ComposeOptions,
  // feedback
  SendFeedbackOptions,
} from "./types.js";
