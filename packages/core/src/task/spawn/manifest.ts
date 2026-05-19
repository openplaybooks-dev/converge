/**
 * RFC 0021 — Spawn manifest schema and parser.
 *
 * A spawn manifest is JSONL: one JSON object per line. Comments (`//` lines)
 * and blank lines are tolerated. Each row describes one child to spawn.
 *
 * The schema is strict: unknown fields are rejected with an explicit error
 * so the AI gets a clear "unknown-field" signal instead of silently
 * dropped option. This is what makes the manifest a stable contract the
 * AI can address: every error is addressable to a specific row + key.
 */
import { z } from "zod";

/**
 * The taxonomy of failure modes for a spawn row. The AI's repair loop
 * keys off this code to know what kind of fix to attempt; the human
 * `error` string is the explanation for the human reading the result
 * file.
 */
export type SpawnErrorCode =
  | "duplicate-id"
  | "template-not-found"
  | "missing-vars"
  | "malformed-frontmatter"
  | "unsafe-id"
  | "unknown-field"
  | "internal";

/**
 * Manifest row schema. `.strict()` makes any extra field a parse error,
 * which is the explicit feedback the AI needs to remove (or rename) the
 * unknown key — better than a silent drop.
 *
 * Reserved future fields (title, tags, body override, checks override,
 * skill, parent) intentionally aren't here yet. When we add them, old
 * runtimes will reject new manifests with a clean "unknown-field"
 * error instead of dropping fields silently — desirable.
 */
export const SpawnRowSchema = z
  .object({
    id: z.string().min(1),
    template: z.string().min(1),
    vars: z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
      .optional(),
    after: z.array(z.string()).optional(),
    no_inherit: z.boolean().optional(),
  })
  .strict();

export type SpawnRow = z.infer<typeof SpawnRowSchema>;

export interface ManifestParseError {
  lineNumber: number;
  rawLine: string;
  error: string;
  errorCode: SpawnErrorCode;
  /** id from the offending row, if it parsed at least that far. */
  id?: string;
}

export interface ManifestParseResult {
  rows: SpawnRow[];
  errors: ManifestParseError[];
}

/**
 * Parse a manifest text into rows and errors.
 *
 * Lines that are blank, whitespace-only, or start with `//` are skipped
 * silently. Every other line must be a JSON object matching `SpawnRowSchema`.
 *
 * On any per-line failure (JSON parse, schema mismatch, unknown field),
 * the row is dropped from `rows` and a structured error is appended to
 * `errors` so the caller can write a result file with addressable
 * per-row failures.
 */
export function parseManifestText(text: string): ManifestParseResult {
  const rows: SpawnRow[] = [];
  const errors: ManifestParseError[] = [];

  const rawLines = text.split(/\r?\n/);
  for (let i = 0; i < rawLines.length; i++) {
    const lineNumber = i + 1;
    const raw = rawLines[i];
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;
    if (trimmed.startsWith("//")) continue;

    let entry: unknown;
    try {
      entry = JSON.parse(trimmed);
    } catch (err) {
      errors.push({
        lineNumber,
        rawLine: trimmed,
        error: `JSON parse error: ${(err as Error)?.message ?? String(err)}`,
        errorCode: "internal",
      });
      continue;
    }

    const parsed = SpawnRowSchema.safeParse(entry);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const path = issue?.path?.join(".") ?? "";
      // zod's "unrecognized_keys" issue maps directly to our "unknown-field"
      // code; everything else is a shape/type error we surface as a
      // generic schema error keyed under the offending path.
      const isUnknownField = issue?.code === "unrecognized_keys";
      const errorCode: SpawnErrorCode = isUnknownField
        ? "unknown-field"
        : path === "id" || path === "template"
          ? "internal"
          : "unknown-field";
      const offending = isUnknownField
        ? (issue as { keys?: string[] }).keys?.join(", ")
        : path;
      const message = isUnknownField
        ? `unknown field(s): ${offending}`
        : (issue?.message ?? "schema validation failed") +
          (path ? ` (at "${path}")` : "");

      const id =
        entry &&
        typeof entry === "object" &&
        !Array.isArray(entry) &&
        typeof (entry as Record<string, unknown>).id === "string"
          ? ((entry as Record<string, unknown>).id as string)
          : undefined;

      errors.push({
        lineNumber,
        rawLine: trimmed,
        error: message,
        // missing required field on a known key (e.g. id, template) is
        // a row-shape problem, not an "unknown field" — keep the code
        // separable so the AI knows whether to *remove* a key or *add*
        // one. zod surfaces "invalid_type" for missing required fields.
        errorCode:
          issue?.code === "invalid_type" && (path === "id" || path === "template")
            ? "internal"
            : errorCode,
        id,
      });
      continue;
    }

    rows.push(parsed.data);
  }

  return { rows, errors };
}
