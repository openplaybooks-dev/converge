// Default behavior cloner — used when a Behavior doesn't define onClone.
//
// We do a structural shallow copy of the behavior object plus a deep-ish copy
// of its `config` (JSON-clonable bits) so authoring-time settings carry over
// without aliasing. Behaviors that capture object references (Use captures
// another Entity, Mesh captures a Shape) MUST provide onClone — those are
// caught at the call site, this helper is for the simple cases.

import type { Behavior } from './types.js';

function deepCloneJson<T>(v: T): T {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(deepCloneJson) as unknown as T;
  // Plain object — shallow recurse. Skip non-enumerable + symbol keys.
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    out[k] = deepCloneJson(val);
  }
  return out as T;
}

export function structuralCloneBehavior<C>(b: Behavior<C>): Behavior<C> {
  return {
    ...b,
    config: deepCloneJson(b.config),
  };
}
