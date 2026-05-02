/**
 * .seed.md Seed Definition
 *
 * Parser for the .seed.md markdown format — a reusable seed definition
 * that describes how to spawn child tasks from a parent's from_seed: field.
 *
 * Mirrors the style of test-md-definition.ts.
 */

import { parse as parseYaml } from "yaml";
import { z } from "zod";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SeedArg {
  type: "string" | "number" | "boolean";
  default?: unknown;
}

export interface SeedMdDefinition {
  name: string;
  description?: string;
  kind: "nodejs" | "python" | "shell" | "skill" | "template";
  args: Record<string, SeedArg>;
  /** Optional: pre-compute a manifest preview for the spawn planner */
  preview_manifest?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Zod Schemas                                                        */
/* ------------------------------------------------------------------ */

const seedArgSchema: z.ZodType<SeedArg> = z.object({
  type: z.enum(["string", "number", "boolean"]),
  default: z.unknown().optional(),
});

const seedDefSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  kind: z.enum(["nodejs", "python", "shell", "skill", "template"]).optional().default("nodejs"),
  args: z.record(z.union([z.literal("string"), z.literal("number"), z.literal("boolean"), seedArgSchema])).optional().default({}),
  preview_manifest: z.boolean().optional().default(false),
}).strict();

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function normalizeArg(raw: string | SeedArg): SeedArg {
  if (typeof raw === "string") {
    return { type: raw as SeedArg["type"] };
  }
  return raw;
}

/* ------------------------------------------------------------------ */
/*  Parser                                                             */
/* ------------------------------------------------------------------ */

/**
 * Parse a .seed.md string into a SeedMdDefinition.
 * Throws with clear error messages including the file path on validation failure.
 */
export function parseSeedMd(content: string, filePath: string): SeedMdDefinition {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    throw new Error(`${filePath}: Missing YAML frontmatter (expected --- delimiters)`);
  }

  const frontmatterRaw = match[1];

  let parsed: unknown;
  try {
    parsed = parseYaml(frontmatterRaw);
  } catch (err: any) {
    throw new Error(`${filePath}: Invalid YAML frontmatter: ${err.message}`);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error(`${filePath}: Frontmatter must be a YAML mapping`);
  }

  const obj = parsed as Record<string, unknown>;

  const result = seedDefSchema.safeParse(obj);
  if (!result.success) {
    const messages = result.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`${filePath}: Invalid seed definition:\n${messages}`);
  }

  const args: Record<string, SeedArg> = {};
  if (obj.args && typeof obj.args === "object") {
    for (const [key, value] of Object.entries(obj.args as Record<string, unknown>)) {
      args[key] = normalizeArg(value as string | SeedArg);
    }
  }

  return {
    name: result.data.name,
    description: result.data.description,
    kind: result.data.kind ?? "nodejs",
    args,
    preview_manifest: result.data.preview_manifest ?? false,
  };
}
