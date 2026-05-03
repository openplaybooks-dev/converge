/**
 * Seed Script Repair
 * 
 * Handles Seed script failures and AI-based repair.
 * Seed scripts are always fixed in playbook (permanent fix).
 */

import { readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export type SeedErrorType = 
  | 'syntax-error'
  | 'runtime-error'
  | 'spawn-error'
  | 'missing-dependency'
  | 'logic-error';

export interface SeedError {
  type: SeedErrorType;
  message: string;
  stack?: string;
  code?: string;
}

/**
 * Classify Seed error type based on error object.
 */
export function classifySeedError(error: Error): SeedErrorType {
  if (error instanceof SyntaxError) {
    return 'syntax-error';
  }
  
  if ('code' in error && error.code === 'ENOENT') {
    return 'missing-dependency';
  }
  
  if (error.message.includes('spawn')) {
    return 'spawn-error';
  }
  
  return 'runtime-error';
}

/**
 * Write LEARN.md for Seed failure.
 */
export async function writeSeedLearnMd(
  journalDir: string,
  taskId: string,
  attempt: number,
  error: Error
): Promise<void> {
  const errorType = classifySeedError(error);
  const attemptDir = join(
    journalDir,
    'tasks',
    taskId,
    'attempts',
    String(attempt).padStart(3, '0')
  );

  const learnContent = `# LEARN.md - Seed Script Failed

## What Went Wrong

Seed script execution failed with ${errorType}:

\`\`\`
${error.message}
${error.stack ? '\n' + error.stack : ''}
\`\`\`

## Error Type

${errorType}

## What You Must Do

${getRepairInstructions(errorType)}

## Seed Script Location

The Seed script is located in the playbook:
- Playbook: playbooks/{playbook}/tasks/${taskId}/seed/seed.js

Fix the script in the playbook for a permanent fix.
`;

  await writeFile(join(attemptDir, 'LEARN.md'), learnContent);
}

/**
 * Get repair instructions based on error type.
 */
function getRepairInstructions(errorType: SeedErrorType): string {
  switch (errorType) {
    case 'syntax-error':
      return 'Fix the syntax error in the Seed script. Check for missing brackets, semicolons, or invalid JavaScript syntax.';
    
    case 'runtime-error':
      return 'Fix the runtime error in the Seed script. Check for undefined variables, null references, or logic errors.';
    
    case 'spawn-error':
      return 'Fix the spawn logic in the Seed script. Ensure spawn calls have valid IDs, templates, and variables.';
    
    case 'missing-dependency':
      return 'The Seed script tried to read a file that doesn\'t exist. Either create the missing file or fix the upstream task that should have created it.';
    
    case 'logic-error':
      return 'The Seed script spawned tasks with incorrect IDs or structure. Fix the spawn logic to generate correct task IDs.';
    
    default:
      return 'Fix the error in the Seed script based on the error message above.';
  }
}

/**
 * Clear spawned children from journal (for logic error retry). Spawned
 * children live in the parent's `tasks/` directory (journal mirrors playbook).
 */
export async function clearSpawnedTasks(
  journalDir: string,
  taskId: string
): Promise<void> {
  const segments = taskId.split("/").filter(Boolean);
  const taskPath = segments.flatMap((s) => ["tasks", s]);
  const childrenDir = join(journalDir, ...taskPath, "tasks");

  if (existsSync(childrenDir)) {
    await rm(childrenDir, { recursive: true, force: true });
  }
}

/**
 * Build repair context for AI.
 */
export async function buildSeedRepairContext(
  playbookDir: string,
  journalDir: string,
  taskId: string,
  attempt: number
): Promise<string> {
  // Read playbook Seed script
  const seedPath = join(playbookDir, 'tasks', taskId, 'seed/seed.js');
  const seedScript = await readFile(seedPath, 'utf-8');

  // Read LEARN.md
  const learnPath = join(
    journalDir,
    'tasks',
    taskId,
    'attempts',
    String(attempt).padStart(3, '0'),
    'LEARN.md'
  );
  const learn = await readFile(learnPath, 'utf-8');

  // Read task definition for context
  const taskPath = join(journalDir, 'tasks', taskId, 'TASK.md');
  const taskDef = existsSync(taskPath)
    ? await readFile(taskPath, 'utf-8')
    : '';

  return `Fix this Seed script:

## Task Definition
${taskDef}

## Seed Script (needs fixing)
\`\`\`javascript
${seedScript}
\`\`\`

## Previous Error
${learn}

Fix the Seed script and return the corrected version.
`;
}
