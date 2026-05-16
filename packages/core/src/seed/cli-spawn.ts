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
      if (frontmatter.checks) {
        // checks are already parsed from flags; file-mode checks supplement
      }
      // Extract body: everything after the closing `---`
      const bodyStart = raw.indexOf("---", raw.indexOf("---") + 3);
      if (bodyStart !== -1) {
        body = body ?? raw.slice(bodyStart + 3).trim();
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
    });
    return;
  }

  await ctx.spawn({
    _type: "template-ref",
    path: cmd.path,
    vars: cmd.vars,
  } as any, cmd.id ? { id: cmd.id } : undefined);
}

/** Lightweight TASK.md frontmatter parser — avoids pulling in full YAML. */
function parseTaskMdFrontmatter(
  raw: string,
): Record<string, unknown> {
  const start = raw.indexOf("---");
  if (start !== 0) return {};
  const end = raw.indexOf("---", start + 3);
  if (end === -1) return {};
  const yaml = raw.slice(start + 3, end);
  const out: Record<string, unknown> = {};
  const lines = yaml.split("\n");
  const stack: Array<{ key: string; isArray: boolean; parent: Record<string, unknown> }> = [];
  for (let line of lines) {
    const trimmed = line.trimEnd();
    if (!trimmed.trim()) continue;
    const indent = line.length - line.trimStart().length;
    while (stack.length > 0 && stack[stack.length - 1].key !== "" && indent <= indentOf(line)) {
      // pop is implicit — tracked by reusing current parent
    }
    const isListItem = trimmed.trimStart().startsWith("- ");
    if (isListItem) {
      const value = trimmed.trim().slice(2).trim();
      const parentEntry = stack[stack.length - 1];
      if (parentEntry && parentEntry.isArray) {
        const arr = parentEntry.parent[parentEntry.key] as Array<unknown>;
        arr.push(parseValue(value));
      }
      continue;
    }
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    const rawValue = trimmed.slice(colonIdx + 1).trim();
    if (rawValue === "" || rawValue === ">" || rawValue === "|-" || rawValue === "|") {
      out[key] = "";
      continue;
    }
    if (rawValue === "[]" || (rawValue.startsWith("[") && rawValue.endsWith("]"))) {
      const arr: unknown[] = [];
      out[key] = arr;
      // Push onto stack so subsequent `- ` lines append here
      // But we can only track one active array for now — suffice for our use.
      if (stack.length === 0) stack.push({ key, isArray: true, parent: out });
      continue;
    }
    out[key] = parseValue(rawValue);
  }
  return out;
}

function indentOf(line: string): number {
  return line.length - line.trimStart().length;
}

function parseValue(raw: string): unknown {
  const v = raw.replace(/^['"](.*)['"]$/, "$1");
  if (v === "true") return true;
  if (v === "false") return false;
  if (v === "null" || v === "~") return null;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}
