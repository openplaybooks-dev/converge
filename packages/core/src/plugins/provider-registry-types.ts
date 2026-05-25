/* ------------------------------------------------------------------ */
/*  Provider Registry                                                 */
/* ------------------------------------------------------------------ */

/**
 * A no-op stub for the ProviderRegistry interface.
 * The real registry lives in packages/agentfn/src/provider-registry.ts.
 * We declare the interface here so packages/core/src/plugins/types.ts doesn't
 * need a cross-package import (tsup can't resolve ../../agentfn paths during bundling).
 *
 * Actual implementation: loadPluginsV2() in loader.ts passes the agentfn
 * registry instance to each plugin's registerProviders(registry) hook.
 */
export interface ProviderRegistry {
  register(
    name: string,
    factory: (opts: Record<string, unknown>) => Promise<unknown>,
  ): void;
  get(
    name: string,
  ): ((opts: Record<string, unknown>) => Promise<unknown>) | undefined;
}

/**
 * Provider name — currently just strings but typed for future safety.
 * In practice, these are: "claude" | "kimi" | "qwen" | "gemini" | "acp" |
 * "openfn" | "codex" | "deepcode" | "stub"
 */
export type Provider = string;