/**
 * RFC 0016 — Idempotency tokens on spawns (part 1).
 *
 * Auto-derives a deterministic token from playbook + template path +
 * canonicalised vars so a re-run of a seed body emits the same token,
 * letting the executor short-circuit duplicate spawns. Part 2 adds the
 * inventory `idempotency_token` UNIQUE column and the conflict-log
 * path in `executeSpawnCliCommand`.
 */
import { createHash } from "node:crypto";

/**
 * Canonicalise an arbitrary JS value into a deterministic string so
 * `{a: 1, b: 2}` and `{b: 2, a: 1}` produce the same digest input.
 *   - Objects: keys sorted lexically.
 *   - Arrays: order preserved (semantically meaningful for spawns).
 *   - Strings: trimmed, internal whitespace collapsed to single space.
 *   - Numbers / booleans / null: JSON.stringify.
 *   - undefined: treated like null (so missing vs explicit-undefined match).
 */
export function canonicalize(v: unknown): string {
  if (v === undefined || v === null) return "null";
  if (typeof v === "string") return JSON.stringify(v.replace(/\s+/g, " ").trim());
  if (typeof v === "number" || typeof v === "boolean") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canonicalize).join(",")}]`;
  if (typeof v === "object") {
    const keys = Object.keys(v as Record<string, unknown>).sort();
    const parts = keys.map((k) => `${JSON.stringify(k)}:${canonicalize((v as Record<string, unknown>)[k])}`);
    return `{${parts.join(",")}}`;
  }
  return JSON.stringify(String(v));
}

/**
 * Compute the spawn idempotency token. Hex sha256 of the canonical
 * `${playbook}\0${templatePath}\0${canonicalVars}` string. Same inputs
 * → same token, regardless of var key order or whitespace.
 */
export function computeIdempotencyToken(args: {
  playbook: string;
  templatePath: string;
  vars?: Record<string, string>;
}): string {
  const canonical = canonicalize(args.vars ?? {});
  const h = createHash("sha256");
  h.update(args.playbook);
  h.update("\0");
  h.update(args.templatePath);
  h.update("\0");
  h.update(canonical);
  return h.digest("hex");
}

/**
 * In-memory de-duplicator the executor can consult before writing a
 * new TASK.md. Returns true if the token is fresh (caller should
 * proceed with the spawn); false if it's a duplicate (caller logs +
 * skips). Part 2 swaps this for a persistent inventory check.
 */
export class IdempotencyTracker {
  private seen = new Map<string, { token: string; spawnedAt: number }>();

  /** True if the spawn should proceed; false if it's a duplicate. */
  acquire(token: string, ts: number = Date.now()): boolean {
    if (this.seen.has(token)) return false;
    this.seen.set(token, { token, spawnedAt: ts });
    return true;
  }

  has(token: string): boolean { return this.seen.has(token); }

  get size(): number { return this.seen.size; }

  /** Drop a token (e.g. during surgical reset). */
  release(token: string): void { this.seen.delete(token); }

  /** Used in tests / migration tooling. */
  snapshot(): Array<{ token: string; spawnedAt: number }> {
    return [...this.seen.values()];
  }
}
