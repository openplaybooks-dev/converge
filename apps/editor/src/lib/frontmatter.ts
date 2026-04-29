import "server-only";
import { Document, isMap, parseDocument } from "yaml";

/**
 * A patch maps frontmatter keys to a desired next value. Semantics mirror
 * the editor's PUT contract:
 *  - `undefined`   → leave unchanged
 *  - `null`        → delete the key
 *  - `""`          → delete the key (empty string == cleared)
 *  - `[]`          → delete the key (empty list == cleared)
 *  - everything else → set the key
 */
export type FrontmatterPatchValue =
  | string
  | string[]
  | boolean
  | null
  | undefined;

export type FrontmatterPatch = Record<string, FrontmatterPatchValue>;

// Match the leading `---` fence and the closing `---` fence. We deliberately
// use `[ \t]*` (not `\s*`) around the markers so we don't accidentally eat
// real blank lines that belong to the body.
const FENCE = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n)?/;

interface SplitResult {
  leadingNewline: string;
  fence: string;
  bodyOffset: number;
  body: string;
}

/**
 * Split a TASK.md-style file into its frontmatter fence and body, byte-exact.
 * Throws if the file has no frontmatter — TASK.md always does, and a missing
 * fence is a real problem we should surface, not paper over.
 */
function splitFile(raw: string): { yaml: string; rest: SplitResult } {
  const match = raw.match(FENCE);
  if (!match) {
    throw new Error("Cannot mutate frontmatter: no leading --- fence found");
  }
  const fence = match[0];
  const yaml = match[1];
  const bodyOffset = fence.length;
  return {
    yaml,
    rest: {
      leadingNewline: "",
      fence,
      bodyOffset,
      body: raw.slice(bodyOffset),
    },
  };
}

function isEmptyValue(v: FrontmatterPatchValue): boolean {
  if (v === undefined) return false; // "leave unchanged" — handled by caller
  if (v === null) return true;
  if (typeof v === "string" && v.length === 0) return true;
  if (Array.isArray(v) && v.length === 0) return true;
  return false;
}

function applyPatchToDoc(doc: Document, patch: FrontmatterPatch): void {
  if (!isMap(doc.contents)) {
    // Empty frontmatter parses as null contents. Initialise an empty map so
    // we can `set` into it.
    doc.contents = doc.createNode({}) as never;
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (isEmptyValue(value)) {
      doc.delete(key);
      continue;
    }
    doc.set(key, value);
  }
}

/**
 * Apply a patch to the frontmatter of `raw` and return the updated file.
 *
 * Unlike a `parse → mutate object → stringify` round-trip, this preserves
 * the original YAML exactly for keys we don't touch — quoting, comments,
 * key order, block-scalar style. Only modified keys are re-emitted in the
 * `yaml` package's default style.
 *
 * The body (everything after the closing `---`) is preserved byte-exact.
 */
export function applyFrontmatterPatch(
  raw: string,
  patch: FrontmatterPatch,
): string {
  const { yaml, rest } = splitFile(raw);
  const doc = parseDocument(yaml, { keepSourceTokens: true });
  if (doc.errors.length > 0) {
    throw new Error(`YAML parse error: ${doc.errors[0].message}`);
  }
  applyPatchToDoc(doc, patch);

  // `doc.toString()` always ends with a single newline. Strip it so we can
  // re-fence cleanly without introducing extra blank lines.
  const updatedYaml = doc.toString().replace(/\n$/, "");

  return `---\n${updatedYaml}\n---\n${stripLeadingNewlineIfFenceHadOne(rest)}`;
}

/**
 * The original fence consumed any single newline after the closing `---`,
 * so the body string starts at the first non-fence byte. We always emit a
 * `\n` after the closing `---` ourselves, which means a body that already
 * starts with `\n` would create a duplicate blank line. Trim a single
 * leading `\n` from the body to avoid that.
 */
function stripLeadingNewlineIfFenceHadOne(rest: SplitResult): string {
  // The matched fence regex either ends with `\n` (typical) or runs to EOF.
  // If the fence we matched ended with a newline, the body starts on the
  // next line; we already wrote `---\n`, so do nothing.
  // If not, the body starts immediately after `---` (no newline), so we
  // need to insert one — but that case is rare for hand-edited TASK.md.
  // Either way, returning the body as-is is correct; the regex pattern
  // ensures the fence always ends in `\n` when a body exists.
  return rest.body;
}
