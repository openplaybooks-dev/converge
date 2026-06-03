/**
 * .test.md Test Definition
 *
 * Parser for the .test.md markdown format — a reusable check definition
 * that supports three types: cmd (shell), js (JavaScript with context API),
 * and py (Python with stdlib).
 *
 * The script body can be inlined after the YAML frontmatter, or referenced
 * via a `script:` field that points to a sibling .sh / .js / .py file. The
 * external file is read at parse time and behaves as if it were the body —
 * `{{ args.X }}` substitution still applies at expansion time.
 *
 * Mirrors the style of task-md-definition.ts.
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
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
  type: "cmd" | "js" | "py";
  args: Record<string, TestArg>;
  script: string;
  /** Source path of the external script file, when `script:` was used. */
  scriptPath?: string;
}

/* ------------------------------------------------------------------ */
/*  Zod Schemas                                                        */
/* ------------------------------------------------------------------ */

const testArgSchema: z.ZodType<TestArg> = z.object({
  type: z.enum(["string", "number", "boolean"]),
  default: z.unknown().optional(),
});

const testDefSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().optional(),
    type: z.enum(["cmd", "js", "py"]),
    args: z
      .record(
        z.union([
          z.literal("string"),
          z.literal("number"),
          z.literal("boolean"),
          testArgSchema,
        ]),
      )
      .optional()
      .default({}),
    script: z.string().optional(),
  })
  .strict();

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
    throw new Error(
      `${filePath}: Missing YAML frontmatter (expected --- delimiters)`,
    );
  }

  const frontmatterRaw = match[1];
  const inlineBody = (match[2] ?? "").trim();

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
      .map(
        (issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`,
      )
      .join("\n");
    throw new Error(`${filePath}: Invalid test definition:\n${messages}`);
  }

  // Resolve script: external file vs. inline body
  let script: string;
  let scriptPath: string | undefined;
  const scriptRef = result.data.script;

  if (scriptRef !== undefined) {
    if (inlineBody.length > 0) {
      throw new Error(
        `${filePath}: cannot set both \`script:\` and an inline body — use one or the other`,
      );
    }
    const resolved = isAbsolute(scriptRef)
      ? scriptRef
      : resolve(dirname(filePath), scriptRef);
    if (!existsSync(resolved)) {
      throw new Error(
        `${filePath}: \`script:\` points to "${scriptRef}", but file not found at ${resolved}`,
      );
    }
    script = readFileSync(resolved, "utf-8");
    scriptPath = resolved;
  } else {
    script = inlineBody;
  }

  // Normalize args: string shorthand → { type: "string" }
  const args: Record<string, TestArg> = {};
  if (obj.args && typeof obj.args === "object") {
    for (const [key, value] of Object.entries(
      obj.args as Record<string, unknown>,
    )) {
      args[key] = normalizeArg(value as string | TestArg);
    }
  }

  return {
    name: result.data.name,
    description: result.data.description,
    type: result.data.type,
    args,
    script,
    ...(scriptPath ? { scriptPath } : {}),
  };
}
