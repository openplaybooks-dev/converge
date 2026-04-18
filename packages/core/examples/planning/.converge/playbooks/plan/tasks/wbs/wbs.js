/**
 * WBS: Planning Pipeline Generator
 *
 * Generates a multi-phase planning pipeline with delegated decomposition:
 *
 *   000-setup      → install converge-planning skill to .converge/skills
 *   001-scan       → auto-scan cwd
 *   002-research   → parse prompt into requirements
 *   003-outline    → identify epics (high-level)
 *   003-decompose  → WBS parent: spawns one subtask per epic
 *     003-001-*    →   detail-decompose each epic into tasks
 *   003-merge      → combine epic plans into plan.json
 *   003-deepen     → WBS parent: conditionally spawns sub-decomposition
 *     003-d-001-*  →   break down oversized tasks further
 *   003-finalize   → merge deepening results into final plan.json
 *   004-validate   → verify completeness
 *   005-emit       → write playbook files
 *
 * The decompose phase delegates per-epic work to subtasks. Each subtask
 * can flag tasks that need further decomposition, and the deepen phase
 * spawns another round of subtasks for those — self-decomposable planning.
 *
 * Input:  ctx.vars.prompt  — what the user wants
 *         ctx.vars.name    — playbook name (optional, derived from prompt)
 *         ctx.vars.update  — whether to update an existing playbook
 * Output: a runnable playbook at .converge/playbooks/<name>/
 */

export async function run(ctx) {
  const prompt = ctx.vars?.prompt;
  if (!prompt) {
    throw new Error("Missing required input: prompt");
  }

  const name = ctx.vars?.name || slugify(prompt);
  const update = ctx.vars?.update === "true" || ctx.vars?.update === true;
  const stateDir = `.converge/plan-state/${name}`;

  // ── Phase 0: Setup Skills ──────────────────────────────────────
  // Install the converge-planning skill into .converge/skills so that
  // all subsequent tasks can load playbooks and preferences from it.
  await ctx.spawn({
    id: "000-setup-skills",
    title: "Install converge-planning skill",
    outputs: [".converge/skills/converge-planning/SKILL.md"],
    checks: [
      {
        id: "skill-installed",
        cmd: "test -f .converge/skills/converge-planning/SKILL.md",
        description: "converge-planning skill installed",
      },
      {
        id: "task-format-exists",
        cmd: "test -f .converge/skills/converge-planning/task-format.md",
        description: "Task format reference exists",
      },
      {
        id: "pipeline-exists",
        cmd: "test -f .converge/skills/converge-planning/pipeline.md",
        description: "Pipeline reference exists",
      },
      {
        id: "wbs-guide-exists",
        cmd: "test -f .converge/skills/converge-planning/wbs-guide.md",
        description: "WBS guide exists",
      },
    ],
    body: `Install the converge-planning skill into \`.converge/skills/\`.

Run:
\`\`\`bash
converge skills install --skill=converge-planning --target=.converge/skills --force
\`\`\`

If the \`converge\` CLI is not available, manually copy the skill:
1. Find the converge-planning skill in the converge package's \`skills/\` directory
2. Copy the entire \`converge-planning/\` directory to \`.converge/skills/converge-planning/\`

After installation, verify the skill structure:
\`\`\`
.converge/skills/converge-planning/
├── SKILL.md          # Entry point + pipeline overview + rules
├── task-format.md    # TASK.md + playbook.yml format reference
├── pipeline.md       # Planning pipeline phases + artifact schemas
└── wbs-guide.md      # How to write wbs.js scripts
\`\`\`

This skill provides the reference material (pipeline, task format, WBS patterns) that
all subsequent planning tasks use. It must be installed before any other task runs.`,
  });

  // ── Phase 1: Scan ──────────────────────────────────────────────
  await ctx.spawn({
    id: "001-scan",
    title: "Scan project state",
    dependencies: ["000-setup-skills"],
    outputs: [`${stateDir}/analysis.json`],
    skills: ["converge-planning"],
    checks: [
      {
        id: "analysis-exists",
        cmd: `test -f ${stateDir}/analysis.json`,
        description: "Analysis file created",
      },
      {
        id: "analysis-valid",
        cmd: `node -e "JSON.parse(require('fs').readFileSync('${stateDir}/analysis.json','utf-8'))"`,
        description: "Valid JSON",
      },
    ],
    body: `Scan the current project directory to understand what already exists.

Reference: load the converge-planning skill, then read \`pipeline.md\` Phase 1 (Scan) for the full analysis protocol.

Do the following automatically (no user interaction needed):

1. **Detect tech stack** — check for package.json, tsconfig.json, requirements.txt, go.mod, Cargo.toml, etc.
   Read package.json dependencies to identify frameworks (React, Next.js, Express, etc.)
2. **Map file structure** — list top-level directories, count source files by type
3. **Assess current state** — does the project build? do tests pass? check git status
4. **Identify patterns** — naming conventions, state management, API style, testing patterns
5. **List external dependencies** — env vars, third-party services, databases
6. **Extract facts** — concrete, measurable truths about the project

Write findings to \`${stateDir}/analysis.json\`:
\`\`\`json
{
  "techStack": { "runtime": "...", "framework": "...", "language": "...", "build": "...", "styling": "...", "packageManager": "..." },
  "structure": { "sourceFiles": 0, "testFiles": 0, "keyDirectories": [] },
  "state": { "buildPasses": true, "testsPassing": 0, "testsFailing": 0, "lastCommit": "...", "uncommittedChanges": 0 },
  "patterns": { "naming": "...", "stateManagement": "...", "apiStyle": "..." },
  "externalDeps": [],
  "existingWork": [],
  "facts": []
}
\`\`\`

If this is a fresh project with no code, write minimal analysis with empty fields.
If \`${stateDir}/analysis.json\` already exists and nothing has changed, you may skip and reuse it.`,
  });

  // ── Phase 2: Research ──────────────────────────────────────────
  await ctx.spawn({
    id: "002-research",
    title: "Research requirements from prompt",
    dependencies: ["001-scan"],
    inputs: [`${stateDir}/analysis.json`],
    outputs: [`${stateDir}/requirements.json`],
    skills: ["converge-planning"],
    checks: [
      {
        id: "requirements-exists",
        cmd: `test -f ${stateDir}/requirements.json`,
        description: "Requirements file created",
      },
      {
        id: "requirements-valid",
        cmd: `node -e "JSON.parse(require('fs').readFileSync('${stateDir}/requirements.json','utf-8'))"`,
        description: "Valid JSON",
      },
    ],
    body: `Parse the user's prompt and project analysis into structured requirements.

Reference: load the converge-planning skill's \`SKILL.md\` for the research rules — infer from prompt and codebase, no user interaction.

**User prompt:** "${prompt}"

Read \`${stateDir}/analysis.json\` for project context, then:

1. **Extract vision** — what is the user trying to build/accomplish?
2. **Identify features** — break the prompt into discrete features, prioritize as must/should/nice
3. **Cross-reference with existing code** — which features already exist (from analysis)?  Mark as "exists" vs "new"
4. **Identify constraints** — what tech/patterns are already in place that constrain the plan?
5. **Generate facts** — combine analysis facts with prompt-derived facts
6. **Flag open questions** — things that are ambiguous or missing from the prompt

Do NOT ask the user questions — infer from the prompt and codebase context.
If something is genuinely ambiguous, list it in openQuestions.

Write to \`${stateDir}/requirements.json\`:
\`\`\`json
{
  "vision": "One sentence description of what we're building",
  "features": [
    { "name": "Feature name", "description": "...", "priority": "must|should|nice", "status": "new|exists|partial" }
  ],
  "constraints": ["Must use existing X", "Cannot change Y"],
  "facts": ["FACT: statement — Source: where learned"],
  "openQuestions": ["Question about ambiguous requirement"]
}
\`\`\``,
  });

  // ── Phase 3a: Outline ──────────────────────────────────────────
  // Identify epics at a high level. Does NOT detail-decompose tasks —
  // that's delegated to per-epic subtasks in the next step.
  await ctx.spawn({
    id: "003-outline",
    title: "Identify epics (high-level outline)",
    dependencies: ["002-research"],
    inputs: [`${stateDir}/analysis.json`, `${stateDir}/requirements.json`],
    outputs: [`${stateDir}/outline.json`],
    skills: ["converge-planning"],
    checks: [
      {
        id: "outline-exists",
        cmd: `test -f ${stateDir}/outline.json`,
        description: "Outline file created",
      },
      {
        id: "outline-valid",
        cmd: `node -e "const o=JSON.parse(require('fs').readFileSync('${stateDir}/outline.json','utf-8'));if(!o.epics||!o.epics.length)throw new Error('no epics')"`,
        description: "Outline has epics",
      },
    ],
    body: `Create a high-level outline of epics for the project. Do NOT detail-decompose tasks yet — each epic will be delegated to a separate subtask for detailed breakdown.

Reference: load the converge-planning skill, then read:
- \`pipeline.md\` Phase 3a (Outline) for epic identification rules
- \`pipeline.md\` project patterns table for common project templates

Read \`${stateDir}/requirements.json\` and \`${stateDir}/analysis.json\`, then:

1. **Select project pattern** — match to full-stack, API, CLI, data-pipeline, etc.
2. **Identify 3-7 epics** — each is a logical phase of work with a clear deliverable
3. **For each epic**, write:
   - id (two-digit prefix + kebab-case: "01-foundation")
   - title
   - description (what this epic delivers)
   - which features from requirements.json it covers
   - estimated complexity: "simple" (2-3 tasks), "medium" (4-5 tasks), "complex" (6-7 tasks, may need WBS)
   - dependencies on other epics
4. **Map epic-level dependency graph** — which epics must complete before others start

Do NOT write individual tasks — that's delegated to the next phase.

Write to \`${stateDir}/outline.json\`:
\`\`\`json
{
  "name": "${name}",
  "description": "...",
  "pattern": "full-stack-app|api|cli|data-pipeline|static-site|mobile",
  "epics": [
    {
      "id": "01-foundation",
      "title": "Foundation",
      "description": "What this epic delivers",
      "features": ["feature-1", "feature-2"],
      "complexity": "simple|medium|complex",
      "dependencies": [],
      "needsWbs": false
    }
  ],
  "facts": [],
  "apiNeeds": { "internal": [], "external": [] }
}
\`\`\``,
  });

  // ── Phase 3b: Decompose Epics (AI-driven WBS) ──────────────────
  // AI reads outline.json and generates a wbs.js that spawns one
  // subtask per epic. Each subtask does the detailed task breakdown.
  await ctx.spawn({
    id: "003-decompose",
    title: "Decompose each epic into tasks",
    dependencies: ["003-outline"],
    inputs: [`${stateDir}/outline.json`],
    outputs: [`${stateDir}/epics/`],
    blocking: true,
    wbs: {
      type: "ai",
      prompt: `Read \`${stateDir}/outline.json\` which contains an array of epics.

Generate a wbs.js that spawns ONE subtask per epic. Each subtask should:
- Have id: \`003-{padded-index}-{epic.id}\` (e.g. 003-001-01-foundation)
- Title: "Decompose epic: {epic.title}"
- Depend on the previous epic subtask (sequential)
- Input: ${stateDir}/outline.json, ${stateDir}/requirements.json, ${stateDir}/analysis.json
- Output: ${stateDir}/epics/{epic.id}.json
- Check: output file exists and is valid JSON with a non-empty tasks array
- Skill: converge-planning
- Body: detailed instructions for the AI executor to break the epic into 3-7 tasks,
  each with id, title, description, dependencies, outputs, checks, and body.
  If a task is too complex, the subtask should flag it in a needsDeepening array.

Use ctx.ai.ask() to read outline.json and determine the number of epics and
their metadata. Then generate spawn calls with the right per-epic context
embedded in each body.

Reference: the converge-planning skill's pipeline.md Phase 3b (Decompose)
and task-format.md for task format.`,
    },
    body: `AI-driven WBS parent — AI generates a script that reads outline.json
and spawns one subtask per epic for detailed task breakdown.`,
  });

  // ── Phase 3c: Merge epic plans ────────────────────────────────
  await ctx.spawn({
    id: "003-merge",
    title: "Merge epic plans into master plan",
    dependencies: ["003-decompose"],
    inputs: [`${stateDir}/outline.json`, `${stateDir}/epics/`],
    outputs: [`${stateDir}/plan.json`],
    skills: ["converge-planning"],
    checks: [
      {
        id: "plan-exists",
        cmd: `test -f ${stateDir}/plan.json`,
        description: "Plan file created",
      },
      {
        id: "plan-valid",
        cmd: `node -e "const p=JSON.parse(require('fs').readFileSync('${stateDir}/plan.json','utf-8'));if(!p.epics||!p.epics.length)throw new Error('no epics')"`,
        description: "Plan has epics",
      },
    ],
    body: `Combine all per-epic plan files into a single master plan.

Read \`${stateDir}/outline.json\` for the epic structure.
Read each \`${stateDir}/epics/<epic-id>.json\` for the detailed task breakdown.

Merge them into \`${stateDir}/plan.json\`:
\`\`\`json
{
  "name": "${name}",
  "description": "...",
  "pattern": "...",
  "epics": [
    {
      "id": "01-epic-name",
      "title": "...",
      "description": "...",
      "dependencies": [],
      "wbs": false,
      "tasks": [ ... ]
    }
  ],
  "facts": [],
  "apiNeeds": { "internal": [], "external": [] },
  "wbsSummary": [],
  "needsDeepening": []
}
\`\`\`

Also collect all \`needsDeepening\` flags from epic plans. If any task was flagged
as too complex by its epic decomposition subtask, include it in the top-level
\`needsDeepening\` array:
\`\`\`json
"needsDeepening": [
  { "epicId": "03-data-layer", "taskId": "003-api-endpoints", "reason": "12 endpoints to generate", "items": [...] }
]
\`\`\`

Ensure cross-epic dependencies use the \`epic-id.task-id\` format.
Verify no circular dependencies exist across the merged plan.`,
  });

  // ── Phase 3d: Deepen (conditional AI-driven WBS) ────────────────
  // AI reads plan.json, checks needsDeepening. If any tasks need
  // further decomposition, generates a wbs.js that spawns a subtask
  // per oversized task. If nothing needs deepening, generates a
  // wbs.js that returns immediately (zero subtasks).
  await ctx.spawn({
    id: "003-deepen",
    title: "Sub-decompose complex tasks (if needed)",
    dependencies: ["003-merge"],
    inputs: [`${stateDir}/plan.json`],
    outputs: [`${stateDir}/deepened/`],
    blocking: true,
    wbs: {
      type: "ai",
      prompt: `Read \`${stateDir}/plan.json\` and check the \`needsDeepening\` array.

If needsDeepening is empty or missing:
  Generate a wbs.js that simply returns (spawns zero tasks).

If needsDeepening has entries:
  Generate a wbs.js that spawns ONE subtask per entry. Each subtask should:
  - Have id: \`003-d-{padded-index}-{epicId}-{taskId}\`
  - Title: "Sub-decompose: {epicId}/{taskId}"
  - Input: ${stateDir}/plan.json
  - Output: ${stateDir}/deepened/{epicId}-{taskId}.json
  - Check: output file exists and is valid JSON
  - Skill: converge-planning
  - Body: instructions to break the oversized task into smaller subtasks,
    specifying whether to replace it with WBS (same template) or
    inline expansion (heterogeneous subtasks).
    Include the deepening reason and items list from needsDeepening.

Use ctx.ai.ask() to read plan.json and inspect the needsDeepening array
before deciding what to spawn.`,
    },
    body: `Conditional AI-driven WBS parent — AI generates a script that reads
plan.json and spawns sub-decomposition subtasks only for tasks flagged
as too complex. Spawns zero tasks if nothing needs deepening.`,
  });

  // ── Phase 3e: Finalize plan ────────────────────────────────────
  await ctx.spawn({
    id: "003-finalize",
    title: "Finalize plan with deepened tasks",
    dependencies: ["003-deepen"],
    inputs: [`${stateDir}/plan.json`, `${stateDir}/deepened/`],
    outputs: [`${stateDir}/plan.json`],
    skills: ["converge-planning"],
    checks: [
      {
        id: "plan-exists",
        cmd: `test -f ${stateDir}/plan.json`,
        description: "Plan file exists",
      },
      {
        id: "plan-valid",
        cmd: `node -e "const p=JSON.parse(require('fs').readFileSync('${stateDir}/plan.json','utf-8'));if(!p.epics||!p.epics.length)throw new Error('no epics')"`,
        description: "Plan has epics",
      },
    ],
    body: `Merge any deepening results back into the master plan.

If \`${stateDir}/deepened/\` contains files, read each one and integrate
the sub-decomposition results into \`${stateDir}/plan.json\`:
- Replace oversized tasks with their sub-task breakdowns
- Or convert them to WBS parents with their items listed
- Update dependency chains to reflect the new task structure

If \`${stateDir}/deepened/\` is empty or doesn't exist, the plan is already
at the right granularity — just verify \`${stateDir}/plan.json\` is intact
and remove the \`needsDeepening\` array (set to \`[]\`).

After finalizing, the plan should have:
- No task flagged as needing further decomposition
- All WBS candidates clearly marked
- All dependency chains valid`,
  });

  // ── Phase 4: Validate ──────────────────────────────────────────
  await ctx.spawn({
    id: "004-validate",
    title: "Validate plan completeness",
    dependencies: ["003-finalize"],
    inputs: [`${stateDir}/plan.json`, `${stateDir}/requirements.json`],
    outputs: [`${stateDir}/validation.json`],
    skills: ["converge-planning"],
    checks: [
      {
        id: "validation-exists",
        cmd: `test -f ${stateDir}/validation.json`,
        description: "Validation file created",
      },
      {
        id: "validation-passes",
        cmd: `node -e "const v=JSON.parse(require('fs').readFileSync('${stateDir}/validation.json','utf-8'));if(!v.valid)throw new Error(v.errors.join(', '))"`,
        description: "Validation passes",
      },
    ],
    body: `Verify the plan is complete, consistent, and executable.

Reference: load the converge-planning skill, then read \`pipeline.md\` Phase 4 (Validate) for the full validation checklist.

Read \`${stateDir}/plan.json\` and \`${stateDir}/requirements.json\`, then check:

1. **Structural completeness** — every epic has tasks, every task has outputs and checks
2. **Task quality** — ids are unique, titles are descriptive, bodies have clear instructions
3. **Dependency integrity** — all deps reference valid task ids, no circular dependencies
4. **Input/output chain** — every input file is produced by a prior task's output
5. **Requirements coverage** — every "must" feature maps to at least one task
6. **Facts documented** — at least 3 concrete facts
7. **Sizing** — no epic has more than 7 tasks, no task is too vague
8. **No unresolved deepening** — needsDeepening is empty

Write to \`${stateDir}/validation.json\`:
\`\`\`json
{
  "valid": true,
  "checks": {
    "structuralCompleteness": { "pass": true, "details": "..." },
    "taskQuality": { "pass": true, "details": "..." },
    "dependencyIntegrity": { "pass": true, "details": "..." },
    "inputOutputChain": { "pass": true, "details": "..." },
    "requirementsCoverage": { "pass": true, "details": "..." },
    "factsDocumented": { "pass": true, "details": "..." },
    "sizing": { "pass": true, "details": "..." }
  },
  "errors": [],
  "warnings": [],
  "summary": "Plan has N epics, M tasks, covers all must-have requirements"
}
\`\`\`

If validation fails, fix the issues in \`${stateDir}/plan.json\` and re-validate.
Do NOT proceed to emit until validation passes.`,
  });

  // ── Phase 5: Emit ──────────────────────────────────────────────
  await ctx.spawn({
    id: "005-emit",
    title: `Emit playbook: ${name}`,
    dependencies: ["004-validate"],
    inputs: [`${stateDir}/plan.json`, `${stateDir}/validation.json`],
    outputs: [`.converge/playbooks/${name}/playbook.yml`],
    checks: [
      {
        id: "playbook-yml-exists",
        cmd: `test -f .converge/playbooks/${name}/playbook.yml`,
        description: "playbook.yml created",
      },
      {
        id: "has-tasks",
        cmd: `test -d .converge/playbooks/${name}/tasks`,
        description: "Tasks directory created",
      },
    ],
    body: `Convert the validated plan into runnable playbook files.

Read \`${stateDir}/plan.json\` and generate the following file structure:

\`\`\`
.converge/playbooks/${name}/
├── playbook.yml
├── tasks/
│   ├── 01-<epic>/
│   │   ├── TASK.md           ← epic-level WBS parent (if epic has tasks)
│   │   └── tasks/
│   │       ├── 001-<task>/
│   │       │   └── TASK.md
│   │       └── 002-<task>/
│   │           └── TASK.md
│   ├── 02-<epic>/
│   │   ├── TASK.md
│   │   └── wbs.js            ← only if epic is a WBS candidate
│   └── ...
└── goals/
    └── 001-builds-clean/
        └── GOAL.md            ← if project has a build step
\`\`\`

**playbook.yml format:**
\`\`\`yaml
name: ${name}
description: <from plan.description>

run:
  mode: autonomous
  maxIterations: 50
  maxTaskAttempts: 3
  resume: true

checks:
  - id: builds-clean
    cmd: "<appropriate build command>"
\`\`\`

**TASK.md format** (for each task):
\`\`\`yaml
---
id: <task.id>
title: <task.title>
description: <task.description>
dependencies: <task.dependencies>
inputs: <task.inputs>
outputs: <task.outputs>
checks: <task.checks>
skills: <task.skills>
---

# <task.title>

<task.body>
\`\`\`

**For WBS epics**, generate a \`wbs.js\` that reads the plan data and spawns subtasks using \`ctx.spawn()\`.

${
  update
    ? `UPDATE MODE:
- Read existing playbook at .converge/playbooks/${name}/
- Preserve TASK.md files for completed tasks (check journal)
- Add new tasks, update changed tasks
- Do NOT delete completed tasks`
    : `Create all files from scratch.`
}

After writing all files, print a summary:
- Number of epics and tasks created
- Playbook location
- How to run: \`converge run --playbook=${name}\``,
  });
}

/**
 * Convert a prompt string into a kebab-case slug suitable for a playbook name.
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}
