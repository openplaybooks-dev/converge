/**
 * AI Context Layer
 *
 * Exports AI utilities for repair strategies.
 */

// Legacy context API (kept for backward compatibility)
export { AIContext, AIResponse, createAIContext } from "./context.ts";

// New factory-based AI API
export {
  createAIFactory,
  createProjectAI,
  createDefaultAI,
  resolveAIConfig,
  listAIProviders,
  type AICaller,
  type ResolvedAIConfig,
  type AIProvider,
} from "./factory.ts";
