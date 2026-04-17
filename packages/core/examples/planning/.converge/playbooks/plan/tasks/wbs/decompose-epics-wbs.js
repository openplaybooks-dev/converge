/**
 * WBS: Decompose Epics
 *
 * Reads outline.json (produced by 003-outline) and spawns one subtask
 * per epic. Each subtask does the detailed task breakdown for its epic.
 *
 * Pattern: parent scans N items → delegates each to a subtask.
 *
 * Spawns:
 *   003-001-<epic-id>  → detail-decompose epic 01
 *   003-002-<epic-id>  → detail-decompose epic 02
 *   ...
 */

import { readFileSync } from 'fs';
import { join } from 'path';

export async function run(ctx) {
  const name = ctx.vars?.name || 'default';
  const stateDir = `.converge/plan-state/${name}`;
  const outlinePath = join(ctx.projectDir, stateDir, 'outline.json');

  let outline;
  try {
    outline = JSON.parse(readFileSync(outlinePath, 'utf-8'));
  } catch (err) {
    throw new Error(`Cannot read outline: ${outlinePath} — ${err.message}`);
  }

  if (!outline.epics || outline.epics.length === 0) {
    throw new Error('Outline has no epics — nothing to decompose');
  }

  let prevId = null;

  for (let i = 0; i < outline.epics.length; i++) {
    const epic = outline.epics[i];
    const padded = String(i + 1).padStart(3, '0');
    const taskId = `003-${padded}-${epic.id}`;
    const epicOutputPath = `${stateDir}/epics/${epic.id}.json`;

    await ctx.spawn({
      id: taskId,
      title: `Decompose epic: ${epic.title}`,
      dependencies: prevId ? [prevId] : [],
      inputs: [`${stateDir}/outline.json`, `${stateDir}/requirements.json`, `${stateDir}/analysis.json`],
      outputs: [epicOutputPath],
      skills: ['converge-planning'],
      checks: [
        { id: `${epic.id}-exists`, cmd: `test -f ${epicOutputPath}`, description: `${epic.id}.json created` },
        { id: `${epic.id}-valid`, cmd: `node -e "const e=JSON.parse(require('fs').readFileSync('${epicOutputPath}','utf-8'));if(!e.tasks||!e.tasks.length)throw new Error('no tasks')"`, description: `${epic.id} has tasks` },
      ],
      body: `Detail-decompose epic "${epic.title}" (${epic.id}) into individual tasks.

Reference: load the converge-planning skill, then read:
- \`pipeline.md\` Phase 3b (Decompose) for epic decomposition rules
- \`task-format.md\` for task format reference

**Epic context:**
- ID: ${epic.id}
- Title: ${epic.title}
- Description: ${epic.description}
- Features covered: ${JSON.stringify(epic.features || [])}
- Complexity: ${epic.complexity || 'medium'}
- Dependencies on other epics: ${JSON.stringify(epic.dependencies || [])}
${epic.needsWbs ? '- This epic is a WBS candidate — identify items to spawn subtasks for' : ''}

Read \`${stateDir}/requirements.json\` for feature details and \`${stateDir}/analysis.json\` for project context.

Break this epic into **3-7 tasks**. For each task:
1. Assign a three-digit id: 001-task-name, 002-task-name, etc.
2. Write a clear title and description
3. List specific output files (not vague globs)
4. Add checks (at minimum: file existence for each output)
5. Map dependencies within this epic
6. Write step-by-step AI executor instructions in the body

**Complexity-based guidance:**
- simple: 2-3 straightforward tasks, no WBS
- medium: 4-5 tasks, some may reference shared patterns
- complex: 6-7 tasks, flag any that need further decomposition

If a task is itself too complex (e.g., "generate 12 API endpoints"), flag it:
\`\`\`json
"needsDeepening": {
  "taskId": "003-api-endpoints",
  "reason": "12 endpoints to generate — should be WBS",
  "items": ["GET /users", "POST /users", ...]
}
\`\`\`

Write to \`${epicOutputPath}\`:
\`\`\`json
{
  "id": "${epic.id}",
  "title": "${epic.title}",
  "description": "${epic.description}",
  "dependencies": ${JSON.stringify(epic.dependencies || [])},
  "wbs": ${epic.needsWbs || false},
  "tasks": [
    {
      "id": "001-task-name",
      "title": "Task Title",
      "description": "What this task does",
      "dependencies": [],
      "inputs": [],
      "outputs": ["path/to/output"],
      "checks": [{ "id": "check-id", "cmd": "command", "description": "what it validates" }],
      "skills": [],
      "body": "Step-by-step instructions"
    }
  ],
  "needsDeepening": []
}
\`\`\``,
    });

    // Sequential: each epic builds on context from the previous.
    // Remove this line to allow parallel decomposition.
    prevId = taskId;
  }
}
