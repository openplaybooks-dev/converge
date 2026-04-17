/**
 * Gap detection — findGaps() and runCheck().
 */

import { existsSync } from 'node:fs';
import * as path from 'node:path';
import { FactsLogger, FileChecks, ValidationRuleSets, validateFile } from '../facts/index.ts';
import type { Gap } from '../gap/types.ts';
import { GapKind } from '../gap/types.ts';
import type { Check } from '../config/task-definition.ts';
import type { Unit } from './unit.ts';
import type { CheckResult } from './types.ts';
import { getProjectRoot, getEpicId } from './helpers.ts';
import { resolveChecks, resolvePrompt, resolveAgent, resolveSkill } from './resolve.ts';
import { detectUserQuestion } from '../repair/helpers/detect-user-question.ts';
import { getJournalStructure } from '../journal/structure.ts';

/**
 * Detect whether a path contains actual glob wildcards vs literal brackets.
 * Next.js-style `[param]` directories are literal path segments, not globs.
 * Only `*`, `?`, and `{}` (brace expansion) are treated as glob indicators.
 * Brackets `[` are excluded — glob treats them as character classes and
 * returns zero matches for literal `[id]`-style directory names.
 */
function hasGlobWildcards(p: string): boolean {
  return /[*?{}]/.test(p);
}

/**
 * Find gaps - missing inputs/outputs, failed checks.
 */
export async function findGaps(unit: Unit): Promise<Gap[]> {
  const gaps: Gap[] = [];
  const projectDir = getProjectRoot(unit);
  const epicId = getEpicId(unit);
  const factsLogger = new FactsLogger(projectDir, epicId, unit.context?.fullTaskId ?? unit.id);

  // Detect if task is awaiting user input (asked a question)
  const userQuestionDetection = await detectUserQuestion(projectDir, epicId, unit.id);

  // ── Plan gap: plan.md not yet generated ────────────────────────────
  if (unit.planConfig) {
    const structure = getJournalStructure(projectDir, epicId, unit.id);
    const planPath = path.join(structure.task!, 'plan.md');
    if (!existsSync(planPath)) {
      gaps.push({
        id: `${unit.id}-plan-missing`,
        type: 'incomplete',
        level: 'task',
        scope: unit.id,
        severity: 'high',
        description: `[${unit.id}] Generating plan`,
        source: 'unit',
        detected: new Date().toISOString(),
        resolved: false,
        checks: [],
        metadata: {
          gapKind: GapKind.plan,
          unitPath: unit.path,
          taskId: unit.id,
          taskTitle: unit.title,
        },
      });
      // Return early — plan must be generated before checking outputs/WBS
      return gaps;
    }
  }

  // ── WBS gap: subtasks not yet seeded ───────────────────────────────
  if (unit.wbsFn) {
    const structure = getJournalStructure(projectDir, epicId, unit.id);
    const wbsJsonPath = path.join(structure.task!, 'wbs.json');
    if (!existsSync(wbsJsonPath)) {
      gaps.push({
        id: `${unit.id}-wbs-not-seeded`,
        type: 'incomplete',
        level: 'task',
        scope: unit.id,
        severity: 'high',
        description: `[${unit.id}] WBS subtasks not yet seeded`,
        source: 'unit',
        detected: new Date().toISOString(),
        resolved: false,
        checks: [],
        metadata: {
          gapKind: GapKind.wbs,
          unitPath: unit.path,
          taskId: unit.id,
          taskTitle: unit.title,
        },
      });
    }
    // WBS parent delegates output production to children — skip output/check
    // validation here. The rollup logic handles parent completion after all
    // children finish.
    return gaps;
  }

  // Check inputs exist (with Facts API)
  for (const input of unit.inputs || []) {
    // Handle glob patterns (but not literal bracket paths like [id])
    if (hasGlobWildcards(input)) {
      const { glob } = await import('glob');
      const matches = await glob(input, { cwd: projectDir });

      const fact = await factsLogger.collectFact({
        type: 'glob-check',
        pattern: input,
        cmd: `ls ${input} 2>/dev/null | head -1`,
        matchCount: matches.length
      });

      if (matches.length === 0) {
        gaps.push({
          id: `${unit.id}-missing-input-${input}`,
          type: 'missing-dependency',
          level: 'task',
          scope: unit.id,
          severity: 'high',
          description: `[${unit.id}] Missing required input: ${input}`,
          source: 'unit',
          detected: new Date().toISOString(),
          resolved: false,
          checks: [],
          metadata: {
            gapKind: GapKind.blocker,
            unitPath: unit.path,
            taskId: unit.id,
            taskTitle: unit.title,
            factId: fact.id,
          },
        });
      }
    } else {
      const absInputPath = path.join(projectDir, input);
      const existsOnDisk = existsSync(absInputPath);

      const fact = await factsLogger.collectFact({
        type: 'file-exists',
        path: input,
        cmd: FileChecks.exists(input)
      });

      if (!existsOnDisk) {
        gaps.push({
          id: `${unit.id}-missing-input-${input}`,
          type: 'missing-dependency',
          level: 'task',
          scope: unit.id,
          severity: 'high',
          description: `[${unit.id}] Missing required input: ${input}`,
          source: 'unit',
          detected: new Date().toISOString(),
          resolved: false,
          checks: [],
          metadata: {
            gapKind: GapKind.blocker,
            unitPath: unit.path,
            taskId: unit.id,
            taskTitle: unit.title,
            factId: fact.id,
          },
        });
      }
    }
  }

  // Check outputs exist with validation (Facts API)
  for (const output of unit.outputs || []) {
    // Handle glob patterns (but not literal bracket paths like [id])
    if (hasGlobWildcards(output)) {
      const { glob } = await import('glob');
      const matches = await glob(output, { cwd: projectDir });

      const fact = await factsLogger.collectFact({
        type: 'glob-check',
        pattern: output,
        cmd: `ls ${output} 2>/dev/null | head -1`,
        matchCount: matches.length
      });

      if (matches.length === 0) {
        gaps.push({
          id: `${unit.id}-missing-output-${output}`,
          type: 'incomplete',
          level: 'task',
          scope: unit.id,
          severity: 'high',
          description: `[${unit.id}] Task output not created: ${output}`,
          source: 'unit',
          detected: new Date().toISOString(),
          resolved: false,
          checks: [],
          metadata: {
            gapKind: GapKind.output,
            unitPath: unit.path,
            taskId: unit.id,
            taskTitle: unit.title,
            taskPrompt: await resolvePrompt(unit),
            taskAgent: resolveAgent(unit),
            taskSkill: resolveSkill(unit),
            taskInputs: unit.inputs,
            factId: fact.id,
            // User question detection
            awaitingUserInput: userQuestionDetection.awaitingUserInput,
            userQuestion: userQuestionDetection.question,
            userQuestionOptions: userQuestionDetection.options,
          },
        });
      }
    } else {
      const absOutputPath = path.join(projectDir, output);
      const outputExistsOnDisk = existsSync(absOutputPath);

      const existsFact = await factsLogger.collectFact({
        type: 'file-exists',
        path: output,
        cmd: FileChecks.exists(output)
      });

      if (!outputExistsOnDisk) {
        gaps.push({
          id: `${unit.id}-missing-output-${output}`,
          type: 'incomplete',
          level: 'task',
          scope: unit.id,
          severity: 'high',
          description: `[${unit.id}] Task output not created: ${output}`,
          source: 'unit',
          detected: new Date().toISOString(),
          resolved: false,
          checks: [],
          metadata: {
            gapKind: GapKind.output,
            unitPath: unit.path,
            taskId: unit.id,
            taskTitle: unit.title,
            taskPrompt: await resolvePrompt(unit),
            taskAgent: resolveAgent(unit),
            taskSkill: resolveSkill(unit),
            taskInputs: unit.inputs,
            factId: existsFact.id,
            // User question detection
            awaitingUserInput: userQuestionDetection.awaitingUserInput,
            userQuestion: userQuestionDetection.question,
            userQuestionOptions: userQuestionDetection.options,
          },
        });
      } else {
        // File exists - validate based on extension
        const ext = path.extname(output).toLowerCase();
        let validationResult: Awaited<ReturnType<typeof validateFile>> | null = null;

        if (ext === '.png') {
          validationResult = await validateFile(
            output,
            ValidationRuleSets.png(output),
            projectDir,
            factsLogger
          );
        } else if (ext === '.jpg' || ext === '.jpeg') {
          validationResult = await validateFile(
            output,
            [
              { id: 'exists', description: 'File exists', cmd: FileChecks.exists(output) },
              { id: 'non-empty', description: 'File is non-empty', cmd: FileChecks.nonEmpty(output) },
              { id: 'valid-jpeg', description: 'File has JPEG magic bytes', cmd: FileChecks.isJPEG(output) }
            ],
            projectDir,
            factsLogger
          );
        } else if (ext === '.html' || ext === '.htm') {
          validationResult = await validateFile(
            output,
            ValidationRuleSets.html(output),
            projectDir,
            factsLogger
          );
        } else if (ext === '.json') {
          validationResult = await validateFile(
            output,
            ValidationRuleSets.json(output),
            projectDir,
            factsLogger
          );
        }

        // If validation failed, add corruption gap
        if (validationResult && !validationResult.valid) {
          gaps.push({
            id: `${unit.id}-corrupted-output-${output}`,
            type: 'incomplete',
            level: 'task',
            scope: unit.id,
            severity: 'high',
            description: `[${unit.id}] Task output corrupted or invalid: ${output} (${validationResult.failures.map(f => f.id).join(', ')})`,
            source: 'unit',
            detected: new Date().toISOString(),
            resolved: false,
            checks: [],
            metadata: {
              gapKind: GapKind.corrupted,
              unitPath: unit.path,
              taskId: unit.id,
              taskTitle: unit.title,
              validationFailures: validationResult.failures,
            },
          });
        }
      }
    }
  }

  // Run checks (resolve dynamically)
  const checks = await resolveChecks(unit);
  for (const check of checks) {
    const result = await runCheck(unit, check);
    if (!result.passed) {
      gaps.push(...result.gaps);
    }
  }

  return gaps;
}

/**
 * Run a single check using Facts API.
 * Includes check self-healing: when a check fails because the binary is
 * missing (exit 127 / "command not found"), auto-patches SKILL.md and
 * re-runs the check immediately with the repaired command.
 */
export async function runCheck(unit: Unit, check: { id: string; cmd?: string; description?: string }): Promise<CheckResult> {
  if (!check.cmd) {
    return { passed: true, gaps: [] };
  }

  const projectDir = getProjectRoot(unit);
  const epicId = getEpicId(unit);
  const factsLogger = new FactsLogger(projectDir, epicId, unit.context?.fullTaskId ?? unit.id);

  let activeCmd = check.cmd;
  let fact = await factsLogger.collectFact({
    type: 'check',
    checkId: check.id,
    cmd: activeCmd,
    description: check.description
  });

  // ── Check self-healing is now handled by the repair system ─────────
  // Broken commands (exit 127) are sent to ToolEnvironmentRepairStrategy
  // which uses AI to analyze and determine the best fix.
  // ──────────────────────────────────────────────────────────────────

  if (fact.ok) {
    return { passed: true, gaps: [] };
  } else {
    return {
      passed: false,
      gaps: [{
        id: `${unit.id}-check-failed-${check.id}`,
        type: 'incomplete',
        level: 'task',
        scope: unit.id,
        severity: 'high',
        description: `[${unit.id}] Check failed: ${check.description || check.id}`,
        source: 'unit',
        detected: new Date().toISOString(),
        resolved: false,
        checks: [],
        metadata: {
          gapKind: GapKind.checkFailed,
          checkId: check.id,
          checkCmd: activeCmd,
          checkDescription: check.description,
          checkOutput: fact.output,
          checkExitCode: fact.exitCode,
          taskPrompt: await resolvePrompt(unit),
          taskAgent: resolveAgent(unit),
          taskSkill: resolveSkill(unit),
          taskId: unit.id,
          taskTitle: unit.title,
          unitPath: unit.path,
          factId: fact.id,
        },
      }],
    };
  }
}
