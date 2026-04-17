/**
 * Auto-Converge Phase
 *
 * Runs once before the convergence loop starts. Enriches the TASK.md frontmatter
 * with inferred inputs, outputs, checks, and diagnosis-hints when they are missing.
 *
 * Writes enriched fields directly back into the TASK.md source file (self-repair).
 * Subsequent runs are no-ops if all targeted fields are already present (idempotent).
 *
 * Modes:
 *  - 'ai'     : Claude infers checks from the task body + partial frontmatter
 *  - 'script' : A shell script prints a YAML patch to stdout
 */

import { writeFile } from 'node:fs/promises';
import { READONLY_TOOLS } from '../ai/context.ts';
import { existsSync } from 'node:fs';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import type { TaskMdDef } from '../config/task-md-definition.ts';
import type { AutoConvergePolicy, EnrichField } from '../config/skill-definition.ts';
import type { CheckDef } from './after.ts';

const execAsync = promisify(exec);

/* ------------------------------------------------------------------ */
/*  Result type                                                         */
/* ------------------------------------------------------------------ */

export interface AutoConvergeResult {
  /** Whether the TASK.md was actually updated */
  enriched: boolean;
  /** The merged TaskMdDef (may be same object if no enrichment happened) */
  def: TaskMdDef;
}

/* ------------------------------------------------------------------ */
/*  Main entry point                                                    */
/* ------------------------------------------------------------------ */

/**
 * Enrich a TASK.md's frontmatter with inferred validation fields.
 *
 * @param taskMdPath  Absolute path to the TASK.md file to update in-place
 * @param def          Already-parsed frontmatter
 * @param body         Markdown body (below the --- block)
 * @param policyInput  The value of the `auto-converge` frontmatter field
 * @param projectDir   Working directory for script execution / AI tool calls
 */
export async function runAutoConvergePhase(
  taskMdPath: string,
  def: TaskMdDef,
  body: string,
  policyInput: boolean | AutoConvergePolicy,
  projectDir: string,
): Promise<AutoConvergeResult> {
  if (!existsSync(taskMdPath)) {
    return { enriched: false, def };
  }

  const policy = normalizePolicy(policyInput);
  const fieldsToEnrich: EnrichField[] = policy.enrich ?? ['inputs', 'outputs', 'checks'];
  const overwrite = policy.overwrite ?? false;

  // Determine which fields actually need filling
  const missing = fieldsToEnrich.filter(field => {
    if (overwrite) return true;
    if (field === 'inputs') return !def.inputs?.length;
    if (field === 'outputs') return !def.outputs?.length;
    if (field === 'checks') return !def.checks?.length;
    if (field === 'diagnosis-hints') return !def['diagnosis-hints']?.length;
    return false;
  });

  if (missing.length === 0) {
    // All requested fields already populated — nothing to do
    return { enriched: false, def };
  }

  // Fetch enrichment patch via the selected mode
  let patch: Partial<TaskMdDef>;
  if (policy.mode === 'script' && policy.script) {
    patch = await enrichFromScript(policy.script, def, projectDir, missing);
  } else {
    patch = await enrichFromAi(def, body, missing, projectDir);
  }

  // Merge patch into def — only for the fields that were missing
  const merged: TaskMdDef = { ...def };
  for (const field of missing) {
    if (field === 'inputs' && (patch.inputs?.length ?? 0) > 0) {
      merged.inputs = patch.inputs;
    }
    if (field === 'outputs' && (patch.outputs?.length ?? 0) > 0) {
      merged.outputs = patch.outputs;
    }
    if (field === 'checks' && (patch.checks?.length ?? 0) > 0) {
      merged.checks = patch.checks as CheckDef[];
    }
    if (field === 'diagnosis-hints' && (patch['diagnosis-hints']?.length ?? 0) > 0) {
      merged['diagnosis-hints'] = patch['diagnosis-hints'];
    }
  }

  // Write enriched frontmatter back into the TASK.md source
  await writeBackTaskMd(taskMdPath, merged, body);

  return { enriched: true, def: merged };
}

/* ------------------------------------------------------------------ */
/*  Script mode                                                         */
/* ------------------------------------------------------------------ */

async function enrichFromScript(
  script: string,
  def: TaskMdDef,
  projectDir: string,
  fields: EnrichField[],
): Promise<Partial<TaskMdDef>> {
  try {
    const { stdout } = await execAsync(script, {
      cwd: projectDir,
      env: {
        ...process.env,
        TASK_NAME: def.title ?? '',
        TASK_DESCRIPTION: def.description ?? '',
        ENRICH_FIELDS: fields.join(','),
      },
      timeout: 30_000,
    });
    return (parseYaml(stdout.trim()) as Partial<TaskMdDef>) ?? {};
  } catch {
    return {};
  }
}

/* ------------------------------------------------------------------ */
/*  AI mode                                                             */
/* ------------------------------------------------------------------ */

async function enrichFromAi(
  def: TaskMdDef,
  body: string,
  fields: EnrichField[],
  projectDir: string,
): Promise<Partial<TaskMdDef>> {
  try {
    const { agentfn } = await import('@converge/agentfn');

    const existingPartial = {
      ...(def.inputs?.length ? { inputs: def.inputs } : {}),
      ...(def.outputs?.length ? { outputs: def.outputs } : {}),
      ...(def.checks?.length ? { checks: def.checks } : {}),
    };

    const agentResult: any = await agentfn<string>({
      prompt: `You are enriching a TASK.md task definition with missing validation fields.

TASK TITLE: ${def.title ?? '(none)'}
DESCRIPTION: ${def.description ?? '(none)'}
AGENT: ${def.agent ?? '(none)'}

TASK BODY (instructions for the agent):
${body.slice(0, 2000)}

EXISTING FRONTMATTER (partial):
${Object.keys(existingPartial).length > 0 ? stringifyYaml(existingPartial) : '(none)'}

FIELDS TO FILL: ${fields.join(', ')}

Use Read and Glob tools to inspect the project structure, then respond with ONLY a YAML block containing the missing fields.

Example response format:
\`\`\`yaml
outputs:
  - path/to/expected/output.md
  - path/to/expected/output.sql
checks:
  - id: output-md-exists
    cmd: test -f path/to/expected/output.md
    description: output markdown file exists
  - id: output-sql-valid
    cmd: grep -q "CREATE TABLE" path/to/expected/output.sql
    description: SQL file contains table definitions
\`\`\`

Rules:
- Only include the FIELDS TO FILL listed above
- For checks: use simple portable shell commands (test -f, grep -q, jq empty)
- Be specific to this task's actual outputs based on the task body
- Do not include fields that are already populated`,
      allowedTools: [...READONLY_TOOLS],
      timeoutMs: 60_000,
      cwd: projectDir,
    })();

    // Extract YAML from code block
    const result = agentResult.data ?? agentResult.raw ?? '';
    const yamlMatch = result.match(/```yaml\n([\s\S]*?)```/) ?? result.match(/```\n([\s\S]*?)```/);
    const yamlStr = yamlMatch ? yamlMatch[1] : result;
    return (parseYaml(yamlStr.trim()) as Partial<TaskMdDef>) ?? {};
  } catch {
    return {};
  }
}

/* ------------------------------------------------------------------ */
/*  Write back to TASK.md in-place                                      */
/* ------------------------------------------------------------------ */

async function writeBackTaskMd(
  taskMdPath: string,
  def: TaskMdDef,
  body: string,
): Promise<void> {
  // Build an ordered object for clean YAML serialization
  const fm: Record<string, unknown> = {};
  if (def.title) fm.title = def.title;
  if (def.description) fm.description = def.description;
  if (def.agent) fm.agent = def.agent;
  if (def.skills?.length) fm.skills = def.skills;
  if (def.inputs?.length) fm.inputs = def.inputs;
  if (def.outputs?.length) fm.outputs = def.outputs;
  if (def.checks?.length) fm.checks = def.checks;
  if (def.dependencies?.length) fm.dependencies = def.dependencies;
  if (def.tags?.length) fm.tags = def.tags;
  if (def['diagnosis-hints']?.length) fm['diagnosis-hints'] = def['diagnosis-hints'];
  if (def['correction-budget'] !== undefined) fm['correction-budget'] = def['correction-budget'];
  if (def['context-depth'] !== undefined) fm['context-depth'] = def['context-depth'];
  if (def['auto-converge'] !== undefined) fm['auto-converge'] = def['auto-converge'];

  const yaml = stringifyYaml(fm, { lineWidth: 0 });
  const content = `---\n${yaml}---\n\n${body.trimStart()}`;
  await writeFile(taskMdPath, content, 'utf8');
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function normalizePolicy(input: boolean | AutoConvergePolicy): AutoConvergePolicy {
  if (input === true) {
    return { mode: 'ai', enrich: ['inputs', 'outputs', 'checks'], overwrite: false };
  }
  if (input === false) {
    return { mode: 'ai', enrich: [], overwrite: false };
  }
  return input;
}
