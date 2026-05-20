/**
 * RFC 0015 — Hot-reload TASK.md edits (part 1).
 *
 * Ships the debouncer + edit-classifier that decide how a TASK.md
 * change should be applied: hot-swap body, re-run checks next attempt,
 * or pause and re-compile the DAG. Part 2 wires this to a chokidar
 * watcher and the runtime's dispatch loop.
 */

export type EditCategory =
  | "body"          // hot-applied to not-yet-started tasks
  | "checks"        // re-run on next attempt
  | "outputs"       // re-validate on completion
  | "depends_on"    // pause dispatch, re-compile DAG, resume
  | "seed"          // pause dispatch, re-render seeds, resume
  | "other";        // unknown frontmatter key; default to "other" → no-op + warn

export interface ParsedTaskMd {
  /** Frontmatter shape — only the fields the classifier cares about. */
  frontmatter: {
    depends_on?: unknown;
    seed?: unknown;
    checks?: unknown;
    outputs?: unknown;
    [k: string]: unknown;
  };
  /** Body text (everything after the closing `---`). */
  body: string;
}

/**
 * Classify the edit between `before` and `after` versions of the same
 * TASK.md. Returns the *most disruptive* category that changed — a
 * single edit that touches both body and depends_on is reported as
 * `depends_on` because the recompile dwarfs the hot-apply.
 *
 * Precedence (most → least disruptive):
 *   seed > depends_on > checks > outputs > body > other
 */
export function classifyEdit(before: ParsedTaskMd, after: ParsedTaskMd): EditCategory[] {
  const out: EditCategory[] = [];
  if (!deepEqual(before.frontmatter.seed, after.frontmatter.seed)) out.push("seed");
  if (!deepEqual(before.frontmatter.depends_on, after.frontmatter.depends_on)) out.push("depends_on");
  if (!deepEqual(before.frontmatter.checks, after.frontmatter.checks)) out.push("checks");
  if (!deepEqual(before.frontmatter.outputs, after.frontmatter.outputs)) out.push("outputs");
  if (before.body !== after.body) out.push("body");

  // Any other top-level frontmatter key change → "other".
  const beforeKeys = Object.keys(before.frontmatter).filter((k) => !KNOWN_KEYS.has(k));
  const afterKeys = Object.keys(after.frontmatter).filter((k) => !KNOWN_KEYS.has(k));
  const otherChanged =
    beforeKeys.length !== afterKeys.length ||
    beforeKeys.some((k) => !deepEqual(before.frontmatter[k], after.frontmatter[k])) ||
    afterKeys.some((k) => !beforeKeys.includes(k));
  if (otherChanged) out.push("other");

  return out;
}

const KNOWN_KEYS = new Set(["seed", "depends_on", "checks", "outputs"]);

/** True when the most-disruptive change in the edit list requires a re-compile. */
export function requiresRecompile(cats: EditCategory[]): boolean {
  return cats.includes("seed") || cats.includes("depends_on");
}

/* ------------------------------------------------------------------ */
/*  Debouncer                                                         */
/* ------------------------------------------------------------------ */

/**
 * Per-path debouncer. The watcher fires this for every fs event;
 * `flush(path)` calls `onSettled` exactly once after `delayMs` of
 * quiescence per path. Used to absorb editor save-bursts.
 */
export class EditDebouncer<P = string> {
  private timers = new Map<P, ReturnType<typeof setTimeout>>();
  constructor(
    private delayMs: number,
    private onSettled: (path: P) => void | Promise<void>,
  ) {}

  notify(path: P): void {
    const existing = this.timers.get(path);
    if (existing) clearTimeout(existing);
    const handle = setTimeout(() => {
      this.timers.delete(path);
      void this.onSettled(path);
    }, this.delayMs);
    this.timers.set(path, handle);
  }

  /** Cancel a pending flush without firing it. */
  cancel(path: P): void {
    const t = this.timers.get(path);
    if (t) {
      clearTimeout(t);
      this.timers.delete(path);
    }
  }

  /** Number of paths currently awaiting flush. */
  get pendingCount(): number { return this.timers.size; }
}

/* ------------------------------------------------------------------ */
/*  Deep equality (used for frontmatter compare)                      */
/* ------------------------------------------------------------------ */

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return a === b;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    const ar = a as unknown[]; const br = b as unknown[];
    if (ar.length !== br.length) return false;
    for (let i = 0; i < ar.length; i++) if (!deepEqual(ar[i], br[i])) return false;
    return true;
  }
  const ao = a as Record<string, unknown>; const bo = b as Record<string, unknown>;
  const ak = Object.keys(ao); const bk = Object.keys(bo);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (!(k in bo)) return false;
    if (!deepEqual(ao[k], bo[k])) return false;
  }
  return true;
}
