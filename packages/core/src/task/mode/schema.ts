/**
 * Mode + spawn + converge frontmatter contract for TASK.md.
 *
 * `mode:` is optional but, when declared, gates the shape of the rest
 * of the frontmatter (cross-field rules below). `spawn:` and `converge:`
 * are also optional config blocks; their schemas are validated
 * independently of the mode. Post-body invariants live in
 * mode/validator.ts and mode/converger.ts.
 */
import { z } from "zod";

export const TaskModeSchema = z.enum(["task", "spawner", "converger", "gateway"]);
export type TaskMode = z.infer<typeof TaskModeSchema>;

/** Shape of a check entry as it appears in TASK.md frontmatter. The
 *  runtime check executor (lifecycle/after.ts) is the source of truth
 *  for *how* a check runs; this schema is the source of truth for
 *  *what* a check looks like as data. */
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

/** `spawn:` block — only meaningful with `mode: spawner`. */
export const SpawnerConfigSchema = z
  .object({
    template: z.string().min(1).optional(),
    min_children: z.number().int().min(0).default(0),
    max_children: z.number().int().min(1).default(1000),
    apply: z.enum(["auto", "manual"]).default("auto"),
  })
  .strict();

export type SpawnerConfig = z.infer<typeof SpawnerConfigSchema>;

/** `converge:` block — only meaningful with `mode: converger`. */
export const ConvergerConfigSchema = z
  .object({
    max_waves: z.number().int().min(1).default(10),
    halt_when: z.array(ModeCheckSchema).optional(),
    wave_check: ModeCheckSchema.optional(),
  })
  .strict();

export type ConvergerConfig = z.infer<typeof ConvergerConfigSchema>;

export interface ParsedModeFrontmatter {
  /** Declared mode, or undefined if the task didn't declare one. */
  mode: TaskMode | undefined;
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
 * Parse the frontmatter mode + spawn/converge blocks and apply
 * cross-field rules. Each branch returns a structured error so the
 * caller can surface a one-line fix hint at parse time.
 */
export function parseTaskModeFrontmatter(
  raw: RawModeInput,
  body?: string,
): ModeParseResult {
  const mode = parseMode(raw.mode);
  if (mode.kind === "error") return mode.result;

  const spawn = parseSpawn(raw.spawn);
  if (spawn.kind === "error") return spawn.result;

  const converge = parseConverge(raw.converge);
  if (converge.kind === "error") return converge.result;

  const cross = validateCrossField({ mode: mode.value, spawn: spawn.value, converge: converge.value, raw, body });
  if (cross) return { ok: false, error: cross };

  // `mode: spawner` without an explicit spawn: block gets schema
  // defaults (min: 0, max: 1000, apply: "auto") — applies whether the
  // mode was declared or inferred from a spawn: block.
  const finalSpawn =
    mode.value === "spawner" && !spawn.value
      ? SpawnerConfigSchema.parse({})
      : spawn.value;

  return { ok: true, parsed: { mode: mode.value, spawn: finalSpawn, converge: converge.value } };
}

type Parsed<T> = { kind: "ok"; value: T } | { kind: "error"; result: { ok: false; error: string } };

function parseMode(raw: unknown): Parsed<TaskMode | undefined> {
  if (raw === undefined || raw === null) return { kind: "ok", value: undefined };
  const r = TaskModeSchema.safeParse(raw);
  if (!r.success) {
    return { kind: "error", result: { ok: false, error: `mode: ${describeZodIssue(r.error.issues[0])}` } };
  }
  return { kind: "ok", value: r.data };
}

function parseSpawn(raw: unknown): Parsed<SpawnerConfig | undefined> {
  if (raw === undefined || raw === null) return { kind: "ok", value: undefined };
  const r = SpawnerConfigSchema.safeParse(raw);
  if (!r.success) {
    return { kind: "error", result: { ok: false, error: `spawn: ${describeZodIssue(r.error.issues[0])}` } };
  }
  if (r.data.min_children > r.data.max_children) {
    return {
      kind: "error",
      result: {
        ok: false,
        error: `spawn: min_children (${r.data.min_children}) must not exceed max_children (${r.data.max_children}).`,
      },
    };
  }
  return { kind: "ok", value: r.data };
}

function parseConverge(raw: unknown): Parsed<ConvergerConfig | undefined> {
  if (raw === undefined || raw === null) return { kind: "ok", value: undefined };
  const r = ConvergerConfigSchema.safeParse(raw);
  if (!r.success) {
    return { kind: "error", result: { ok: false, error: `converge: ${describeZodIssue(r.error.issues[0])}` } };
  }
  return { kind: "ok", value: r.data };
}

function validateCrossField(args: {
  mode: TaskMode | undefined;
  spawn: SpawnerConfig | undefined;
  converge: ConvergerConfig | undefined;
  raw: RawModeInput;
  body: string | undefined;
}): string | null {
  const { mode, spawn, converge, raw, body } = args;
  switch (mode) {
    case undefined:
      return null;
    case "task":
      if (spawn) return "mode: task must not declare a spawn: block; use mode: spawner.";
      if (converge) return "mode: task must not declare a converge: block; use mode: converger.";
      return null;
    case "spawner":
      if (converge) return "mode: spawner must not declare a converge: block.";
      return null;
    case "converger":
      if (raw.spawn !== undefined) return "mode: converger must not declare a spawn: block.";
      if (!converge) return "mode: converger requires a converge: block with halt_when or wave_check.";
      if (!converge.halt_when?.length && !converge.wave_check) {
        return "mode: converger requires halt_when or wave_check on the converge: block.";
      }
      return null;
    case "gateway":
      if (raw.spawn !== undefined) return "mode: gateway must not declare a spawn: block.";
      if (Array.isArray(raw.outputs) && raw.outputs.length > 0) {
        return "mode: gateway must not declare outputs: — gateways are pure gates.";
      }
      if (typeof body === "string" && body.trim().length > 0) {
        return "mode: gateway must not have body content — gateways are pure gates.";
      }
      return null;
  }
}

/** Render a zod issue into a short, addressable suffix. */
function describeZodIssue(issue: z.ZodIssue | undefined): string {
  if (!issue) return "schema validation failed";
  const path = issue.path?.join(".") ?? "";
  if (issue.code === "unrecognized_keys") {
    const keys = (issue as { keys?: string[] }).keys?.join(", ") ?? "";
    return `unknown field(s): ${keys}`;
  }
  return `${issue.message}${path ? ` (at "${path}")` : ""}`;
}
