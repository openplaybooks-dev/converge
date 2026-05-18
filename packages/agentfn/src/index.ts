// ─── Core ───────────────────────────────────────────────────
export { agentfn } from "./agentfn.js";

// ─── Feedback ───────────────────────────────────────────────
export {
  agentSendFeedback,
  TASK_COMPLETION_PROMPT,
  parseTaskReport,
  formatReportAsMarkdown,
} from "./feedback.js";
export type { AgentFeedbackOptions, TaskCompletionReport } from "./feedback.js";

// ─── Compose ────────────────────────────────────────────────
export { compose } from "./compose.js";

// ─── Agent (Claude only) ───────────────────────────────────
export { agent } from "./agent.js";
export type { UnifiedAgentOptions, AgentFn as AgentAgentFn } from "./agent.js";

// ─── Provider ───────────────────────────────────────────────
export { getDefaultProvider, setDefaultProvider } from "./provider.js";

// ─── Prompting (legacy — deprecated) ────────────────────────
export { enhancePrompt, listSkills, listAgents } from "./prompting.js";
export type { EnhancePromptOptions } from "./prompting.js";

// ─── Skills ─────────────────────────────────────────────────
export {
  // New parameterized API
  discoverSkills,
  loadSkill,
  loadSkillFromRoots,
  parseFrontmatter,
  stripFrontmatter,
  ensureSkillSymlinks,
  cleanupSkillSymlinks,
  // Agent utilities
  discoverAgents,
  // Metadata loaders
  getSkillPath,
  getSkillMeta,
  getAgentPath,
  getAgentMeta,
} from "./skills.js";
export type { SkillInfo, SkillContent, SymlinkOptions } from "./skills.js";

// ─── Utilities (re-exported from acpfn) ─────────────────────
export {
  parseToolCalls as acpParseToolCalls,
  buildToolPreamble as acpBuildToolPreamble,
  buildCodePreamble as acpBuildCodePreamble,
  extractCode as acpExtractCode,
  executeCode as acpExecuteCode,
} from "@openplaybooks/acpfn";

// ─── Types ──────────────────────────────────────────────────
export type {
  // Provider
  Provider,
  // Unified
  AgentFnHooks,
  AgentFnResult,
  AgentFn,
  AgentFnOptions,
  ToolDef,
  ComposeHooks,
  ComposeOptions,
  // Shared
  PromptInput,
  ExecutionMode,
  Backend,
  PermissionMode,
  // Session / Stream (Claude only — deprecated)
  SessionEvent,
  Session,
  StreamCallOptions,
  StreamFn,
  // Agent (Claude only — deprecated)
  AgentResult,
  AgentHooks,
  ClaudeAgentOptions,
  // Claude-specific
  McpServerConfig,
  AgentDefinition,
  ClaudeFnOptions,
  ClaudeFnResult,
  ClaudeFn,
  // Kimi-specific
  KimiFnOptions,
  KimiFnResult,
  KimiFn,
  // Qwen-specific
  QwenFnOptions,
  QwenFnResult,
  QwenFn,
  // Gemini-specific
  GeminiFnOptions,
  GeminiFnResult,
  GeminiFn,
  // ACP-specific
  AcpFnOptions,
  AcpFnResult,
  AcpFn,
  // Openfn-specific
  OpenFnOptions,
  OpenFnResult,
  OpenFn,
  // Queue
  GlobalQueueOptions,
} from "./types.js";
