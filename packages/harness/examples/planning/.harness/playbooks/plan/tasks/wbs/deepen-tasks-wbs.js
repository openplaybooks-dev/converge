/**
 * WBS: Deepen Tasks (Conditional)
 *
 * Reads plan.json (produced by 003-merge) and checks for tasks that
 * were flagged as needing further decomposition. Spawns a subtask
 * for each oversized/complex task to break it down further.
 *
 * If nothing needs deepening, spawns zero tasks — the parent completes
 * immediately and the pipeline continues to validate.
 *
 * Pattern: conditional delegation — only spawn subtasks if needed.
 *
 * Spawns (0 to N):
 *   003-d-001-<epic-id>-<task-id>  → sub-decompose task
 *   003-d-002-<epic-id>-<task-id>  → sub-decompose task
 *   ...
 */

import { readFileSync } from 'fs';
import { join } from 'path';

export async function run(ctx) {
  const name = ctx.vars?.name || 'default';
  const stateDir = `.harness/plan-state/${name}`;
  const planPath = join(ctx.projectDir, stateDir, 'plan.json');

  let plan;
  try {
    plan = JSON.parse(readFileSync(planPath, 'utf-8'));
  } catch (err) {
    throw new Error(`Cannot read plan: ${planPath} — ${err.message}`);
  }

  // Collect all tasks flagged for deepening
  const toDeepen = plan.needsDeepening || [];

  if (toDeepen.length === 0) {
    // Nothing to deepen — parent completes with zero subtasks.
    // The pipeline continues to 003-finalize → 004-validate → 005-emit.
    return;
  }

  let prevId = null;

  for (let i = 0; i < toDeepen.length; i++) {
    const item = toDeepen[i];
    const padded = String(i + 1).padStart(3, '0');
    const taskId = `003-d-${padded}-${item.epicId}-${item.taskId}`;
    const outputPath = `${stateDir}/deepened/${item.epicId}-${item.taskId}.json`;

    await ctx.spawn({
      id: taskId,
      title: `Sub-decompose: ${item.epicId}/${item.taskId}`,
      dependencies: prevId ? [prevId] : [],
      inputs: [`${stateDir}/plan.json`],
      outputs: [outputPath],
      skills: ['harness-planning'],
      checks: [
        { id: `deep-${padded}-exists`, cmd: `test -f ${outputPath}`, description: `Deepened plan for ${item.taskId} created` },
        { id: `deep-${padded}-valid`, cmd: `node -e "JSON.parse(require('fs').readFileSync('${outputPath}','utf-8'))"`, description: 'Valid JSON' },
      ],
      body: `Sub-decompose an oversized task into smaller subtasks.

**Task being decomposed:**
- Epic: ${item.epicId}
- Task: ${item.taskId}
- Reason: ${item.reason}
- Items to break down: ${JSON.stringify(item.items || [])}

Read \`${stateDir}/plan.json\` for the full plan context. Find this task
within its epic and break it into smaller, atomic subtasks.

**Rules:**
- Each subtask should be completable in 15-45 min by an AI executor
- Each subtask needs specific outputs and checks
- Subtasks can depend on each other (sequential) or be independent (parallel)
- If items are provided, generate one subtask per item
- If no items, split by logical boundaries (e.g., handler + validation + tests)

**Output format** — write to \`${outputPath}\`:
\`\`\`json
{
  "epicId": "${item.epicId}",
  "parentTaskId": "${item.taskId}",
  "replaceWith": "wbs",
  "subtasks": [
    {
      "id": "001-subtask-name",
      "title": "Subtask Title",
      "description": "What this subtask does",
      "dependencies": [],
      "inputs": [],
      "outputs": ["path/to/output"],
      "checks": [{ "id": "check-id", "cmd": "command", "description": "..." }],
      "body": "Step-by-step instructions"
    }
  ],
  "wbsItems": ${JSON.stringify(item.items || [])}
}
\`\`\`

Set \`replaceWith\` to:
- \`"wbs"\` if all subtasks follow the same template (generate a wbs.js)
- \`"inline"\` if subtasks are heterogeneous (expand them as regular tasks)`,
    });

    prevId = taskId;
  }
}
