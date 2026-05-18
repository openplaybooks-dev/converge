import { join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { agentfn } from "@openplaybooks/converge-agentfn";
import { z } from "zod";
import type { SeedFn, SeedContext } from "../config/task-definition.ts";
import { READONLY_TOOLS } from "../ai/context.ts";
import { executeSpawnCliCommand, parseSpawnCliLine, SPAWN_TASK_FLAGS } from "../seed/cli-spawn.ts";

/**
 * Create a SeedFn that asks AI to emit explicit `converge spawn ...` commands.
 * The emitted commands are validated and executed in-process (no shell eval).
 */
export function createCliSeedFn(prompt: string): SeedFn {
  return async (ctx: SeedContext): Promise<void> => {
    const CmdSchema = z.object({
      commands: z.union([z.array(z.string()), z.string()]),
      done: z.boolean().optional(),
      reasoning: z.string().optional(),
    });

    const optionalFlags = SPAWN_TASK_FLAGS.filter((flag) => flag !== "--id")
      .map((flag) => `[${flag} <value>]`)
      .join(" ");

    const seedPrompt = [
      "Generate only explicit CLI spawn commands for Converge.",
      "Use one command per line in the `commands` array.",
      "",
      "Allowed commands:",
      `1) converge spawn task --id <id> ${optionalFlags}`,
      "2) converge spawn template --path <template-path> [--id <id>] [--var k=v]",
      "",
      "Rules:",
      "- IDs must be deterministic and stable for same input.",
      "- Do not output shell wrappers; output only converge spawn commands.",
      "- Emit at least one command when work is needed.",
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

    const executor = agentfn<{
      commands: string[] | string;
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
    const commands: string[] = Array.isArray(rawCommands)
      ? rawCommands
      : rawCommands
          .split("\n")
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0);

    await mkdir(journalTaskDir, { recursive: true });

    const rawPath = join(journalTaskDir, "seed.commands.raw.md");
    const parsedPath = join(journalTaskDir, "seed.commands.validated.json");
    const executedPath = join(journalTaskDir, "seed.commands.executed.jsonl");

    await writeFile(rawPath, commands.join("\n") + "\n", "utf-8");

    const parsed = commands.map((line) => ({
      line,
      parsed: parseSpawnCliLine(line),
    }));
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
