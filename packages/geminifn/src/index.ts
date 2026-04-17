// ─── Core ───────────────────────────────────────────────────
export { geminifn } from "./geminifn.js";
export { extractJson, resolvePrompt } from "./utils.js";

// ─── Skills ─────────────────────────────────────────────────
// Note: enhancePrompt, listSkills, listAgents moved to agentfn to break circular dependency

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
  // Prompt
  PromptInput,
  // Hooks
  GeminiFnHooks,
  ComposeHooks,
  // geminifn
  GeminiFnOptions,
  GeminiFnResult,
  GeminiFn,
  // compose
  ToolDef,
  ComposeOptions,
} from "./types.js";
