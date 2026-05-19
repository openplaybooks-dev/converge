import { join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { agentfn } from "@openplaybooks/agentfn";
import { z } from "zod";
import type { SeedFn, SeedContext } from "../config/task-definition.ts";
import { READONLY_TOOLS } from "../ai/context.ts";
import {
  coerceStructuredSpawn,
  executeSpawnCliCommand,
  parseSpawnCliLine,
  SPAWN_TASK_FLAGS,
  type SpawnCliCommand,
} from "../seed/cli-spawn.ts";

/**
 * Create a SeedFn that asks AI to emit explicit `converge spawn ...` commands.
 * The emitted commands are validated and executed in-process (no shell eval).
 *
 * Two emission forms are accepted (RFC 0002):
 *   - String form (legacy): "converge spawn template --path X --var k=v"
 *   - Structured form (preferred): { kind: "template", path: X, vars: { k: "v" } }
 * The structured form bypasses shell tokenisation entirely — required
 * whenever a value contains spaces, quotes, or non-ASCII characters.
 */
export function createCliSeedFn(prompt: string): SeedFn {
  return async (ctx: SeedContext): Promise<void> => {
    const SpawnTemplateObject = z.object({
      kind: z.literal("template"),
      path: z.string(),
      id: z.string().optional(),
      vars: z.record(z.string(), z.string()).optional(),
    });
    const SpawnTaskObject = z.object({
      kind: z.literal("task"),
      id: z.string(),
      title: z.string().optional(),
      taskFile: z.string().optional(),
      parent: z.string().optional(),
      dependsOn: z.array(z.string()).optional(),
      inputs: z.array(z.string()).optional(),
      outputs: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      vars: z.record(z.string(), z.string()).optional(),
      checks: z.array(z.object({ id: z.string(), cmd: z.string() })).optional(),
      body: z.string().optional(),
    });
    const SpawnCommandSchema = z.union([
      z.string(),
      SpawnTemplateObject,
      SpawnTaskObject,
    ]);

    const CmdSchema = z.object({
      commands: z.union([z.array(SpawnCommandSchema), z.string()]),
      done: z.boolean().optional(),
      reasoning: z.string().optional(),
    });

    const optionalFlags = SPAWN_TASK_FLAGS.filter((flag) => flag !== "--id")
      .map((flag) => `[${flag} <value>]`)
      .join(" ");

    const seedPrompt = [
      "Generate only explicit CLI spawn commands for Converge.",
      "",
      "You may emit each entry in `commands` in two forms:",
      "",
      "1) Shell-string form (legacy, fine for simple ASCII values):",
      `   - converge spawn task --id <id> ${optionalFlags}`,
      "   - converge spawn template --path <template-path> [--id <id>] [--var k=v]",
      "",
      "2) Structured-object form (PREFERRED when any value contains spaces,",
      "   quotes, slashes, or non-ASCII characters):",
      '   { "kind": "template", "path": "<template-path>", "id": "<id>",',
      '     "vars": { "k": "v with spaces", "k2": "v2" } }',
      '   { "kind": "task", "id": "<id>", "title": "<title>",',
      '     "vars": { "k": "v" }, "dependsOn": ["..."], "inputs": ["..."],',
      '     "outputs": ["..."], "tags": ["..."],',
      '     "checks": [{ "id": "...", "cmd": "..." }], "body": "..." }',
      "",
      "Rules:",
      "- IDs must be deterministic and stable for same input.",
      "- Do not output shell wrappers; output only converge spawn commands.",
      "- Emit at least one command when work is needed.",
      "- Prefer structured-object form whenever any var value is non-trivial.",
      "",
      "TASK INSTRUCTION:",
      prompt,
    ].join("\n");

    const playbook = process.env.CONVERGE_PLAYBOOK || "default";
    const taskId = String(
      (ctx.vars as Record<string, unknown>).taskId || "unknown-seed-task",
    );
    const journalTaskDir = join(
      ctx.projectDir,
      ".converge",
      "journal",
      playbook,
      "tasks",
      taskId,
    );
    const logDir = join(journalTaskDir, "logs");
    await mkdir(logDir, { recursive: true });

    type RawCommand =
      | string
      | z.infer<typeof SpawnTemplateObject>
      | z.infer<typeof SpawnTaskObject>;

    const executor = agentfn<{
      commands: RawCommand[] | string;
      done?: boolean;
      reasoning?: string;
    }>({
      prompt: seedPrompt,
      schema: CmdSchema,
      allowedTools: [...READONLY_TOOLS, "Bash"],
      timeoutMs: 600_000,
      cwd: ctx.projectDir,
      logDir,
    });

    const result = await executor();
    const rawCommands = result.data.commands;
    // Normalise: agents may emit a single newline-separated string of legacy
    // shell-form commands. Split into individual entries; structured forms
    // are always passed as array elements.
    const commands: RawCommand[] = Array.isArray(rawCommands)
      ? rawCommands
      : rawCommands
          .split("\n")
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0);

    await mkdir(journalTaskDir, { recursive: true });

    const rawPath = join(journalTaskDir, "seed.commands.raw.md");
    const parsedPath = join(journalTaskDir, "seed.commands.validated.json");
    const executedPath = join(journalTaskDir, "seed.commands.executed.jsonl");

    const rawLines = commands.map((c) =>
      typeof c === "string" ? c : JSON.stringify(c),
    );
    await writeFile(rawPath, rawLines.join("\n") + "\n", "utf-8");

    const parsed: Array<{ line: string; parsed: SpawnCliCommand }> = commands.map(
      (c) => {
        if (typeof c === "string") {
          return { line: c, parsed: parseSpawnCliLine(c) };
        }
        return { line: JSON.stringify(c), parsed: coerceStructuredSpawn(c) };
      },
    );
    await writeFile(parsedPath, JSON.stringify(parsed, null, 2), "utf-8");

    const executedLines: string[] = [];
    for (const item of parsed) {
      await executeSpawnCliCommand(item.parsed, ctx);
      executedLines.push(JSON.stringify({ command: item.line, status: "ok" }));
    }
    await writeFile(executedPath, executedLines.join("\n") + "\n", "utf-8");

    if (parsed.length === 0 && result.data.done !== true) {
      throw new Error("CLI seed emitted zero spawn commands without done=true");
    }
  };
}
