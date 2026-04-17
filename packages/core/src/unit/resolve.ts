/**
 * Resolution helpers — createTaskContext, resolveChecks, resolvePrompt, resolveAgent, resolveSkill.
 */

import type { TaskContext, Check, CheckEntry } from '../config/task-definition.ts';
import type { Unit } from './unit.ts';

/**
 * Create task context for callback evaluation.
 */
export function createTaskContext(unit: Unit): TaskContext {
  return {
    level: 'task',
    taskId: unit.id,
    projectDir: unit.getProjectRoot(),
    vars: unit.vars || {},
  };
}

/**
 * Resolve checks (supports callbacks and backward compat).
 * Handles three forms:
 *   - Full callback:  `(ctx) => CheckEntry[]`
 *   - Mixed array:    `Array<Check | ((ctx) => Check)>`
 *   - Static array:   `Check[]`
 *
 * Also sanitizes check commands for Windows compatibility before returning.
 */
export async function resolveChecks(unit: Unit): Promise<Check[]> {
  if (!unit.checks) {
    return (unit.vars?.inlineChecks as any[]) || [];
  }
  const ctx = createTaskContext(unit);
  const entries: CheckEntry[] = typeof unit.checks === 'function'
    ? await unit.checks(ctx)
    : unit.checks;
  // Resolve any per-entry callbacks in the array
  const checks = await Promise.all(
    entries.map(e => {
      if (typeof e === 'function') return (e as (ctx: TaskContext) => Check | Promise<Check>)(ctx);
      return e as Check;
    })
  );
  return checks.map(sanitizeCheck);
}

/**
 * Patch a single check command for cross-platform compatibility.
 * Catches known Windows-incompatible patterns before they ever run,
 * avoiding wasted AI repair cycles.
 */
function sanitizeCheck(check: Check): Check {
  if (!check.cmd) return check;
  const patched = sanitizeCheckCmd(check.cmd);
  if (patched === check.cmd) return check;
  console.log(`   🔧 Sanitized check '${check.id}': replaced Windows-incompatible command`);
  return { ...check, cmd: patched };
}

/**
 * Replace known Windows-incompatible shell patterns with portable Node.js equivalents.
 *
 * Current rules:
 *  - /dev/stdin in a while-read loop → node reads the file directly
 *
 * Add new rules here when new incompatible patterns are discovered.
 */
function sanitizeCheckCmd(cmd: string): string {
  // Pattern: "while IFS= read -r line; do echo "$line" | node -e '...JSON.parse.../dev/stdin...' || exit 1; done < FILE"
  // /dev/stdin is not reliably available in Node.js on Windows Git Bash.
  if (cmd.includes('/dev/stdin')) {
    const fileMatch = cmd.match(/<\s*(\S+)\s*$/);
    if (fileMatch) {
      const file = fileMatch[1];
      if (/JSON\.parse/i.test(cmd)) {
        return `node -e "require('fs').readFileSync('${file}','utf8').split('\\n').filter(l=>l.trim()).forEach(l=>JSON.parse(l))"`;
      }
    }
  }
  return cmd;
}

/**
 * Resolve prompt (supports callbacks and backward compat).
 */
export async function resolvePrompt(unit: Unit): Promise<string | undefined> {
  if (unit.prompt) {
    if (typeof unit.prompt === 'function') {
      const ctx = createTaskContext(unit);
      return await unit.prompt(ctx);
    }
    return unit.prompt;
  }
  // Backward compat: fall back to vars.prompt
  return unit.vars?.prompt as string | undefined;
}

/**
 * Resolve agent (backward compat with vars).
 */
export function resolveAgent(unit: Unit): string | undefined {
  return unit.agent || (unit.vars?.agent as string | undefined);
}

/**
 * Resolve skill (backward compat with vars).
 */
export function resolveSkill(unit: Unit): string | string[] | undefined {
  if (unit.skill) return unit.skill;
  return (unit.vars?.skill as string | string[] | undefined) || (unit.vars?.skills as string[] | undefined);
}
