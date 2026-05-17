import { parse as parseYaml } from "yaml";
import type { SeedContext } from "../config/task-definition.ts";

/** Flags accepted by `converge spawn task` — single source of truth. */
export const SPAWN_TASK_FLAGS = [
  "--id",
  "--title",
  "--task-file",
  "--parent",
  "--depends-on",
  "--input",
  "--output",
  "--tag",
  "--check",
  "--var",
  "--body",
] as const;

export interface SpawnCliTaskCommand {
  kind: "task";
  id: string;
  title?: string;
  taskFile?: string;
  parent?: string;
  dependsOn: string[];
  inputs: string[];
  outputs: string[];
  tags: string[];
  vars: Record<string, string>;
  body?: string;
  checks: Array<{ id: string; cmd: string }>;
}

export interface SpawnCliTemplateCommand {
  kind: "template";
  path: string;
  id?: string;
  vars: Record<string, string>;
}

export type SpawnCliCommand = SpawnCliTaskCommand | SpawnCliTemplateCommand;

function tokenize(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === "\\") {
      const next = line[i + 1];
      if (next !== undefined) {
        cur += next;
        i++;
        continue;
      }
    }
    if (quote) {
      if (ch === quote) {
        quote = null;
      } else {
        cur += ch;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (cur.length > 0) {
        out.push(cur);
        cur = "";
      }
      continue;
    }
    cur += ch;
  }
  if (cur.length > 0) out.push(cur);
  return out;
}

function parseKV(input: string, flag: string): [string, string] {
  const idx = input.indexOf("=");
  if (idx <= 0 || idx === input.length - 1) {
    throw new Error(`${flag} must be key=value`);
  }
  return [input.slice(0, idx), input.slice(idx + 1)];
}

export function parseSpawnCliLine(line: string): SpawnCliCommand {
  const parts = tokenize(line.trim());
  if (parts.length < 3 || parts[0] !== "converge" || parts[1] !== "spawn") {
    throw new Error(`Not a converge spawn command: ${line}`);
  }
  const mode = parts[2];
  const args = parts.slice(3);

  if (mode === "task") {
    const cmd: SpawnCliTaskCommand = {
      kind: "task",
      id: "",
      dependsOn: [],
      inputs: [],
      outputs: [],
      tags: [],
      vars: {},
      checks: [],
    };
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      const next = args[i + 1];
      if (a === "--id") {
        cmd.id = String(next ?? "");
        i++;
      } else if (a === "--title") {
        cmd.title = String(next ?? "");
        i++;
      } else if (a === "--task-file") {
        cmd.taskFile = String(next ?? "");
        i++;
      } else if (a === "--parent") {
        cmd.parent = String(next ?? "");
        i++;
      } else if (a === "--depends-on") {
        cmd.dependsOn.push(String(next ?? ""));
        i++;
      } else if (a === "--input") {
        cmd.inputs.push(String(next ?? ""));
        i++;
      } else if (a === "--output") {
        cmd.outputs.push(String(next ?? ""));
        i++;
      } else if (a === "--tag") {
        cmd.tags.push(String(next ?? ""));
        i++;
      } else if (a === "--check") {
        const raw = String(next ?? "");
        const sep = raw.indexOf("|");
        if (sep > 0 && sep < raw.length - 1) {
          cmd.checks.push({ id: raw.slice(0, sep).trim(), cmd: raw.slice(sep + 1) });
        }
        i++;
      } else if (a === "--var") {
        const [k, v] = parseKV(String(next ?? ""), "--var");
        cmd.vars[k] = v;
        i++;
      } else if (a === "--body") {
        cmd.body = String(next ?? "");
        i++;
      } else {
        throw new Error(`Unknown flag for spawn task: ${a}`);
      }
    }
    if (!cmd.id) throw new Error("spawn task requires --id");
    return cmd;
  }

  if (mode === "template") {
    const cmd: SpawnCliTemplateCommand = {
      kind: "template",
      path: "",
      vars: {},
    };
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      const next = args[i + 1];
      if (a === "--path") {
        cmd.path = String(next ?? "");
        i++;
      } else if (a === "--id") {
        cmd.id = String(next ?? "");
        i++;
      } else if (a === "--var") {
        const [k, v] = parseKV(String(next ?? ""), "--var");
        cmd.vars[k] = v;
        i++;
      } else {
        throw new Error(`Unknown flag for spawn template: ${a}`);
      }
    }
    if (!cmd.path) throw new Error("spawn template requires --path");
    return cmd;
  }

  throw new Error(`Unknown spawn kind: ${mode}`);
}

export async function executeSpawnCliCommand(
  cmd: SpawnCliCommand,
  ctx: SeedContext,
): Promise<void> {
  if (cmd.kind === "task") {
    let title = cmd.title;
    let body = cmd.body;
    let dependsOn = cmd.dependsOn.length > 0 ? cmd.dependsOn : undefined;
    let inputs = cmd.inputs.length > 0 ? cmd.inputs : undefined;
    let outputs = cmd.outputs.length > 0 ? cmd.outputs : undefined;
    let tags = cmd.tags.length > 0 ? cmd.tags : undefined;
    let vars = Object.keys(cmd.vars).length > 0 ? cmd.vars : undefined;

    // File mode: read the pre-rendered TASK.md and extract frontmatter fields.
    // The AI or seed scripts compose the full TASK.md under .converge/tmp/ and
    // reference it with --task-file. Compose-mode flags are not repeated.
    // File-mode-only fields. Compose-mode (no --task-file) doesn't carry
    // these because the AI is supposed to pass them via dedicated flags;
    // file-mode is the "ship a pre-rendered TASK.md" path, so we ferry
    // everything the spawn schema accepts.
    let skill: string | undefined;
    let checks: Array<{ id: string; cmd: string }> | undefined =
      cmd.checks.length > 0 ? cmd.checks : undefined;

    if (cmd.taskFile) {
      const { readFileSync } = await import("node:fs");
      const abs = cmd.taskFile.startsWith("/")
        ? cmd.taskFile
        : `${ctx.projectDir}/${cmd.taskFile}`;
      const raw = readFileSync(abs, "utf-8");
      const frontmatter = parseTaskMdFrontmatter(raw);
      if (!frontmatter.id) frontmatter.id = cmd.id;
      title = title ?? (frontmatter.title as string | undefined);
      dependsOn = dependsOn ?? (frontmatter.depends_on as string[] | undefined);
      inputs = inputs ?? (frontmatter.inputs as string[] | undefined);
      outputs = outputs ?? (frontmatter.outputs as string[] | undefined);
      tags = tags ?? (frontmatter.tags as string[] | undefined);
      vars = vars ?? (frontmatter.vars as Record<string, string> | undefined);
      skill = skill ?? (frontmatter.skill as string | undefined);
      if (!checks && Array.isArray(frontmatter.checks)) {
        checks = frontmatter.checks as Array<{ id: string; cmd: string }>;
      }
      // Extract body: everything after the closing `---`
      const bodyStart = raw.indexOf("---", raw.indexOf("---") + 3);
      if (bodyStart !== -1) {
        body = body ?? raw.slice(bodyStart + 3).trim();
      }
    }

    // Mustache-render {{name}} placeholders in title/body/check-commands
    // using --var pairs. Without this, file-mode TASK.md templates land in
    // the journal with unresolved {{question}}, {{epoch}}, etc. and the
    // agent sees literal template syntax. Template-mode (spawn template)
    // already renders via template-materializer; this brings file-mode to
    // parity. Checks must render too — otherwise `test -f {{questionDir}}/...`
    // never matches anything on disk and the gap-resolution loop spins.
    const varMap = vars ?? cmd.vars;
    if (varMap && Object.keys(varMap).length > 0) {
      const render = (text: string): string =>
        text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
          if (key in varMap) {
            const v = (varMap as Record<string, unknown>)[key];
            return v != null ? String(v) : match;
          }
          return match;
        });
      if (typeof title === "string") title = render(title);
      if (typeof body === "string") body = render(body);
      if (checks) {
        checks = checks.map((c) => ({ ...c, cmd: render(c.cmd) }));
      }
    }

    await ctx.spawn({
      id: cmd.id,
      title,
      depends_on: dependsOn,
      inputs,
      outputs,
      tags,
      vars,
      body,
      ...(skill ? { skills: [skill] } : {}),
      ...(checks ? { checks } : {}),
    } as any);
    return;
  }

  await ctx.spawn({
    _type: "template-ref",
    path: cmd.path,
    vars: cmd.vars,
  } as any, cmd.id ? { id: cmd.id } : undefined);
}

/** TASK.md frontmatter parser. Delegates to the `yaml` package — the previous
 *  hand-rolled implementation choked on nested arrays-of-objects (e.g. the
 *  `checks:` block), silently dropping fields we need to carry through. */
function parseTaskMdFrontmatter(
  raw: string,
): Record<string, unknown> {
  const start = raw.indexOf("---");
  if (start !== 0) return {};
  const end = raw.indexOf("---", start + 3);
  if (end === -1) return {};
  const yamlBlock = raw.slice(start + 3, end);
  try {
    const parsed = parseYaml(yamlBlock);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Malformed frontmatter — return empty so the spawn falls back to flag-only mode.
  }
  return {};
}

