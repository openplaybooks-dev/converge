import {
  parseSpawnCliLine,
  type SpawnCliCommand,
} from "@converge/core/seed/cli-spawn.ts";

export interface SpawnCommandOptions {
  positional: string[];
  options: Record<string, unknown>;
}

function getMulti(options: Record<string, unknown>, key: string): string[] {
  const v = options[key];
  if (v === undefined) return [];
  if (Array.isArray(v)) return v.map(String);
  return [String(v)];
}

function toCommandLine(kind: string, options: Record<string, unknown>): string {
  const parts: string[] = ["converge", "spawn", kind];
  const pushFlag = (flag: string, vals: string[]) => {
    for (const value of vals) parts.push(flag, value);
  };

  if (kind === "task") {
    if (options.id !== undefined) parts.push("--id", String(options.id));
    if (options.title !== undefined) parts.push("--title", String(options.title));
    pushFlag("--depends-on", getMulti(options, "depends-on"));
    pushFlag("--input", getMulti(options, "input"));
    pushFlag("--output", getMulti(options, "output"));
    pushFlag("--tag", getMulti(options, "tag"));
    pushFlag("--var", getMulti(options, "var"));
    if (options.body !== undefined) parts.push("--body", String(options.body));
    return parts.join(" ");
  }

  if (options.path !== undefined) parts.push("--path", String(options.path));
  if (options.id !== undefined) parts.push("--id", String(options.id));
  pushFlag("--var", getMulti(options, "var"));
  return parts.join(" ");
}

export async function spawnCommand({
  positional,
  options,
}: SpawnCommandOptions): Promise<void> {
  const kind = positional[0];
  if (kind !== "task" && kind !== "template") {
    throw new Error('Usage: converge spawn <task|template> [flags]');
  }

  const line = toCommandLine(kind, options);
  const parsed: SpawnCliCommand = parseSpawnCliLine(line);
  console.log(JSON.stringify(parsed, null, 2));
}

