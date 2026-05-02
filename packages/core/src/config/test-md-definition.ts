/**
 * .test.md Test Definition
 *
 * Parser for the .test.md markdown format — a reusable check definition
 * that supports two types: cmd (shell) and js (JavaScript with context API).
 *
 * Mirrors the style of task-md-definition.ts.
 */

import { parse as parseYaml } from "yaml";
import { z } from "zod";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface TestArg {
  type: "string" | "number" | "boolean";
  default?: unknown;
}

export interface TestDef {
  name: string;
  description?: string;
  type: "cmd" | "js";
  args: Record<string, TestArg>;
  script: string;
}

/* ------------------------------------------------------------------ */
/*  Zod Schemas                                                        */
/* ------------------------------------------------------------------ */

const testArgSchema: z.ZodType<TestArg> = z.object({
  type: z.enum(["string", "number", "boolean"]),
  default: z.unknown().optional(),
});

const testDefSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["cmd", "js"]),
  args: z.record(z.union([z.literal("string"), z.literal("number"), z.literal("boolean"), testArgSchema])).optional().default({}),
}).strict();

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function normalizeArg(raw: string | TestArg): TestArg {
  if (typeof raw === "string") {
    return { type: raw as TestArg["type"] };
  }
  return raw;
}

/* ------------------------------------------------------------------ */
/*  Parser                                                             */
/* ------------------------------------------------------------------ */

/**
 * Parse a .test.md string into a TestDef.
 * Throws with clear error messages including the file path on validation failure.
 */
export function parseTestMd(content: string, filePath: string): TestDef {
  // Parse YAML frontmatter
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    throw new Error(`${filePath}: Missing YAML frontmatter (expected --- delimiters)`);
  }

  const frontmatterRaw = match[1];
  const script = (match[2] ?? "").trim();

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

  // Validate with Zod
  const result = testDefSchema.safeParse(obj);
  if (!result.success) {
    const messages = result.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`${filePath}: Invalid test definition:\n${messages}`);
  }

  // Normalize args: string shorthand → { type: "string" }
  const args: Record<string, TestArg> = {};
  if (obj.args && typeof obj.args === "object") {
    for (const [key, value] of Object.entries(obj.args as Record<string, unknown>)) {
      args[key] = normalizeArg(value as string | TestArg);
    }
  }

  return {
    name: result.data.name,
    description: result.data.description,
    type: result.data.type,
    args,
    script,
  };
}
