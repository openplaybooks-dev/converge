import type { Provider } from "./types.js";
import type { AgentFn, AgentFnOptions } from "./types.js";

let _defaultProvider: Provider = "claude";

/** Get the current default provider */
export function getDefaultProvider(): Provider {
  return _defaultProvider;
}

/** Set the default provider used when no provider is specified */
export function setDefaultProvider(provider: Provider): void {
  _defaultProvider = provider;
}

// ─── Provider Registry ─────────────────────────────────────────

type AnyAgentFn = AgentFn<unknown>;
type AnyFactory = (opts: AgentFnOptions<unknown>) => Promise<AnyAgentFn>;

const _providerRegistry = new Map<Provider, AnyFactory>();

/**
 * Register a provider factory. Used by plugin `registerProviders(registry)` hooks
 * and by built-in provider init.
 */
export function registerProvider(
  name: Provider,
  factory: (opts: AgentFnOptions<unknown>) => Promise<AgentFn<unknown>>,
): void {
  _providerRegistry.set(name, factory);
}

/**
 * Look up a registered provider factory. Returns undefined if not found.
 * Cast to the appropriate type at call site.
 */
export function getProvider(
  name: Provider,
): ((opts: AgentFnOptions<unknown>) => Promise<AgentFn<unknown>>) | undefined {
  return _providerRegistry.get(name);
}