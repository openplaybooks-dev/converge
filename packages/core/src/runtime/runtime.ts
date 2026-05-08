/**
 * Runtime stub — superseded by run.ts (single-target DAG execution).
 *
 * The old Runtime/RuntimeImpl with its checkpoint/resume methods has been
 * replaced by `run(playbook, opts)` in `../run.ts`. This file exists only
 * to satisfy legacy imports from builders.ts.
 */

import type { Runtime } from "./types.js";

/** @deprecated Use `run(playbook, opts)` from `../run.ts` instead. */
export function createRuntime(
  _config: unknown,
  _epics: unknown,
  _workspaceDir: string,
): Runtime {
  return {
    tasks: undefined as any,
    project: undefined as any,
    run: async () => {
      throw new Error(
        "Legacy Runtime.run() is removed. Use `run(playbook, opts)` from @converge/core instead.",
      );
    },
    checkpoint: async () => {
      throw new Error("Legacy Runtime.checkpoint() is removed.");
    },
    resume: async () => {
      throw new Error("Legacy Runtime.resume() is removed.");
    },
  };
}
