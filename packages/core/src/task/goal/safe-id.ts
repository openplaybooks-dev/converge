/**
 * Task-id validation — prevents path traversal and shell injection at
 * every framework boundary where an id is used to compose a filesystem
 * path or shell argument.
 *
 * The grammar is intentionally narrow:
 *   - allowed chars: `[A-Za-z0-9_.-]` plus `/` for hierarchical ids
 *   - max length 200 (filesystems generally tolerate paths up to ~255)
 *   - no leading/trailing `.` or `/`
 *   - no `..` segment anywhere
 *   - no leading `-` (avoids accidental flag parsing if an id is
 *     spliced into a CLI)
 *   - no control chars, no whitespace, no NUL
 *
 * Why this is conservative: ids are used in 6+ places to build paths
 * (`inventory/spawned/<id>/`, `journal/tasks/<id>/`, etc.). One missed
 * boundary = an AI-supplied id can write outside the workspace. The
 * canonical sprint naming (`001-bootstrap--02-impl--01`) fits this
 * grammar; anything that doesn't fit is suspicious by construction.
 */

const MAX_ID_LENGTH = 200;
const ID_GRAMMAR = /^[A-Za-z0-9_.][A-Za-z0-9_./-]*$/;

export class InvalidIdError extends Error {
  readonly id: string;
  readonly reason: string;
  constructor(id: string, reason: string) {
    super(`invalid task id ${JSON.stringify(id)}: ${reason}`);
    this.name = "InvalidIdError";
    this.id = id;
    this.reason = reason;
  }
}

/**
 * Throws InvalidIdError if `id` is unsafe to use as a path segment or
 * shell argument. Returns the id unchanged on success so it composes
 * inline with path construction.
 */
export function assertSafeId(id: unknown, role = "id"): string {
  if (typeof id !== "string") {
    throw new InvalidIdError(String(id), `${role} must be a string`);
  }
  if (id.length === 0) {
    throw new InvalidIdError(id, `${role} must not be empty`);
  }
  if (id.length > MAX_ID_LENGTH) {
    throw new InvalidIdError(
      id,
      `${role} exceeds ${MAX_ID_LENGTH} chars (got ${id.length})`,
    );
  }
  if (!ID_GRAMMAR.test(id)) {
    throw new InvalidIdError(
      id,
      `${role} must match [A-Za-z0-9_./-]+ and start with [A-Za-z0-9_.]`,
    );
  }
  // Reject any `..` segment — the grammar above allows `..` inside (e.g.
  // `foo..bar` would pass), so we check segments explicitly.
  for (const seg of id.split("/")) {
    if (seg === "" || seg === "." || seg === "..") {
      throw new InvalidIdError(
        id,
        `${role} must not contain empty, "." or ".." path segments`,
      );
    }
  }
  // No leading/trailing separator.
  if (id.startsWith("/") || id.endsWith("/")) {
    throw new InvalidIdError(
      id,
      `${role} must not start or end with "/"`,
    );
  }
  return id;
}

/** Same contract as assertSafeId, returns boolean instead of throwing. */
export function isSafeId(id: unknown): id is string {
  try {
    assertSafeId(id);
    return true;
  } catch {
    return false;
  }
}
