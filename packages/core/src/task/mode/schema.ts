/**
 * RFC 0045 — Modes as internal, auto-inferred properties.
 *
 * `mode:` is no longer declared in frontmatter. Task behavior is derived
 * after execution by inspecting artifacts:
 *
 *   - spawn.plan.jsonl exists → spawner (apply children)
 *   - converge: config present → converger (wave loop)
 *   - body empty (no skill, no bash) → gateway (immediate done)
 *   - otherwise → leaf (check outputs, done)
 *
 * `spawn:` and `converge:` blocks are kept as optional config — they are
 * still validated at parse time even without mode declarations.
 *
 * This module owns the parse-time contract for spawn/converge blocks.
 * Post-body invariants live in mode/validator.ts and mode/converger.ts.
 */
import { z } from "zod";

/**
 * @deprecated Mode is no longer declared — derived at runtime from artifacts.
 * TaskModeSchema kept for internal classification; may be removed in future.
 */
export const TaskModeSchema = z.enum(["leaf", "spawner", "converger", "gateway"]);
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
 * @deprecated Mode no longer part of the frontmatter contract — derived at runtime.
 */
export interface ParsedModeFrontmatter {
  spawn: SpawnerConfig | undefined;
  converge: ConvergerConfig | undefined;
}

export interface ModeParseResult {
  ok: boolean;
  parsed?: ParsedModeFrontmatter;
  error?: string;
}

export interface RawModeInput {
  spawn?: unknown;
  converge?: unknown;
  outputs?: unknown;
  [key: string]: unknown;
}

/**
 * Parse spawn:/converge: blocks as optional config.
 * No mode: declaration — mode is derived at runtime from artifacts.
 */
export function parseTaskModeFrontmatter(
  raw: RawModeInput,
): ModeParseResult {
  let spawn: SpawnerConfig | undefined;
  if (raw.spawn !== undefined && raw.spawn !== null) {
    const r = SpawnerConfigSchema.safeParse(raw.spawn);
    if (!r.success) {
      return { ok: false, error: `spawn: ${describeZodIssue(r.error.issues[0])}` };
    }
    spawn = r.data;
    // Validate spawn bounds
    if (spawn.min_children > spawn.max_children) {
      return {
        ok: false,
        error: `spawn: min_children (${spawn.min_children}) must not exceed max_children (${spawn.max_children}).`,
      };
    }
  }

  let converge: ConvergerConfig | undefined;
  if (raw.converge !== undefined && raw.converge !== null) {
    const r = ConvergerConfigSchema.safeParse(raw.converge);
    if (!r.success) {
      return { ok: false, error: `converge: ${describeZodIssue(r.error.issues[0])}` };
    }
    converge = r.data;
  }

  return { ok: true, parsed: { spawn, converge } };
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
