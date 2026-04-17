/**
 * prepareFeedback
 *
 * Writes FEEDBACK.md into the attempt dir before task-run retries,
 * so the AI gets exact check results (pass/fail, command, exit code, output)
 * and targeted instructions for broken commands.
 *
 * FEEDBACK.md is distinct from CHECK.result.md:
 *   - CHECK.result.md — authoritative post-execution artifact written by
 *     result-snapshot.ts after the AI finishes. Fundamental, computed.
 *   - FEEDBACK.md — optional pre-retry context written here before the
 *     next attempt, so the AI knows what failed and how to fix it.
 *
 * Only acts on check-failed gaps — other gap types (missing output, input,
 * blocker) are fully described by TASK.md + gap metadata; no extra file needed.
 */

import { writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Gap } from '../gap/types.ts';
import { isBrokenCommand } from '../lifecycle/check-healer.ts';
import type { CheckRunResult } from '../lifecycle/after.ts';

export async function prepareFeedback(gap: Gap, projectDir: string): Promise<void> {
  const gapKind = (gap.metadata?.gapKind as string) ?? '';
  if (gapKind !== 'check-failed') return;

  const attemptDir = process.env.HARNESS_TASK_ATTEMPT_DIR;
  if (!attemptDir) return;

  // Read check.json to get ALL check definitions for this task
  const checkJsonPath = join(attemptDir, 'data', 'check.json');
  let allChecks: Array<{ id: string; description: string; cmd: string }> = [];
  if (existsSync(checkJsonPath)) {
    try {
      const manifest = JSON.parse(await readFile(checkJsonPath, 'utf-8'));
      allChecks = manifest.checks ?? [];
    } catch { /* fall through to gap metadata */ }
  }

  // Fallback: use the single failing check from gap metadata
  if (allChecks.length === 0) {
    const checkId = (gap.metadata?.checkId as string) ?? 'unknown';
    const checkCmd = (gap.metadata?.checkCmd as string) ?? '';
    const checkDescription = (gap.metadata?.checkDescription as string) ?? checkId;
    if (checkCmd) {
      allChecks = [{ id: checkId, description: checkDescription, cmd: checkCmd }];
    }
  }

  if (allChecks.length === 0) return;

  // Run ALL checks fresh and collect results
  const { check } = await import('../facts/api.ts');
  const results: Array<{ id: string; description: string; cmd: string; passed: boolean; exitCode: number; output: string; broken: boolean }> = [];

  for (const c of allChecks) {
    if (!c.cmd) continue;
    try {
      const r = await check(c.cmd, projectDir, 15_000);
      const fakeResult: CheckRunResult = {
        id: c.id, description: c.description, cmd: c.cmd,
        passed: r.ok, exitCode: r.exitCode, stdout: r.output, stderr: '', durationMs: 0,
      };
      results.push({
        ...c, passed: r.ok, exitCode: r.exitCode,
        output: r.output, broken: !r.ok && isBrokenCommand(fakeResult),
      });
    } catch (err: any) {
      results.push({ ...c, passed: false, exitCode: 1, output: err.message, broken: false });
    }
  }

  const failed = results.filter(r => !r.passed);
  if (failed.length === 0) return; // all passed — nothing to report

  // Build FEEDBACK.md
  const lines: string[] = [
    '# FEEDBACK.md — Check Results', '',
    `**Status**: ❌ ${failed.length}/${results.length} check(s) failed`, '',
  ];

  // Summary
  for (const r of results) {
    lines.push(`- ${r.passed ? '✅' : '❌'} **${r.id}**`);
  }
  lines.push('');

  // Failed check details
  for (const r of failed) {
    lines.push(`## ❌ ${r.id}`, '');
    lines.push(`**Command**: \`${r.cmd}\``);
    lines.push(`**Exit code**: ${r.exitCode}`);
    if (r.output) {
      lines.push('**Output**:', '```', r.output.trim(), '```');
    }
    lines.push('');

    if (r.broken) {
      lines.push(
        '> **BROKEN COMMAND** — The check command itself cannot run.',
        '> This is NOT a code problem. Fix the `cmd` in the source TASK.md',
        `> (in \`.harness/epics/\`). Look for the check with id \`${r.id}\`.`,
        '> Replace absolute/platform-specific paths with portable commands.',
        `> Example: \`grep -q "pattern" "file.tsx"\``,
        '',
      );
    }
  }

  await writeFile(join(attemptDir, 'FEEDBACK.md'), lines.join('\n'));
  console.log(`   📋 FEEDBACK.md written (${failed.length} check(s) failed)`);
}
