/**
 * WBS Script Repair
 * 
 * Handles WBS script failures and AI-based repair.
 * WBS scripts are always fixed in playbook (permanent fix).
 */

import { readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export type WBSErrorType = 
  | 'syntax-error'
  | 'runtime-error'
  | 'spawn-error'
  | 'missing-dependency'
  | 'logic-error';

export interface WBSError {
  type: WBSErrorType;
  message: string;
  stack?: string;
  code?: string;
}

/**
 * Classify WBS error type based on error object.
 */
export function classifyWBSError(error: Error): WBSErrorType {
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
 * Write LEARN.md for WBS failure.
 */
export async function writeWBSLearnMd(
  journalDir: string,
  taskId: string,
  attempt: number,
  error: Error
): Promise<void> {
  const errorType = classifyWBSError(error);
  const attemptDir = join(
    journalDir,
    'tasks',
    taskId,
    'attempts',
    String(attempt).padStart(3, '0')
  );

  const learnContent = `# LEARN.md - WBS Script Failed

## What Went Wrong

WBS script execution failed with ${errorType}:

\`\`\`
${error.message}
${error.stack ? '\n' + error.stack : ''}
\`\`\`

## Error Type

${errorType}

## What You Must Do

${getRepairInstructions(errorType)}

## WBS Script Location

The WBS script is located in the playbook:
- Playbook: playbooks/{playbook}/tasks/${taskId}/wbs/wbs.js

Fix the script in the playbook for a permanent fix.
`;

  await writeFile(join(attemptDir, 'LEARN.md'), learnContent);
}

/**
 * Get repair instructions based on error type.
 */
function getRepairInstructions(errorType: WBSErrorType): string {
  switch (errorType) {
    case 'syntax-error':
      return 'Fix the syntax error in the WBS script. Check for missing brackets, semicolons, or invalid JavaScript syntax.';
    
    case 'runtime-error':
      return 'Fix the runtime error in the WBS script. Check for undefined variables, null references, or logic errors.';
    
    case 'spawn-error':
      return 'Fix the spawn logic in the WBS script. Ensure spawn calls have valid IDs, templates, and variables.';
    
    case 'missing-dependency':
      return 'The WBS script tried to read a file that doesn\'t exist. Either create the missing file or fix the upstream task that should have created it.';
    
    case 'logic-error':
      return 'The WBS script spawned tasks with incorrect IDs or structure. Fix the spawn logic to generate correct task IDs.';
    
    default:
      return 'Fix the error in the WBS script based on the error message above.';
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
export async function buildWBSRepairContext(
  playbookDir: string,
  journalDir: string,
  taskId: string,
  attempt: number
): Promise<string> {
  // Read playbook WBS script
  const wbsPath = join(playbookDir, 'tasks', taskId, 'wbs/wbs.js');
  const wbsScript = await readFile(wbsPath, 'utf-8');

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

  return `Fix this WBS script:

## Task Definition
${taskDef}

## WBS Script (needs fixing)
\`\`\`javascript
${wbsScript}
\`\`\`

## Previous Error
${learn}

Fix the WBS script and return the corrected version.
`;
}
