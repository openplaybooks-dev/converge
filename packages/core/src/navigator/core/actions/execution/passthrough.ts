/**
 * Shared passthrough utilities for mode handlers (spawner, converger).
 *
 * Extracts ```bash fences from TASK.md body and executes them as a
 * single shell script. Used by both run-spawner.ts and run-converger.ts
 * so passthrough bodies work uniformly across task modes.
 */

import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import type { ActionHandler } from "../../types.ts";

/**
 * Resolve the TASK.md path for a unit. Checks source_path, journal_path,
 * then falls back to unit.path.
 */
export function resolveTaskMdPath(unit: any): string | undefined {
  const sourcePath = unit.source_path;
  const journalPath = unit.journal_path;
  if (sourcePath && existsSync(sourcePath)) return sourcePath;
  if (journalPath && existsSync(journalPath)) return journalPath;
  if (unit.path) {
    if (existsSync(unit.path) && unit.path.endsWith("TASK.md")) {
      return unit.path;
    }
    const taskMdPath = join(unit.path, "TASK.md");
    if (existsSync(taskMdPath)) {
      return taskMdPath;
    }
  }
  return undefined;
}

/**
 * Execute a passthrough body: extract ```bash fence(s) from TASK.md and
 * run them as a single shell script.
 */
export async function runPassthroughBody(
  snap: Parameters<ActionHandler>[0],
  parsed: { body?: string },
  label = "passthrough",
): Promise<boolean> {
  try {
    const body = parsed?.body ?? "";
    const commands = extractShellCommands(body);
    if (commands.length === 0) return false;

    console.log(
      `   ⚡ Passthrough (${label}): running ${commands.length} shell command(s) as single script`,
    );

    const envSetup =
      'export PATH="$(pwd)/node_modules/.bin:$PATH"\n' +
      'if [ -n "${CONVERGE_BIN:-}" ] && [ -f "$CONVERGE_BIN" ]; then\n' +
      '  converge() { node "$CONVERGE_BIN" "$@"; }\n' +
      "  export -f converge 2>/dev/null || true\n" +
      "fi\n";

    const script = envSetup + commands.join("\n");
    const bashShell = process.platform === "win32" ? "bash" : "/bin/bash";
    execSync(script, {
      cwd: snap.projectDir,
      stdio: "inherit",
      timeout: 120_000,
      shell: bashShell,
      env: process.env as NodeJS.ProcessEnv,
    });
    return true;
  } catch {
    return false;
  }
}

/** Extract shell commands from fenced ```bash / ```sh / ```shell blocks. */
export function extractShellCommands(body: string): string[] {
  const commands: string[] = [];
  const fenceRegex = /```(?:bash|sh|shell)?\s*\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = fenceRegex.exec(body)) !== null) {
    const raw = match[1].trim();
    if (raw.length > 0) commands.push(raw);
  }
  return commands;
}
