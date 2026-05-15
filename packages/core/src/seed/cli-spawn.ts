import type { SeedContext } from "../config/task-definition.ts";

export interface SpawnCliTaskCommand {
  kind: "task";
  id: string;
  title?: string;
  dependsOn: string[];
  inputs: string[];
  outputs: string[];
  tags: string[];
  vars: Record<string, string>;
  body?: string;
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
    await ctx.spawn({
      id: cmd.id,
      title: cmd.title,
      depends_on: cmd.dependsOn.length > 0 ? cmd.dependsOn : undefined,
      inputs: cmd.inputs.length > 0 ? cmd.inputs : undefined,
      outputs: cmd.outputs.length > 0 ? cmd.outputs : undefined,
      tags: cmd.tags.length > 0 ? cmd.tags : undefined,
      vars: Object.keys(cmd.vars).length > 0 ? cmd.vars : undefined,
      body: cmd.body,
    });
    return;
  }

  await ctx.spawn({
    _type: "template-ref",
    path: cmd.path,
    vars: cmd.vars,
  } as any, cmd.id ? { id: cmd.id } : undefined);
}
