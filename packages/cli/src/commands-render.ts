/**
 * `converge render` — strict template substitution.
 *
 *   converge render <template-path> [options]
 *
 * Options:
 *   --var KEY=VALUE          repeatable; explicit variable binding
 *   --var-file PATH          shell-style env file (`KEY=value` per line, `#` comments)
 *   --env                    also pull variables from process.env (off by default)
 *   --out PATH               write to PATH (atomic); default: stdout
 *   --allow-missing          do not throw on missing `{{var}}` references;
 *                            substitute "" and log a warning to stderr
 *
 * The template uses `{{NAME}}` placeholders where NAME matches
 * `[A-Za-z0-9_-]+`. Substitution is literal — values pass through verbatim
 * so shell metacharacters, backslashes, and pipes don't get mangled.
 *
 * Exit codes:
 *   0   success
 *   2   usage error (missing template, malformed --var, etc.)
 *   3   missing template variable (strict mode only)
 *
 * Why this exists: the playbook-side `_render.sh` does the same job in a
 * Node-block-inside-bash heredoc, with stringly-typed env-var passing.
 * Centralizing it here gives:
 *   - one substitution rule (consistent regex);
 *   - one error model (fail loud on missing vars by default);
 *   - one atomic-write contract (no partial files);
 *   - a callable surface for any bash seed: `converge render foo.tpl --var k=v`.
 */

import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";

export interface RenderCommandOptions {
  positional: string[];
  options: Record<string, unknown>;
}

function asString(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  return String(v);
}

function asMulti(v: unknown): string[] {
  if (v === undefined || v === null) return [];
  if (Array.isArray(v)) return v.map(String);
  return [String(v)];
}

function asBool(v: unknown): boolean {
  return v === true || v === "true" || v === "1";
}

function fail(message: string, code = 2): never {
  console.error(`converge render: ${message}`);
  process.exit(code);
}

/** Parse a single `KEY=VALUE` token. The first `=` is the separator; the
 *  rest of the string is the literal value (so values containing `=` are
 *  preserved). Keys must match the placeholder grammar. */
function parseVarToken(raw: string): [string, string] {
  const eq = raw.indexOf("=");
  if (eq <= 0) {
    fail(`--var must be in the form KEY=VALUE; got: ${JSON.stringify(raw)}`);
  }
  const key = raw.slice(0, eq);
  if (!/^[A-Za-z0-9_-]+$/.test(key)) {
    fail(
      `--var key "${key}" must match [A-Za-z0-9_-]+ (got: ${JSON.stringify(raw)})`,
    );
  }
  return [key, raw.slice(eq + 1)];
}

/** Parse a shell-style env file. Lines:
 *   - blank / comments (leading `#`) are ignored
 *   - `KEY=VALUE` (no quoting; value is the literal substring after `=`)
 *   - `export KEY=VALUE` (the `export ` prefix is stripped)
 *   - lines that look like neither raise an error
 */
function parseVarFile(path: string): Record<string, string> {
  const raw = readFileSync(path, "utf-8");
  const out: Record<string, string> = {};
  let lineNo = 0;
  for (const line of raw.split(/\r?\n/)) {
    lineNo++;
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const body = trimmed.startsWith("export ") ? trimmed.slice(7) : trimmed;
    const eq = body.indexOf("=");
    if (eq <= 0) {
      fail(
        `--var-file ${path}:${lineNo}: expected KEY=VALUE, got ${JSON.stringify(line)}`,
      );
    }
    const key = body.slice(0, eq);
    if (!/^[A-Za-z0-9_-]+$/.test(key)) {
      fail(
        `--var-file ${path}:${lineNo}: key "${key}" must match [A-Za-z0-9_-]+`,
      );
    }
    out[key] = body.slice(eq + 1);
  }
  return out;
}

/** The placeholder grammar.
 *
 *  - `{{NAME}}` where NAME matches `[A-Za-z0-9_-]+`.
 *  - No expressions, no filters, no whitespace inside the braces.
 *  - Anything that doesn't match this exact pattern is left untouched —
 *    keeping the substitution non-greedy means values that happen to
 *    contain `{{x}}` later in the pipeline don't get re-substituted.
 */
const PLACEHOLDER = /\{\{([A-Za-z0-9_-]+)\}\}/g;

export interface RenderResult {
  /** Rendered output. */
  output: string;
  /** Variables referenced by the template (in order of first appearance). */
  referenced: string[];
  /** Variables referenced but not bound. Empty in strict mode (would have thrown). */
  missing: string[];
}

/**
 * Pure rendering function. Substitutes `{{var}}` placeholders against
 * `vars`. Throws `MissingVarError` if `strict` and a referenced var is
 * absent. Exported so other commands (test fixtures, seeds invoked from
 * TS) can reuse the same implementation as the CLI.
 */
export class MissingVarError extends Error {
  readonly missing: string[];
  constructor(missing: string[], templatePath?: string) {
    super(
      `template ${templatePath ? `${templatePath} ` : ""}references unset ` +
        `variable${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`,
    );
    this.name = "MissingVarError";
    this.missing = missing;
  }
}

export function renderTemplate(
  template: string,
  vars: Record<string, string>,
  options: { strict?: boolean; templatePath?: string } = {},
): RenderResult {
  const strict = options.strict !== false;
  const referenced: string[] = [];
  const missing: string[] = [];
  const seen = new Set<string>();

  const output = template.replace(PLACEHOLDER, (_match, name: string) => {
    if (!seen.has(name)) {
      seen.add(name);
      referenced.push(name);
      if (!(name in vars)) missing.push(name);
    }
    return Object.prototype.hasOwnProperty.call(vars, name) ? vars[name] : "";
  });

  if (strict && missing.length > 0) {
    throw new MissingVarError(missing, options.templatePath);
  }

  return { output, referenced, missing };
}

/**
 * Atomic write: render to a tempfile next to the target, then rename. If
 * the rename fails, the target is left untouched (no partial writes).
 */
function atomicWrite(targetPath: string, content: string): void {
  const dir = dirname(targetPath);
  mkdirSync(dir, { recursive: true });
  const tmp = `${targetPath}.tmp.${process.pid}.${Date.now()}`;
  writeFileSync(tmp, content, "utf-8");
  try {
    renameSync(tmp, targetPath);
  } catch (err) {
    // Clean up the tmp file so we don't leave debris.
    try {
      const { unlinkSync } = require("node:fs");
      unlinkSync(tmp);
    } catch {
      /* swallow — the rename error is what we report */
    }
    throw err;
  }
}

export async function renderCommand({
  positional,
  options,
}: RenderCommandOptions): Promise<void> {
  const templatePath = positional[0];
  if (!templatePath) {
    fail(
      "usage: converge render <template-path> [--var KEY=VALUE]... " +
        "[--var-file PATH] [--env] [--out PATH] [--allow-missing]",
    );
  }
  const absTemplate = isAbsolute(templatePath)
    ? templatePath
    : resolve(process.cwd(), templatePath);
  if (!existsSync(absTemplate)) {
    fail(`template not found: ${absTemplate}`);
  }
  const template = readFileSync(absTemplate, "utf-8");

  // Collect vars: process.env (opt-in), --var-file, --var (in that order
  // so later sources override earlier ones).
  const vars: Record<string, string> = {};

  if (asBool(options.env)) {
    for (const [k, v] of Object.entries(process.env)) {
      if (typeof v === "string" && /^[A-Za-z0-9_-]+$/.test(k)) {
        vars[k] = v;
      }
    }
  }

  for (const path of asMulti(options["var-file"])) {
    const abs = isAbsolute(path) ? path : resolve(process.cwd(), path);
    if (!existsSync(abs)) fail(`--var-file not found: ${abs}`);
    Object.assign(vars, parseVarFile(abs));
  }

  for (const tok of asMulti(options.var)) {
    const [k, v] = parseVarToken(tok);
    vars[k] = v;
  }

  const strict = !asBool(options["allow-missing"]);

  let result: RenderResult;
  try {
    result = renderTemplate(template, vars, {
      strict,
      templatePath: absTemplate,
    });
  } catch (err) {
    if (err instanceof MissingVarError) {
      console.error(`converge render: ${err.message}`);
      process.exit(3);
    }
    throw err;
  }

  if (!strict && result.missing.length > 0) {
    console.warn(
      `converge render: --allow-missing: substituted "" for ${result.missing.length} unset var(s): ${result.missing.join(", ")}`,
    );
  }

  const outPath = asString(options.out);
  if (outPath) {
    const abs = isAbsolute(outPath) ? outPath : resolve(process.cwd(), outPath);
    atomicWrite(abs, result.output);
  } else {
    process.stdout.write(result.output);
  }
}
