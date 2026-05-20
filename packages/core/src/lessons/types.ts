/**
 * RFC 0010 — Typed lessons (part 1: schema + scope resolution + injector).
 *
 * Replaces freeform LEARN.md prose with `lessons.jsonl` — one structured
 * lesson per line. Part 1 ships the type, scope hierarchy resolution,
 * and the prompt-injection helper. Part 2 wires the CLI (`converge
 * lesson record/list`) and the prompt-builder integration.
 */

export type LessonKind = "avoid" | "prefer" | "fact" | "remember";

export type LessonScope =
  | "global"
  | `playbook:${string}`
  | `task:${string}`
  | `skill:${string}`
  | `provider:${string}`;

export interface AvoidLesson {
  kind: "avoid";
  pattern: string;
  reason: string;
  scope: LessonScope;
  expiresAfterRuns?: number;
}

export interface PreferLesson {
  kind: "prefer";
  approach: string;
  over: string;
  reason?: string;
  scope: LessonScope;
  expiresAfterRuns?: number;
}

export interface FactLesson {
  kind: "fact";
  key: string;
  value: unknown;
  scope: LessonScope;
  expiresAfterRuns?: number;
}

export interface RememberLesson {
  kind: "remember";
  key: string;
  scope: LessonScope;
  expiresAfterRuns?: number;
}

export type Lesson = AvoidLesson | PreferLesson | FactLesson | RememberLesson;

/* ------------------------------------------------------------------ */
/*  Parsing                                                           */
/* ------------------------------------------------------------------ */

/**
 * Parse one JSONL line. Returns null for blank lines, malformed JSON,
 * or shapes that don't match a known lesson kind — callers can decide
 * whether to warn or silently skip.
 */
export function parseLessonLine(line: string): Lesson | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  let obj: unknown;
  try { obj = JSON.parse(trimmed); } catch { return null; }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
  const o = obj as Record<string, unknown>;
  if (typeof o.scope !== "string" || !isLessonScope(o.scope)) return null;
  switch (o.kind) {
    case "avoid":
      if (typeof o.pattern !== "string" || typeof o.reason !== "string") return null;
      return { kind: "avoid", pattern: o.pattern, reason: o.reason, scope: o.scope, ...optionalTtl(o) };
    case "prefer":
      if (typeof o.approach !== "string" || typeof o.over !== "string") return null;
      return {
        kind: "prefer", approach: o.approach, over: o.over,
        reason: typeof o.reason === "string" ? o.reason : undefined,
        scope: o.scope, ...optionalTtl(o),
      };
    case "fact":
      if (typeof o.key !== "string") return null;
      return { kind: "fact", key: o.key, value: o.value, scope: o.scope, ...optionalTtl(o) };
    case "remember":
      if (typeof o.key !== "string") return null;
      return { kind: "remember", key: o.key, scope: o.scope, ...optionalTtl(o) };
    default:
      return null;
  }
}

function optionalTtl(o: Record<string, unknown>): { expiresAfterRuns?: number } {
  return typeof o.expiresAfterRuns === "number" ? { expiresAfterRuns: o.expiresAfterRuns } : {};
}

function isLessonScope(s: string): s is LessonScope {
  if (s === "global") return true;
  return /^(playbook|task|skill|provider):.+$/.test(s);
}

/* ------------------------------------------------------------------ */
/*  Scope resolution                                                  */
/* ------------------------------------------------------------------ */

export interface PromptContext {
  playbook: string;
  taskId: string;
  /** Skills attached to the task. */
  skills?: string[];
  /** Provider in use (claude / minimax / ...). */
  provider?: string;
}

/**
 * Decide whether a lesson's scope applies to the given prompt context.
 * Inheritance:
 *   - global applies everywhere
 *   - playbook:X applies when context.playbook === X
 *   - task:X applies when context.taskId === X
 *   - skill:X applies when context.skills includes X
 *   - provider:X applies when context.provider === X
 */
export function lessonAppliesTo(lesson: Lesson, ctx: PromptContext): boolean {
  const scope = lesson.scope;
  if (scope === "global") return true;
  const [kind, name] = scope.split(":", 2) as [string, string];
  switch (kind) {
    case "playbook": return ctx.playbook === name;
    case "task":     return ctx.taskId === name;
    case "skill":    return (ctx.skills ?? []).includes(name);
    case "provider": return ctx.provider === name;
    default:         return false;
  }
}

/**
 * Pick the lessons that should be injected into a prompt for `ctx`,
 * preserving input order. Caller decides expiration based on
 * `expiresAfterRuns` + run counters; this function does no expiry —
 * filter upstream.
 */
export function selectLessons(lessons: Lesson[], ctx: PromptContext): Lesson[] {
  return lessons.filter((l) => lessonAppliesTo(l, ctx));
}

/* ------------------------------------------------------------------ */
/*  Prompt rendering                                                  */
/* ------------------------------------------------------------------ */

/**
 * Render a compact, agent-readable block from a list of lessons. Empty
 * input returns an empty string — caller can choose whether to insert
 * a heading conditionally.
 */
export function renderLessonsBlock(lessons: Lesson[]): string {
  if (lessons.length === 0) return "";
  const lines: string[] = ["Lessons from prior attempts:"];
  for (const l of lessons) {
    switch (l.kind) {
      case "avoid":
        lines.push(`- AVOID \`${l.pattern}\` — ${l.reason}`);
        break;
      case "prefer":
        lines.push(`- PREFER ${l.approach} over ${l.over}${l.reason ? ` — ${l.reason}` : ""}`);
        break;
      case "fact":
        lines.push(`- FACT ${l.key} = ${JSON.stringify(l.value)}`);
        break;
      case "remember":
        lines.push(`- REMEMBER ${l.key}`);
        break;
    }
  }
  return lines.join("\n");
}
