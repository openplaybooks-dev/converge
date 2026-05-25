import type { PluginStateV2 } from "../../../src/plugins/types.ts";

export function makeEmptyState(): PluginStateV2 {
  return {
    checks: new Map(),
    evals: new Map(),
    plans: new Map(),
    tasks: new Map(),
    vars: {},
    hooks: new Map(),
    tools: new Map(),
    providers: new Map(),
    interceptors: new Map(),
    checkTypes: new Map(),
    skillSources: [],
    journalConsumers: [],
    commands: new Map(),
    loaded: [],
    manifests: [],
  };
}
