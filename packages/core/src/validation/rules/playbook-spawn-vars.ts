/**
 * RFC 0001 — Cross-template var validator.
 *
 * For every TASK.md whose `seed: { mode: cli }` body emits
 * `converge spawn template --path X --var k=v` lines, statically check
 * that the target template's declared `vars:` are all provided. The
 * matching runtime check fires only after the parent has been seeded —
 * which can be hours of upstream work in real playbooks. This catches
 * the same class of bug at compile time.
 *
 * Conservative by design: bails out to an info-level note rather than
 * a false-positive warning when a spawn line can't be parsed
 * statically. Genuinely dynamic emitters can opt out with
 * `dynamic: true` in their seed frontmatter.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname, isAbsolute } from "node:path";
import { parse as parseYaml } from "yaml";
import type { ValidationIssue, Severity, ValidationLayer } from "../types.ts";

/**
 * A single `converge spawn template` invocation statically extracted
 * from a bash block.
 */
export interface StaticSpawn {
  /** The literal `--path` argument (may contain `${VAR}` substrings). */
  path: string;
  /** Set of `--var` keys provided (values not captured). */
  varKeys: Set<string>;
  /** 1-based line number inside the bash block. */
  line: number;
  /**
   * Whether the spawn could be fully parsed statically. `false` means
   * we recognised the `converge spawn template` prefix but couldn't
   * resolve the path or every var key — caller should downgrade to
   * an info note rather than enforce.
   */
  parseable: boolean;
}

/**
 * Extract every `converge spawn template` invocation from a bash
 * block. Lines that aren't statically resolvable (dynamic --path,
 * unbalanced quotes) are returned with `parseable: false`.
 */
export function extractStaticSpawns(block: string): StaticSpawn[] {
  const out: StaticSpawn[] = [];
  const lines = block.split(/\r?\n/);
  // A single `converge spawn template ...` can be soft-wrapped across
  // lines with a trailing backslash. Re-join those before parsing.
  type Joined = { text: string; line: number };
  const joined: Joined[] = [];
  for (let i = 0; i < lines.length; i++) {
    let text = lines[i];
    let startLine = i + 1;
    while (text.endsWith("\\") && i + 1 < lines.length) {
      text = text.slice(0, -1) + " " + lines[i + 1];
      i += 1;
    }
    joined.push({ text, line: startLine });
  }

  for (const { text, line } of joined) {
    const m = text.match(/^[ \t]*converge\s+spawn\s+template\b(.*)$/);
    if (!m) continue;
    const argStr = m[1];

    let tokens: string[];
    try {
      tokens = tokenizeShellArgs(argStr);
    } catch {
      out.push({ path: "", varKeys: new Set(), line, parseable: false });
      continue;
    }

    let pathArg: string | null = null;
    const varKeys = new Set<string>();
    let parseable = true;
    for (let j = 0; j < tokens.length; j++) {
      const tok = tokens[j];
      if (tok === "--path") {
        pathArg = tokens[++j] ?? null;
      } else if (tok.startsWith("--path=")) {
        pathArg = tok.slice("--path=".length);
      } else if (tok === "--var") {
        const next = tokens[++j];
        if (!next) {
          parseable = false;
          continue;
        }
        const key = extractVarKey(next);
        if (key) varKeys.add(key);
        else parseable = false;
      } else if (tok.startsWith("--var=")) {
        const key = extractVarKey(tok.slice("--var=".length));
        if (key) varKeys.add(key);
        else parseable = false;
      }
      // --id and other flags don't matter for var-matching.
    }
    if (pathArg == null) parseable = false;
    out.push({ path: pathArg ?? "", varKeys, line, parseable });
  }
  return out;
}

/** Extract the `k` in `k=...` even if the value is `${VAR}` or interpolated. */
function extractVarKey(arg: string): string | null {
  const eq = arg.indexOf("=");
  if (eq <= 0) return null;
  const key = arg.slice(0, eq).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) return null;
  return key;
}

/**
 * Minimal POSIX-shell-style tokenizer: splits on whitespace, honors
 * single and double quotes, and treats `${VAR}` / `$VAR` inside double
 * quotes as part of the token (with the dollar-sign preserved — we
 * only care about token boundaries and the literal `k=` prefix).
 */
function tokenizeShellArgs(s: string): string[] {
  const out: string[] = [];
  let buf = "";
  let i = 0;
  let inSingle = false;
  let inDouble = false;
  let started = false;
  const flush = () => {
    if (started) {
      out.push(buf);
      buf = "";
      started = false;
    }
  };
  while (i < s.length) {
    const c = s[i];
    if (inSingle) {
      if (c === "'") inSingle = false;
      else buf += c;
      i++;
      continue;
    }
    if (inDouble) {
      if (c === '"') inDouble = false;
      else if (c === "\\" && i + 1 < s.length) {
        buf += s[i + 1];
        i++;
      } else buf += c;
      i++;
      continue;
    }
    if (c === "'") {
      inSingle = true;
      started = true;
      i++;
      continue;
    }
    if (c === '"') {
      inDouble = true;
      started = true;
      i++;
      continue;
    }
    if (c === "\\" && i + 1 < s.length) {
      buf += s[i + 1];
      started = true;
      i += 2;
      continue;
    }
    if (/\s/.test(c)) {
      flush();
      i++;
      continue;
    }
    buf += c;
    started = true;
    i++;
  }
  if (inSingle || inDouble) throw new Error("unbalanced quotes");
  flush();
  return out;
}

/**
 * Read `vars:` from a TASK.md frontmatter and return the set of
 * declared key names. A key whose value object includes `optional:
 * true` is omitted. Returns `null` if no `vars:` block is present
 * (template has no var contract).
 */
export function readDeclaredVars(taskMdPath: string): Set<string> | null {
  if (!existsSync(taskMdPath)) return null;
  const content = readFileSync(taskMdPath, "utf-8");
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  let fm: unknown;
  try {
    fm = parseYaml(m[1]);
  } catch {
    return null;
  }
  if (!fm || typeof fm !== "object") return null;
  const vars = (fm as Record<string, unknown>).vars;
  if (vars == null) return null;
  const required = new Set<string>();
  if (Array.isArray(vars)) {
    for (const v of vars) {
      if (typeof v === "string") required.add(v);
    }
  } else if (typeof vars === "object") {
    for (const [k, v] of Object.entries(vars as Record<string, unknown>)) {
      if (
        v &&
        typeof v === "object" &&
        (v as Record<string, unknown>).optional === true
      )
        continue;
      required.add(k);
    }
  }
  return required;
}

/** Read the value of a top-level frontmatter key from a TASK.md. */
function readFrontmatterField(taskMdPath: string, key: string): unknown {
  if (!existsSync(taskMdPath)) return undefined;
  const content = readFileSync(taskMdPath, "utf-8");
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return undefined;
  try {
    const fm = parseYaml(m[1]);
    if (!fm || typeof fm !== "object") return undefined;
    return (fm as Record<string, unknown>)[key];
  } catch {
    return undefined;
  }
}

/** Extract every fenced ```bash``` block (returns blocks + start line numbers). */
export function extractFencedBashBlocks(
  content: string,
): Array<{ body: string; startLine: number }> {
  const out: Array<{ body: string; startLine: number }> = [];
  const lines = content.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(/^```(bash|sh|shell)\s*$/);
    if (m) {
      const startLine = i + 2; // first content line is i+1 in 0-index, +1 for 1-based
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        body.push(lines[i]);
        i++;
      }
      out.push({ body: body.join("\n"), startLine });
    }
    i++;
  }
  return out;
}

/** Same shape as PlaybookValidationRule from playbook.ts; duplicated here
 *  to keep this module independently importable in tests without dragging
 *  in the whole rules file.
 */
export interface PlaybookValidationRule {
  id: string;
  layer: ValidationLayer | "integrity";
  severity: Severity;
  description: string;
  check: (ctx: {
    playbookDir: string;
    projectDir: string;
    def: Record<string, unknown>;
    taskFiles: string[];
    goalFiles: string[];
    scriptFiles: string[];
    templateFiles: string[];
  }) => ValidationIssue[];
}

export const playbookSpawnVarsRules: PlaybookValidationRule[] = [
  {
    id: "spawn-vars-match-target-template",
    layer: "structure",
    severity: "warning",
    description:
      "Every `converge spawn template` invocation provides the target template's required `vars:`",
    check: (ctx) => {
      const issues: ValidationIssue[] = [];
      for (const taskPath of ctx.taskFiles) {
        let content: string;
        try {
          content = readFileSync(taskPath, "utf-8");
        } catch {
          continue;
        }
        const seed = readFrontmatterField(taskPath, "seed");
        // Only inspect tasks that explicitly opt into the `seed: { mode: cli }` shape.
        if (!seed || typeof seed !== "object") continue;
        if ((seed as Record<string, unknown>).mode !== "cli") continue;
        // Per-task opt-out for genuinely dynamic emitters.
        if (readFrontmatterField(taskPath, "dynamic") === true) continue;

        const blocks = extractFencedBashBlocks(content);
        for (const blk of blocks) {
          const spawns = extractStaticSpawns(blk.body);
          for (const spawn of spawns) {
            const lineInFile = blk.startLine + spawn.line - 1;
            if (!spawn.parseable) {
              issues.push({
                ruleId: "spawn-vars-match-target-template",
                layer: "structure",
                severity: "info",
                message:
                  `Could not statically verify spawn at ${taskPath}:${lineInFile}. ` +
                  `Consider declaring \`dynamic: true\` in this task's frontmatter to silence.`,
                path: taskPath,
                field: "body",
                fix: "Declare `dynamic: true` in frontmatter, or simplify the spawn invocation",
              });
              continue;
            }
            // Resolve --path. If it contains an unresolved ${VAR}, we can't
            // pinpoint the target template — emit info, skip strict checks.
            if (/\$\{?\w+\}?/.test(spawn.path)) {
              issues.push({
                ruleId: "spawn-vars-match-target-template",
                layer: "structure",
                severity: "info",
                message:
                  `Spawn at ${taskPath}:${lineInFile} uses a dynamic --path (${spawn.path}); ` +
                  `cannot statically verify required vars.`,
                path: taskPath,
                field: "body",
                fix: "Pin the --path to a literal template path or declare `dynamic: true`",
              });
              continue;
            }
            const tgtPath = isAbsolute(spawn.path)
              ? spawn.path
              : resolve(dirname(taskPath), spawn.path);
            if (!existsSync(tgtPath)) {
              // Also try resolving relative to the playbook root and to the playbook's templates/ dir.
              const altRoots = [
                resolve(ctx.playbookDir, spawn.path),
                resolve(ctx.playbookDir, "templates", spawn.path),
              ];
              const found = altRoots.find((p) => existsSync(p));
              if (!found) {
                issues.push({
                  ruleId: "spawn-vars-match-target-template",
                  layer: "structure",
                  severity: "warning",
                  message: `Spawn at ${taskPath}:${lineInFile} references missing template: ${spawn.path}`,
                  path: taskPath,
                  field: "body",
                  fix: `Create the template at ${spawn.path} or fix the --path argument`,
                });
                continue;
              }
            }
            const resolvedPath = existsSync(tgtPath)
              ? tgtPath
              : [
                  resolve(ctx.playbookDir, spawn.path),
                  resolve(ctx.playbookDir, "templates", spawn.path),
                ].find((p) => existsSync(p))!;
            const declared = readDeclaredVars(resolvedPath);
            if (declared == null) continue; // target declares no var contract
            for (const required of declared) {
              if (!spawn.varKeys.has(required)) {
                issues.push({
                  ruleId: "spawn-vars-match-target-template",
                  layer: "structure",
                  severity: "warning",
                  message: `Spawn at ${taskPath}:${lineInFile} omits "${required}" required by ${spawn.path}`,
                  path: taskPath,
                  field: "body",
                  fix:
                    `Add --var "${required}=..." to the spawn line, or declare ` +
                    `\`dynamic: true\` in this task's frontmatter`,
                });
              }
            }
            for (const provided of spawn.varKeys) {
              if (!declared.has(provided)) {
                issues.push({
                  ruleId: "spawn-vars-match-target-template",
                  layer: "structure",
                  severity: "info",
                  message: `Spawn at ${taskPath}:${lineInFile} passes "${provided}" but ${spawn.path} does not declare it`,
                  path: taskPath,
                  field: "body",
                  fix: `Remove --var "${provided}=..." or add it to the target's vars:`,
                });
              }
            }
          }
        }
      }
      return issues;
    },
  },
];
