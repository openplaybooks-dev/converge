/**
 * Gap detection — findGaps() and runCheck().
 */

import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import YAML from "yaml";
import {
  FactsLogger,
  FileChecks,
  ValidationRuleSets,
  validateFile,
} from "../facts/index.ts";
import type { Gap } from "../gap/types.ts";
import { GapKind } from "../gap/types.ts";
import type { Unit } from "./unit.ts";
import type { CheckResult } from "./types.ts";
import { getProjectRoot, getEpicId } from "./helpers.ts";
import {
  resolveChecks,
  resolvePrompt,
  resolveAgent,
  resolveTaskAI,
  resolveSkill,
} from "./resolve.ts";
import { detectUserQuestion } from "../../navigator/repair/helpers/detect-user-question.ts";
import { getJournalStructure } from "../../journal/structure.ts";
import { cleanOutputPath, cacheOutputs } from "../../config/task-md-definition.ts";

/**
 * Detect whether a path contains actual glob wildcards vs literal brackets.
 * Next.js-style `[param]` directories are literal path segments, not globs.
 * Only `*`, `?` are treated as glob indicators.
 * `<...>` is template variable syntax — treated as non-glob (runtime-resolved).
 * Brackets `[` are excluded — glob treats them as character classes and
 * returns zero matches for literal `[id]`-style directory names.
 */
function hasGlobWildcards(p: string): boolean {
  return /[*?]/.test(p);
}

/**
 * Returns true if the path contains template variable syntax `{{...}}` (handlebars).
 * Template variables are runtime-resolved and should not be checked
 * for existence during gap detection.
 */
function hasTemplateVars(p: string): boolean {
  return /\{\{[^}]+\}\}/.test(p);
}

function resolveProjectPath(projectDir: string, p: string): string {
  return path.isAbsolute(p) ? p : path.join(projectDir, p);
}

function displayPath(projectDir: string, p: string): string {
  return path.isAbsolute(p) ? path.relative(projectDir, p) || p : p;
}

/**
 * Re-read `outputs:` and `inputs:` from the materialized journal TASK.md.
 * The in-memory Unit caches what TASK.md said at *task-load time*; when an
 * operator (or another task) edits TASK.md mid-run, that cache is stale and
 * findGaps() will report missing-output gaps for paths the spec no longer
 * declares. Re-reading the frontmatter here keeps the gap detector honest.
 *
 * Returns null if no fresh frontmatter is available (legacy Seed subtasks
 * without TASK.md, or unparseable YAML), in which case the caller should
 * fall back to the in-memory Unit.
 */
function reReadOutputsAndInputsFromTaskMd(
  projectDir: string,
  epicId: string,
  taskId: string,
  unitPath?: string,
): { outputs?: string[]; inputs?: string[]; deletedOutputs?: string[] } | null {
  try {
    const structure = getJournalStructure(projectDir, epicId, taskId);
    const candidates = [
      unitPath && unitPath.endsWith("TASK.md") ? unitPath : undefined,
      unitPath && !unitPath.endsWith("TASK.md") ? path.join(unitPath, "TASK.md") : undefined,
      structure.task ? path.join(structure.task, "TASK.md") : undefined,
    ].filter((p): p is string => Boolean(p));
    const taskMdPath = candidates.find((p) => existsSync(p));
    if (!taskMdPath) return null;
    const raw = readFileSync(taskMdPath, "utf-8");
    const m = raw.match(/^---\n([\s\S]*?)\n---/);
    if (!m) return null;
    const parsed = YAML.parse(m[1]);
    if (!parsed || typeof parsed !== "object") return null;
    const out: { outputs?: string[]; inputs?: string[]; deletedOutputs?: string[] } = {};
    if (Array.isArray(parsed.outputs)) {
      const rawOutputs = parsed.outputs.filter(
        (s: unknown): s is string => typeof s === "string",
      );
      out.outputs = rawOutputs.map(cleanOutputPath);
      const deleted = rawOutputs
        .filter((s: string) => /\s+\(deleted\b[^)]*\)$/.test(s))
        .map(cleanOutputPath);
      if (deleted.length > 0) out.deletedOutputs = deleted;
    }
    if (Array.isArray(parsed.inputs)) {
      out.inputs = parsed.inputs.filter(
        (s: unknown): s is string => typeof s === "string",
      );
    }
    return out.outputs || out.inputs ? out : null;
  } catch {
    return null;
  }
}

async function checkInputs(
  inputs: string[],
  projectDir: string,
  unit: Unit,
  factsLogger: FactsLogger,
  gaps: Gap[],
  deletedOutputs?: Set<string>,
): Promise<void> {
  for (const input of inputs) {
    // If this input is also declared as a (deleted) output, the task itself
    // deleted it. Don't block — the deletion was intentional.
    if (deletedOutputs?.has(input)) continue;

    // Skip paths with template variables — runtime-resolved, not checkable at plan time
    if (hasTemplateVars(input)) continue;

    if (hasGlobWildcards(input)) {
      const { glob } = await import("glob");
      const matches = await glob(input, { cwd: projectDir });

      const fact = await factsLogger.collectFact({
        type: "glob-check",
        pattern: input,
        cmd: `ls ${input} 2>/dev/null | head -1`,
        matchCount: matches.length,
      });

      if (matches.length === 0) {
        gaps.push({
          id: `${unit.id}-missing-input-${input}`,
          type: "missing-dependency",
          level: "task",
          scope: unit.id,
          severity: "high",
          description: `[${unit.id}] Missing required input: ${input}`,
          source: "unit",
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
      const absInputPath = resolveProjectPath(projectDir, input);
      const existsOnDisk = existsSync(absInputPath);

      const fact = await factsLogger.collectFact({
        type: "file-exists",
        path: input,
        cmd: FileChecks.exists(input),
      });

      if (!existsOnDisk) {
        gaps.push({
          id: `${unit.id}-missing-input-${input}`,
          type: "missing-dependency",
          level: "task",
          scope: unit.id,
          severity: "high",
          description: `[${unit.id}] Missing required input: ${input}`,
          source: "unit",
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
}

/**
 * Find gaps - missing inputs/outputs, failed checks.
 */
export async function findGaps(unit: Unit): Promise<Gap[]> {
  const gaps: Gap[] = [];
  const projectDir = getProjectRoot(unit);
  const epicId = getEpicId(unit);
  const factsLogger = new FactsLogger(
    projectDir,
    epicId,
    unit.context?.fullTaskId ?? unit.id,
  );

  // Detect if task is awaiting user input (asked a question)
  const userQuestionDetection = await detectUserQuestion(
    projectDir,
    epicId,
    unit.id,
  );

  // Refresh outputs/inputs from the materialized TASK.md so mid-run edits
  // take effect on the next gap-detection pass without needing a process
  // restart or journal nuke. Falls back to the in-memory Unit when the
  // materialized file is missing or unparseable.
  const fresh = reReadOutputsAndInputsFromTaskMd(projectDir, epicId, unit.id, unit.path);
  // Strip annotations from the in-memory cache too, in case `parseOutputs`
  // hasn't been applied (e.g. unit loaded from an old journal snapshot).
  const cachedOutputs = (unit.outputs ?? []).map(cleanOutputPath);
  const liveOutputs = fresh?.outputs ?? cachedOutputs;
  // RFC 0047: a leaf `handoff:` block declares a review artifact the agent
  // must generate. Fold it into the output-existence check so the standard
  // missing-output → FEEDBACK → retry machinery enforces it, and the review
  // gate never fires with a missing artifact. `cacheOutputs` is the shared
  // source of truth — the scheduler cache layer folds the same artifact, so
  // both agree on what "done" means (gateways exempt; deduped).
  const outputsToCheck = cacheOutputs({
    outputs: liveOutputs,
    handoff: unit.handoff,
    mode: unit.mode,
  });
  const liveDeletedOutputs = fresh?.deletedOutputs ?? [];
  const liveInputs = fresh?.inputs ?? unit.inputs ?? [];

  // ── Plan gap: plan.md not yet generated ────────────────────────────
  if (unit.planConfig) {
    const structure = getJournalStructure(projectDir, epicId, unit.id);
    const planPath = path.join(structure.task!, "plan.md");
    if (!existsSync(planPath)) {
      gaps.push({
        id: `${unit.id}-plan-missing`,
        type: "incomplete",
        level: "task",
        scope: unit.id,
        severity: "high",
        description: `[${unit.id}] Generating plan`,
        source: "unit",
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
      // Return early — plan must be generated before checking outputs/Seed
      return gaps;
    }
  }

  // Check declared inputs exist before any branch.
  const deletedOutputSet = new Set(liveDeletedOutputs);

  await checkInputs(liveInputs, projectDir, unit, factsLogger, gaps, deletedOutputSet);

  // Check outputs exist with validation (Facts API)
  for (const output of outputsToCheck) {
    const isDeletedOutput = deletedOutputSet.has(output);

    // ── (deleted) outputs: file should NOT exist ─────────────────────
    if (isDeletedOutput) {
      const absOutputPath = resolveProjectPath(projectDir, output);
      if (existsSync(absOutputPath)) {
        const fact = await factsLogger.collectFact({
          type: "file-exists",
          path: output,
          cmd: FileChecks.exists(output),
        });
        gaps.push({
          id: `${unit.id}-not-deleted-${output}`,
          type: "incomplete",
          level: "task",
          scope: unit.id,
          severity: "high",
          description: `[${unit.id}] Task output not deleted: ${output}`,
          source: "unit",
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
            taskAI: resolveTaskAI(unit),
            taskSkill: resolveSkill(unit),
            taskOutputs: unit.outputs,
            taskPassthrough: unit.passthrough,
            taskRetryFullBody: (unit as any)["retry-full-body"] ?? false,
            taskInputs: liveInputs,
            factId: fact.id,
            awaitingUserInput: userQuestionDetection.awaitingUserInput,
            userQuestion: userQuestionDetection.question,
            userQuestionOptions: userQuestionDetection.options,
          },
        });
      }
      continue;
    }

    // ── (new) / (modified) outputs: file should exist ───────────────
    // Skip paths with template variables — runtime-resolved, not checkable at plan time
    if (hasTemplateVars(output)) {
      continue;
    }
    // Handle glob patterns (but not literal bracket paths like [id])
    if (hasGlobWildcards(output)) {
      const { glob } = await import("glob");
      const matches = await glob(output, { cwd: projectDir });

      const fact = await factsLogger.collectFact({
        type: "glob-check",
        pattern: output,
        cmd: `ls ${output} 2>/dev/null | head -1`,
        matchCount: matches.length,
      });

      if (matches.length === 0) {
        gaps.push({
          id: `${unit.id}-missing-output-${output}`,
          type: "incomplete",
          level: "task",
          scope: unit.id,
          severity: "high",
          description: `[${unit.id}] Task output not created: ${output}`,
          source: "unit",
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
            taskAI: resolveTaskAI(unit),
            taskSkill: resolveSkill(unit),
            taskOutputs: unit.outputs,
            taskPassthrough: unit.passthrough,
            taskRetryFullBody: (unit as any)["retry-full-body"] ?? false,
            taskInputs: liveInputs,
            factId: fact.id,
            // User question detection
            awaitingUserInput: userQuestionDetection.awaitingUserInput,
            userQuestion: userQuestionDetection.question,
            userQuestionOptions: userQuestionDetection.options,
          },
        });
      }
    } else {
      const absOutputPath = resolveProjectPath(projectDir, output);
      const outputExistsOnDisk = existsSync(absOutputPath);

      const existsFact = await factsLogger.collectFact({
        type: "file-exists",
        path: output,
        cmd: FileChecks.exists(output),
      });

      if (!outputExistsOnDisk) {
        gaps.push({
          id: `${unit.id}-missing-output-${output}`,
          type: "incomplete",
          level: "task",
          scope: unit.id,
          severity: "high",
          description: `[${unit.id}] Task output not created: ${output}`,
          source: "unit",
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
            taskAI: resolveTaskAI(unit),
            taskSkill: resolveSkill(unit),
            taskInputs: liveInputs,
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
        let validationResult: Awaited<ReturnType<typeof validateFile>> | null =
          null;

        if (ext === ".png") {
          validationResult = await validateFile(
            output,
            ValidationRuleSets.png(output),
            projectDir,
            factsLogger,
          );
        } else if (ext === ".jpg" || ext === ".jpeg") {
          validationResult = await validateFile(
            output,
            [
              {
                id: "exists",
                description: "File exists",
                cmd: FileChecks.exists(output),
              },
              {
                id: "non-empty",
                description: "File is non-empty",
                cmd: FileChecks.nonEmpty(output),
              },
              {
                id: "valid-jpeg",
                description: "File has JPEG magic bytes",
                cmd: FileChecks.isJPEG(output),
              },
            ],
            projectDir,
            factsLogger,
          );
        } else if (ext === ".html" || ext === ".htm") {
          validationResult = await validateFile(
            output,
            ValidationRuleSets.html(output),
            projectDir,
            factsLogger,
          );
        } else if (ext === ".json") {
          validationResult = await validateFile(
            output,
            ValidationRuleSets.json(output),
            projectDir,
            factsLogger,
          );
        } else if (ext === ".md") {
          // Markdown outputs must be non-empty and have substantive content.
          // Sprint reflection.md / plan.md files that pass `existsSync` but
          // contain only a heading are the canonical "ran but produced
          // nothing" failure mode. Floor: file ≥ 80 bytes AND ≥ 5 lines OR
          // ≥ 200 bytes — empirical floor that catches stubs without
          // tripping on legitimately terse outputs.
          validationResult = await validateFile(
            output,
            [
              {
                id: "exists",
                description: "File exists",
                cmd: FileChecks.exists(output),
              },
              {
                id: "non-empty",
                description: "File is non-empty",
                cmd: FileChecks.nonEmpty(output),
              },
              {
                id: "substantive",
                description:
                  "Markdown output has substantive content (≥80 bytes AND ≥5 lines, or ≥200 bytes)",
                cmd:
                  `awk 'END{exit (NR>=5 && (s=length($0))?0:1)}' ${JSON.stringify(output)}; ` +
                  `s=$(wc -c < ${JSON.stringify(output)}); ` +
                  `l=$(wc -l < ${JSON.stringify(output)}); ` +
                  `if [ "$s" -ge 200 ] || { [ "$s" -ge 80 ] && [ "$l" -ge 5 ]; }; then exit 0; else exit 1; fi`,
              },
            ],
            projectDir,
            factsLogger,
          );
        } else if (ext === ".txt" || ext === ".log" || ext === ".csv") {
          // Generic text-output non-empty floor (≥ 1 byte).
          validationResult = await validateFile(
            output,
            [
              {
                id: "exists",
                description: "File exists",
                cmd: FileChecks.exists(output),
              },
              {
                id: "non-empty",
                description: "File is non-empty",
                cmd: FileChecks.nonEmpty(output),
              },
            ],
            projectDir,
            factsLogger,
          );
        }

        // If validation failed, add corruption gap
        if (validationResult && !validationResult.valid) {
          gaps.push({
            id: `${unit.id}-corrupted-output-${output}`,
            type: "incomplete",
            level: "task",
            scope: unit.id,
            severity: "high",
            description: `[${unit.id}] Task output corrupted or invalid: ${output} (${validationResult.failures.map((f) => f.id).join(", ")})`,
            source: "unit",
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
 * Broken commands (exit 127, structural issues) are detected downstream by
 * ToolEnvironmentRepairStrategy which uses AI to provide a fix.
 */
export async function runCheck(
  unit: Unit,
  check: {
    id: string;
    cmd?: string;
    description?: string;
    type?: "cmd" | "ai" | "test";
    check?: string;
    agent?: string;
    model?: string;
    timeoutMs?: number;
  },
): Promise<CheckResult> {
  const projectDir = getProjectRoot(unit);

  if (check.type === "ai") {
    throw new Error(
      `[converge] AI check "${check.id}" is rejected — ` +
      `LLM-based verification violates the "Checks, Not Vibes" principle. ` +
      `All checks must be deterministic shell commands (type: "cmd"). ` +
      `Replace AI check "${check.id}" with a shell-command check that ` +
      `verifies work deterministically (e.g., test runners, grep, jq, diff).`
    );
  }

  if (!check.cmd) {
    return { passed: true, gaps: [] };
  }

  const epicId = getEpicId(unit);
  const factsLogger = new FactsLogger(
    projectDir,
    epicId,
    unit.context?.fullTaskId ?? unit.id,
  );

  const fact = await factsLogger.collectFact({
    type: "check",
    checkId: check.id,
    cmd: check.cmd,
    description: check.description,
  });

  if (fact.ok) {
    return { passed: true, gaps: [] };
  } else {
    return {
      passed: false,
      gaps: [
        {
          id: `${unit.id}-check-failed-${check.id}`,
          type: "incomplete",
          level: "task",
          scope: unit.id,
          severity: "high",
          description: `[${unit.id}] Check failed: ${check.description || check.id}`,
          source: "unit",
          detected: new Date().toISOString(),
          resolved: false,
          checks: [],
          metadata: {
            gapKind: GapKind.checkFailed,
            checkId: check.id,
            checkCmd: check.cmd,
            checkDescription: check.description,
            checkOutput: fact.output,
            checkExitCode: fact.exitCode,
            taskPrompt: await resolvePrompt(unit),
            taskAgent: resolveAgent(unit),
            taskAI: resolveTaskAI(unit),
            taskSkill: resolveSkill(unit),
            taskId: unit.id,
            taskTitle: unit.title,
            unitPath: unit.path,
            factId: fact.id,
          },
        },
      ],
    };
  }
}
