/**
 * RFC 0022 — Task mode contract.
 *
 * `mode:` is a typed enum that declares what a task body is allowed to do
 * and what artefacts must exist after it runs. The runtime enforces the
 * contract; violations surface as structured errors the repair loop can
 * address.
 *
 * Four modes, deliberate cap (anti-goal: don't add more):
 *
 *   - leaf      — produce outputs, no children
 *   - spawner   — one-shot fan-out from a manifest
 *   - converger — multi-wave loop until a halt condition
 *   - gateway   — synchronisation point; no body, no outputs
 *
 * This module owns the **parse-time** contract: the wire shape and the
 * cross-field rules. Post-body invariants (manifest exists, row count in
 * range, wave count bounded) live in `mode/validator.ts` and `mode/converger.ts`
 * — they read the parsed shape but can assume it is well-formed.
 */
import { z } from "zod";

/** The four task modes — every other shape is a runtime error. */
export const TaskModeSchema = z.enum([
  "leaf",
  "spawner",
  "converger",
  "gateway",
]);

export type TaskMode = z.infer<typeof TaskModeSchema>;

/**
 * Shape of a check entry as it appears in TASK.md frontmatter. Mirrors
 * the loose `CheckDef` interface in lifecycle/after.ts but uses a zod
 * schema so converger halt_when / wave_check round-trip with the same
 * validation as the rest of the mode block.
 *
 * The runtime check executor (lifecycle/after.ts) is the source of truth
 * for *how* a check runs; this schema is the source of truth for *what*
 * a check looks like as data.
 */
export const ModeCheckSchema = z
  .object({
    id: z.string().min(1),
    cmd: z.string().min(1).optional(),
    description: z.string().optional(),
    type: z.enum(["cmd", "ai", "test"]).optional(),
    check: z.string().optional(),
    name: z.string().optional(),
    args: z.record(z.string(), z.string()).optional(),
    agent: z.string().optional(),
    model: z.string().optional(),
    timeoutMs: z.number().int().min(1).optional(),
  })
  .strict();

export type ModeCheck = z.infer<typeof ModeCheckSchema>;

/**
 * `spawn:` block — only meaningful on `mode: spawner`.
 *
 *   - template:     default template name for rows that omit it.
 *   - min/max_children: bounds enforced post-body. `min: 0` allows
 *                       intentionally-empty spawners (escape hatch);
 *                       authoring tools should default to `min: 1`.
 *   - apply:        "auto" (framework runs `converge apply` after the
 *                   body) is the documented norm. "manual" is the escape
 *                   hatch for bodies that need to inspect the result
 *                   file mid-run and spawn more in the same wave.
 */
export const SpawnerConfigSchema = z
  .object({
    template: z.string().min(1).optional(),
    min_children: z.number().int().min(0).default(0),
    max_children: z.number().int().min(1).default(1000),
    apply: z.enum(["auto", "manual"]).default("auto"),
  })
  .strict();

export type SpawnerConfig = z.infer<typeof SpawnerConfigSchema>;

/**
 * `converge:` block — only meaningful on `mode: converger`.
 *
 * Halt signals (priority order, see mode/converger.ts):
 *   1. halt.marker file under exec dir
 *   2. every check in halt_when passes
 *   3. wave_check exits 0
 *   4. wave_check exits 2 (give up — failure)
 *   5. wave_check exits 1 (continue — next wave)
 *
 * `max_waves` is the structural backstop: even with no halt signal the
 * wave loop terminates with `errorCode: "converger-max-waves"` rather
 * than re-leasing in a hot loop forever (RFC 0020's 9000-attempt bug).
 */
export const ConvergerConfigSchema = z
  .object({
    max_waves: z.number().int().min(1).default(10),
    halt_when: z.array(ModeCheckSchema).optional(),
    wave_check: ModeCheckSchema.optional(),
  })
  .strict();

export type ConvergerConfig = z.infer<typeof ConvergerConfigSchema>;

/**
 * The mode-relevant slice of TASK.md frontmatter, post-parse. Other
 * frontmatter fields (id, depends_on, vars, ...) are owned by
 * task-md-definition.ts; we read just enough to validate the mode
 * contract.
 */
export interface ParsedModeFrontmatter {
  mode: TaskMode | undefined;
  spawn: SpawnerConfig | undefined;
  converge: ConvergerConfig | undefined;
}

export interface ModeParseResult {
  ok: boolean;
  parsed?: ParsedModeFrontmatter;
  /** Human-readable cross-field violation. Includes the mode name and
   *  the conflicting field so the repair-loop hint is addressable. */
  error?: string;
}

/**
 * The slice of frontmatter relevant to mode validation. Caller may pass
 * the entire parsed YAML object — only these keys are consulted.
 */
export interface RawModeInput {
  mode?: unknown;
  spawn?: unknown;
  converge?: unknown;
  outputs?: unknown;
  depends_on?: unknown;
  [key: string]: unknown;
}

/**
 * Parse + cross-field validate the mode block.
 *
 * Returns `{ ok: true, parsed }` when the shape is valid (including the
 * "no mode declared" case — caller infers).
 * Returns `{ ok: false, error }` with a one-line, addressable message
 * when a cross-field rule fires.
 *
 * Body content is required for the gateway "no body" rule; leaf and
 * spawner ignore it. Callers without a body to pass should omit it.
 */
export function parseTaskModeFrontmatter(
  raw: RawModeInput,
  body?: string,
): ModeParseResult {
  // 1. Mode itself. Absence is legal — caller infers via inferMode().
  let mode: TaskMode | undefined;
  if (raw.mode !== undefined && raw.mode !== null) {
    const modeResult = TaskModeSchema.safeParse(raw.mode);
    if (!modeResult.success) {
      return {
        ok: false,
        error: `mode: must be one of leaf | spawner | converger | gateway (got ${JSON.stringify(raw.mode)})`,
      };
    }
    mode = modeResult.data;
  }

  // 2. spawn: block. Always parse if present; cross-field rules below
  //    decide whether its presence is legal for the chosen mode.
  let spawn: SpawnerConfig | undefined;
  if (raw.spawn !== undefined && raw.spawn !== null) {
    const r = SpawnerConfigSchema.safeParse(raw.spawn);
    if (!r.success) {
      return {
        ok: false,
        error: `spawn: ${describeZodIssue(r.error.issues[0])}`,
      };
    }
    spawn = r.data;
  }

  // 3. converge: block. Same logic.
  let converge: ConvergerConfig | undefined;
  if (raw.converge !== undefined && raw.converge !== null) {
    const r = ConvergerConfigSchema.safeParse(raw.converge);
    if (!r.success) {
      return {
        ok: false,
        error: `converge: ${describeZodIssue(r.error.issues[0])}`,
      };
    }
    converge = r.data;
  }

  // 4. Cross-field rules per mode. Each rule has a single addressable
  //    error message: "mode: <m> declared but <field>" — repair-loop
  //    hints are derived from this string.
  if (mode === "leaf") {
    if (spawn) {
      return {
        ok: false,
        error:
          "mode: leaf declared but spawn: block is present. leaf tasks must not spawn; either remove spawn: or change mode: to spawner.",
      };
    }
    if (converge) {
      return {
        ok: false,
        error:
          "mode: leaf declared but converge: block is present. leaf tasks are one-shot; either remove converge: or change mode: to converger.",
      };
    }
  }

  if (mode === "spawner") {
    if (converge) {
      return {
        ok: false,
        error:
          "mode: spawner declared with converge: block. Spawners are one-shot fan-outs; for multi-wave loops change mode: to converger.",
      };
    }
    // Fill in default spawn: block when absent so downstream consumers
    // (post-body validator, executor auto-apply) can rely on it.
    if (!spawn) spawn = SpawnerConfigSchema.parse({});
    if (spawn.min_children > spawn.max_children) {
      return {
        ok: false,
        error: `spawn: min_children (${spawn.min_children}) must not exceed max_children (${spawn.max_children}).`,
      };
    }
  }

  if (mode === "converger") {
    if (spawn) {
      return {
        ok: false,
        error:
          "mode: converger declared with spawn: block. Converger wave manifests live in $CONVERGE_TASK_DIR/spawn.plan.jsonl per wave; the spawn: block belongs to mode: spawner.",
      };
    }
    if (!converge) {
      return {
        ok: false,
        error:
          "mode: converger declared without a converge: block. Add `converge: { max_waves: N, halt_when: [...] }` or `wave_check: { ... }`.",
      };
    }
    const hasHaltWhen =
      Array.isArray(converge.halt_when) && converge.halt_when.length > 0;
    const hasWaveCheck = converge.wave_check !== undefined;
    if (!hasHaltWhen && !hasWaveCheck) {
      return {
        ok: false,
        error:
          "mode: converger requires at least one halt signal — halt_when: [...] (every check passes ⇒ halt) or wave_check: (cmd, exit 0 ⇒ halt).",
      };
    }
  }

  if (mode === "gateway") {
    if (spawn || converge) {
      return {
        ok: false,
        error:
          "mode: gateway is a sync point — no spawn:, no converge:. Remove these blocks or change mode:.",
      };
    }
    const outputs = raw.outputs;
    if (Array.isArray(outputs) && outputs.length > 0) {
      return {
        ok: false,
        error:
          "mode: gateway declared with outputs:. Gateways have no own outputs — they exist to gate downstream tasks on depends_on:.",
      };
    }
    if (body !== undefined && body.trim().length > 0) {
      return {
        ok: false,
        error:
          "mode: gateway declared with a non-empty body. Gateways have no body; the TASK.md body must be empty or whitespace.",
      };
    }
  }

  return {
    ok: true,
    parsed: { mode, spawn, converge },
  };
}

/**
 * Render a zod issue into a short, human-readable suffix.
 *
 * Kept narrow: we want addressable error messages, not stack traces.
 * The full zod issues array is available to callers that want it.
 */
function describeZodIssue(issue: z.ZodIssue | undefined): string {
  if (!issue) return "schema validation failed";
  const path = issue.path?.join(".") ?? "";
  if (issue.code === "unrecognized_keys") {
    const keys = (issue as { keys?: string[] }).keys?.join(", ") ?? "";
    return `unknown field(s): ${keys}`;
  }
  return `${issue.message}${path ? ` (at "${path}")` : ""}`;
}
