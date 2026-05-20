/**
 * RFC 0022 — Mode inference (back-compat).
 *
 * Existing playbooks pre-date the typed `mode:` field. This module maps
 * observable signals back to the four declared modes so the post-body
 * validator and converger wave loop can run unchanged across the
 * transition. New playbooks declare `mode:` explicitly; the framework
 * logs a one-time warning at parse for any task whose mode was inferred.
 *
 * Phase-3 plan (per RFC §Migration): remove this module after one
 * release cycle and emit a clean parse-time error for missing `mode:`.
 */
import type { TaskMode } from "./schema.ts";

/**
 * The minimal slice of task definition the inference rule reads. We
 * accept a structural shape rather than the full TaskMdDef so the
 * inference can be applied to in-memory shapes (script-generated tasks,
 * test fixtures, etc.) without coupling to the TASK.md parser.
 */
export interface ModeInferenceInput {
  mode?: TaskMode;
  /** Whether the task is declared `passthrough: true`. */
  passthrough?: boolean;
  /** Whether the task uses `seed: { mode: cli }`. */
  seed?: { mode: "cli" } | undefined;
  /** Declared output paths — non-empty implies leaf-ish. */
  outputs?: string[] | undefined;
  /** The TASK.md markdown body. May be empty. */
  body?: string | undefined;
}

/**
 * Word-boundary regex for `converge spawn` / `converge apply` so the
 * detector doesn't fire on prose like "the team can converge on a design".
 * Matches both forms with any whitespace between tokens.
 */
const SPAWN_KEYWORD_RE = /\bconverge\s+(spawn|apply)\b/;

/**
 * Map signals → mode. Priority order matters — earlier rules win.
 *
 *   1. Declared mode (no inference).
 *   2. seed.cli → converger (the body re-runs per wave, framework loops).
 *   3. passthrough + body mentions a spawn verb → spawner.
 *   4. passthrough + nothing else → gateway (sync point).
 *   5. Default → leaf.
 *
 * The rules are mutually exclusive by construction: the converger check
 * runs before spawner detection, so a task that is *both* a CLI seed
 * (multi-wave) and writes a manifest is classified as a converger (which
 * is correct — the converger wave loop handles per-wave manifests).
 */
export function inferMode(input: ModeInferenceInput): TaskMode {
  if (input.mode) return input.mode;

  if (input.seed && input.seed.mode === "cli") return "converger";

  const body = input.body ?? "";
  const bodyMentionsSpawn = SPAWN_KEYWORD_RE.test(body);

  if (input.passthrough) {
    if (bodyMentionsSpawn) return "spawner";
    if (body.trim().length === 0) return "gateway";
    // Passthrough with a non-empty body that doesn't spawn is rare and
    // historically meant "shell script that produces outputs". Treat as
    // leaf — the post-body validator will catch a stray manifest if the
    // body did write one.
    return "leaf";
  }

  return "leaf";
}
