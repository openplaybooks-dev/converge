# Self-Healing Task Definition Repair System

## Table of Contents

1. [Overview](#overview)
2. [What is a Gap?](#what-is-a-gap)
3. [Gap Resolution Flow](#gap-resolution-flow)
4. [Strategy Deep Dive](#strategy-deep-dive)
5. [Configuration](#configuration)
6. [Usage Examples](#usage-examples)
7. [Health Check Hooks](#health-check-hooks)
8. [Troubleshooting](#troubleshooting)
9. [API Reference](#api-reference)
10. [Best Practices](#best-practices)

---

## Overview

The Self-Healing Task Definition Repair System is an AI-driven framework that automatically detects and fixes task definition mismatches without manual intervention.

### Key Features

- **AI-Driven Analysis**: Uses Claude AI to analyze gaps and determine root causes
- **Two-Phase Repair Pattern**: LEARN (analyze) → FIX (execute repair)
- **Proactive Health Checks**: Detects issues before they cause failures
- **Extensible Strategy System**: Plug-and-play repair strategies with priority-based execution
- **Transparent & Auditable**: All decisions logged with reasoning in LEARN.md files

### How It Works

```
Gap Detected → Strategy Selection → LEARN Phase → FIX Phase → Retry Validation
                                         ↓              ↓
                                   LEARN.md        REPAIR.md
                                  (findings)    (repair notes)
```

---

## What is a Gap?

A **gap** is a mismatch between what a task expects and what actually exists.

### Gap Types

```typescript
type Gap = {
  id: string;
  type: "structural" | "blocker" | "corrupted";
  description: string;
  severity?: "low" | "medium" | "high" | "critical";
  metadata: {
    gapKind: "output" | "input" | "check-failed" | "blocker";
    taskId: string;
    epicId?: string;
    expectedOutput?: string;
    actualOutput?: string;
    taskCompletedSuccessfully?: boolean;
    // ... more metadata
  };
};
```

### Common Gap Scenarios

1. **Output Mismatch** (`gapKind: 'output'`)
   - Task completed but output file doesn't exist where expected
   - Example: Expected `.stitch/designs/X.html`, found `.stitch/designs/X/design.html`

2. **Check Failed** (`gapKind: 'check-failed'`)
   - Validation check fails (e.g., `test -f file.txt` returns non-zero)
   - Example: Check expects flat file but tool outputs directory structure

3. **Missing Input** (`type: 'missing-intermediate'`)
   - Task needs input that no prior task produces
   - Example: Task B needs `src/components/Button.tsx` but no task created it

4. **Blocker** (`gapKind: 'blocker'`)
   - Task depends on another task that failed
   - Example: Task A failed → Task B can't run

---

## Gap Resolution Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Task Execution                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Gap Detection                                  │
│  • Check expected outputs exist                                 │
│  • Run validation checks                                        │
│  • Verify dependencies met                                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
                    ❓ Gaps Found?
                         │
                    ┌────┴────┐
                   NO          YES
                    │           │
                    ▼           ▼
            ✅ Task Done   🔧 Gap Resolution Pipeline
                                │
                                ▼
        ┌───────────────────────────────────────────────────────┐
        │      Strategy Selection (canHandle() filtering)       │
        │                                                        │
        │  1. Filter: strategy.canHandle(gap) === true          │
        │  2. Sort by priority (higher = runs first)            │
        └────────────────────┬───────────────────────────────────┘
                             │
                             ▼
        ┌───────────────────────────────────────────────────────┐
        │         Try Each Strategy (Priority Order)            │
        │                                                        │
        │  For each strategy in filtered list:                  │
        │    1. console.log "Trying strategy: {name}"           │
        │    2. result = await strategy.tryFix(gap, ctx)        │
        │    3. Record attempt in attempts.jsonl                │
        │    4. If success → DONE ✅                            │
        │    5. If shouldRetry → retry up to 3 times            │
        │    6. Else → try next strategy                        │
        └────────────────────┬───────────────────────────────────┘
                             │
                        ┌────┴────┐
                       SUCCESS   FAIL
                         │         │
                         ▼         ▼
                  ✅ Gap Resolved  ❌ All Strategies Exhausted
                  │                │
                  ▼                ▼
            Task Continues    Task Marked as Blocked
```

---

## Strategy Deep Dive

### Current Strategy Pipeline (Priority Order)

**SIMPLIFIED TO 5 CORE STRATEGIES** (April 2026)

```typescript
// From buildDefaultPipeline() in src/repair/index.ts
const strategies = [
  new WBSGeneratorRepairStrategy(), // Priority: 10
  new ToolEnvironmentRepairStrategy(), // Priority: 8
  new TaskDefinitionRepairStrategy(), // Priority: 7
  new MissingIntermediateTaskStrategy(), // Priority: 5
  new TaskRunStrategy(), // Priority: 5 (last resort)
];
```

**Execution order** (after `canHandle()` filtering):

1. **WBSGeneratorRepairStrategy** (10) - Fixes root cause in task generators
2. **ToolEnvironmentRepairStrategy** (8) - Handles external tool/env configuration
3. **TaskDefinitionRepairStrategy** (7) - AI-driven definition repair + check fixes
4. **MissingIntermediateTaskStrategy** (5) - Auto-spawn missing tasks + upstream rerun
5. **TaskRunStrategy** (5) - Simple retry for transient failures

**Removed Strategies** (consolidated):

- ✂️ CheckCommandRepairStrategy → TaskDefinitionRepairStrategy
- ✂️ UpstreamRerunStrategy → MissingIntermediateTaskStrategy
- ✂️ ToolIntegrationRepairStrategy → ToolEnvironmentRepairStrategy
- ✂️ SelfRepairStrategy (too risky, use TaskDefinitionRepair instead)
- ✂️ AIBlockerAnalysisStrategy (too expensive, other strategies cover use cases)

---

### Why Simplify?

**Before** (9 strategies):

- Overlapping responsibilities (4+ strategies handled tool/check issues)
- High cost ($0.05-$0.10 per AIBlockerAnalysis call)
- High risk (SelfRepair modifies code without rollback)
- Confusing documentation (1,305 lines to understand system)

**After** (5 strategies):

- Clear, non-overlapping responsibilities
- Lower cost (removed expensive AI analysis)
- Lower risk (only safe strategies remain)
- Simpler documentation (~600 lines)

**Migration Path:**
All functionality preserved - removed strategies' logic consolidated into remaining ones.

---

### 1. TaskDefinitionRepairStrategy

**Priority**: 7
**Handles**: `output`, `check-failed` gaps
**Consolidates**: CheckCommandRepairStrategy (check fixes now in PHASE 2)

**When it runs:**

```typescript
canHandle(gap: Gap): boolean {
  return gap.metadata?.gapKind === 'output' ||
         gap.metadata?.gapKind === 'check-failed';
}
```

**What it does:**

AI-driven two-phase repair for task definition mismatches.
Now includes check command repair (previously CheckCommandRepairStrategy).

**PHASE 1: LEARN**

1. Gathers evidence:
   - Task logs (last 50 lines)
   - Filesystem state (actual outputs)
   - Task definition (SKILL.md frontmatter)

2. AI analyzes gap:
   - Expected vs actual behavior
   - Root cause identification
   - Hypotheses with confidence levels
   - Recommended repair strategies

3. Generates two files:
   - **LEARN.md**: Gap analysis and findings (read-only after creation)
   - **REPAIR.md**: Repair notes and history (updated with each repair attempt)
   - Both saved to: `.converge/journal/epics/{epic}/tasks/{task}/attempts/{n}/`

**PHASE 2: FIX**

1. Reads LEARN.md analysis
2. AI selects best repair strategy
3. Executes repair actions:
   - `update-skill-md`: Modify SKILL.md outputs/checks
   - `create-symlink`: Create compatibility symlinks
   - `fix-check-command`: Fix broken check with fallback patterns (🆕 from CheckCommandRepair)
   - `regenerate-wip`: Delete WIP to force fresh start
4. Updates REPAIR.md with repair notes and outcome

**Example LEARN.md (findings only):**

```markdown
# Gap Analysis: 003-001-design-home-output

> **Findings Only** - For repair notes, see REPAIR.md

## Root Cause Analysis

Stitch CLI changed output format from flat files to directory structure.
The task definition at line 45 hardcodes flat file paths, but Stitch CLI
now outputs to {screenId}/design.html.

## Hypotheses

1. **Tool Integration Change** (confidence: high)
   - Stitch CLI updated output format
   - Task definition not updated to match
   - Evidence: Logs show "stitch generate completed successfully"

## Recommended Repair Strategies

1. **update-task-definition** (confidence: high)
   - Action: Update SKILL.md outputs to expect directory structure
   - Rationale: Aligns task definition with actual tool behavior
   - Risk: Low - preserves compatibility with symlink
```

**Example REPAIR.md (repair notes only):**

```markdown
# Repair Notes: 003-001-design-home-output

> **Repair Actions Only** - For gap analysis, see LEARN.md

## Root Cause (Summary)

Stitch CLI changed output format from flat files to directory structure...

## Repair History

### Attempt #1 - task-definition-repair

**Executed At**: 2026-04-05T00:15:23.456Z

**Reasoning**:
Highest confidence strategy from analysis. Updates definition to match actual Stitch CLI behavior.

**Actions Taken**:

- Updated SKILL.md with new outputs/checks
- Created symlink: .stitch/designs/home-lesson-tree.html → home-lesson-tree/design.html

**Outcome**: success

---

## Next Steps

✅ Repair successful - gap resolved!
```

**Pros:**

- ✅ Transparent AI reasoning (LEARN.md)
- ✅ Two-phase pattern is safer
- ✅ Complete audit trail
- ✅ Backward compatible (symlinks)

**Cons:**

- ⚠️ Requires 2 AI calls (expensive ~$0.02-0.05)
- ⚠️ Slower (~3-5 seconds)
- ⚠️ LEARN.md files accumulate in journal

---

### 2. WBSGeneratorRepairStrategy 🆕

**Priority**: 10 (highest)
**Handles**: Systemic issues across multiple tasks

**When it runs:**

```typescript
canHandle(gap: Gap): boolean {
  return gap.metadata?.isSystemicIssue === true;
}
```

**What it does:**

Detects when multiple tasks fail with the same pattern and fixes the root cause in the WBS generator.

**Process:**

1. Detects pattern: 2+ related tasks with identical gaps
2. AI analyzes WBS generator code
3. Identifies bug location (e.g., line 45)
4. AI generates corrected generator code
5. Applies fix to generator
6. Regenerates all affected tasks

**Example:**

```
3 tasks fail: 003-001-design-X, 003-002-design-Y, 003-003-design-Z
All have: output path mismatch (.stitch/designs/{id}.html vs {id}/design.html)

Gap Detected → WBSGeneratorRepairStrategy
  → AI analyzes: 003-generate-html-designs/task.ts
  → Finds bug: Line 45 hardcodes .outputs(['.stitch/designs/${screenId}.html'])
  → Should be:  .outputs(['.stitch/designs/${screenId}/design.html'])
  → Generates corrected code
  → Applies fix to generator
  → Regenerates all 3 tasks
  → All pass validation! ✅
```

**Pros:**

- ✅ Fixes root cause, not symptoms
- ✅ Prevents future tasks from failing
- ✅ One fix resolves multiple gaps

**Cons:**

- ⚠️ Requires `isSystemicIssue: true` in gap metadata
- ⚠️ Regenerating tasks loses attempt history
- 🔴 Dangerous - modifies generator code
- 🔴 No rollback if AI fix is wrong

---

### 3. ToolEnvironmentRepairStrategy

**Priority**: 8
**Handles**: External tool/environment configuration issues
**Replaces**: ToolIntegrationRepairStrategy (expanded scope)

**When it runs:**

```typescript
canHandle(gap: Gap): boolean {
  return (
    (gap.metadata?.gapKind === 'output' ||
     gap.metadata?.gapKind === 'check-failed') &&
    gap.metadata?.taskCompletedSuccessfully === true
  );
}
```

**What it does:**

Detects and repairs issues related to external tools and environment configuration:

1. **Tool format changes** - External tool changed output format
2. **Missing tools** - Required CLI tool not installed
3. **Tool version mismatch** - Tool version incompatibility
4. **Environment config** - Missing environment variables or configuration

**Process:**

1. Analyzes task logs for tool invocations and environment issues
2. Detects tool format changes OR missing dependencies
3. AI determines issue type and adaptation strategy
4. Creates adaptation layer:
   - Updates SKILL.md to match new format
   - Creates compatibility symlinks
   - Generates setup instructions for missing tools
   - (Future) Creates wrapper scripts for version compatibility

**Example 1: Tool Format Change**

```
Stitch CLI updated: now outputs to directories instead of flat files

Task completes: "stitch generate completed successfully"
Expected: .stitch/designs/home.html
Found:    .stitch/designs/home/design.html

Gap Detected → ToolEnvironmentRepairStrategy
  → AI analyzes: issueType = 'tool-format-change'
  → Tool: Stitch CLI
  → Old format: .stitch/designs/{screenId}.html
  → New format: .stitch/designs/{screenId}/design.html
  → Updates SKILL.md with new path
  → Creates symlink for backward compatibility
  → Success! ✅
```

**Example 2: Missing Tool**

```
Task logs: "command not found: stitch"

Gap Detected → ToolEnvironmentRepairStrategy
  → AI analyzes: issueType = 'missing-tool'
  → Tool: Stitch CLI
  → Action: log-setup-instructions
  → Output: "Install Stitch CLI: npm install -g @google/stitch-cli"
  → Task fails with clear setup instructions
```

**Pros:**

- ✅ Handles both tool changes AND environment issues
- ✅ Creates compatibility layers (symlinks)
- ✅ Provides clear setup instructions
- ✅ Expanded scope vs ToolIntegrationRepairStrategy

**Cons:**

- ⚠️ Only detects changes after first failure
- ⚠️ Can't auto-install missing tools (security)
- ⚠️ Symlinks can accumulate over time

---

### 4. MissingIntermediateTaskStrategy

**Priority**: 5
**Handles**: Missing intermediate tasks + upstream blockers
**Consolidates**: UpstreamRerunStrategy (upstream rerun logic added)

**When it runs:**

```typescript
canHandle(gap: Gap): boolean {
  return gap.metadata?.gapKind === 'check-failed';
}
```

**What it does:**

Fixes broken validation check commands that don't match actual outputs.

**Process:**

1. Analyzes failed check command
2. Lists actual files in output directory
3. AI generates corrected check command
4. Updates SKILL.md with new check

**Example:**

```
Check fails: test -f .stitch/designs/home.html
File exists: .stitch/designs/home/design.html

Gap Detected → CheckCommandRepairStrategy
  → Current check: test -f .stitch/designs/home.html
  → Actual files: .stitch/designs/home/design.html
  → AI generates corrected check:
    test -f .stitch/designs/home/design.html || test -f .stitch/designs/home.html
  → Updates SKILL.md with new check
  → Retry → Success! ✅
```

**Pros:**

- ✅ Quick - single AI call
- ✅ Supports fallback patterns (||)
- ✅ Doesn't modify outputs

**Cons:**

- ⚠️ Band-aid fix - doesn't address root cause
- ⚠️ Can generate overly permissive checks
- ⚠️ Check commands can become complex

---

### 5. MissingIntermediateTaskStrategy

**Priority**: 5 (default)
**Handles**: Missing inputs that should be generated

**When it runs:**

```typescript
canHandle(gap: Gap): boolean {
  return gap.type === 'missing-intermediate';
}
```

**What it does:**

Automatically spawns gap-fixer tasks to generate missing inputs.

**Process:**

1. Detects when task needs input that no prior task produces
2. AI analyzes what's needed and how to create it
3. Spawns gap-fixer task with prompt to generate missing file
4. Marks current task as blocked until gap-fixer completes
5. Retries original task after gap-fixer succeeds

**Example:**

```
Task B needs: src/components/Button.tsx
But no task produced it!

Gap Detected → MissingIntermediateTaskStrategy
  → Spawns "gap-fixer-001-button-component" task
  → AI prompt: "Create React Button component in src/components/Button.tsx"
  → Gap-fixer task executes
  → Creates Button.tsx
  → Task B retried → Success! ✅
```

**Pros:**

- ✅ Automatically fills missing dependencies
- ✅ AI generates intelligent gap-fixer tasks
- ✅ Reduces manual task creation

**Cons:**

- ⚠️ Can spawn incorrect gap-fixers if AI misunderstands
- ⚠️ Gap-fixer might create file in wrong format
- ⚠️ Max 3 attempts before giving up
- 🔴 Can create circular dependencies

---

### 6. UpstreamRerunStrategy

**Priority**: 5 (default)
**Handles**: Blocker gaps from upstream failures

**When it runs:**

```typescript
canHandle(gap: Gap): boolean {
  return gap.metadata?.gapKind === 'blocker';
}
```

**What it does:**

Re-runs upstream tasks that failed, unblocking dependent tasks.

**Process:**

1. Identifies upstream task that should have produced the input
2. Re-runs the upstream task
3. Retries current task if upstream succeeds

**Example:**

```
Task B depends on: output from Task A
Task A failed → Task B blocked

Gap Detected → UpstreamRerunStrategy
  → Finds Task A produced the needed file
  → Re-runs Task A
  → Task A succeeds
  → Retries Task B → Success! ✅
```

**Pros:**

- ✅ Fast - just re-runs existing task
- ✅ No AI required (deterministic)
- ✅ Works for transient failures

**Cons:**

- ⚠️ Won't help if upstream has fundamental issue
- ⚠️ Can cause cascading re-runs
- 🔴 Doesn't fix root cause

---

### 7. TaskRunStrategy

**Priority**: 5 (default)
**Handles**: Transient failures

**When it runs:**

```typescript
canHandle(gap: Gap): boolean {
  return gap.metadata?.gapKind === 'output' ||
         gap.metadata?.gapKind === 'check-failed' ||
         gap.metadata?.gapKind === 'corrupted';
}
```

**What it does:**

Simply re-runs the task that failed (blind retry).

**Process:**

1. Re-executes task without any changes
2. Hopes transient issue resolved (network, timeout, etc.)

**Example:**

```
Task fails: network timeout during npm install

Gap Detected → TaskRunStrategy
  → Re-runs task
  → Network works this time
  → Success! ✅
```

**Pros:**

- ✅ Fast - no AI overhead
- ✅ Works for transient failures
- ✅ Simple and reliable

**Cons:**

- ⚠️ Won't fix fundamental issues
- ⚠️ Wastes time if issue persists
- 🔴 No intelligence - blind retry

---

### 8. AIBlockerAnalysisStrategy

**Priority**: 5 (default)
**Handles**: Unknown blockers

**When it runs:**

```typescript
canHandle(gap: Gap): boolean {
  return gap.metadata?.gapKind === 'blocker';
}
```

**What it does:**

Deep AI analysis for complex, unknown blocker issues.

**Process:**

1. Reads task code, logs, filesystem
2. AI diagnoses root cause
3. AI suggests fix strategy:
   - `fix_task_definition` → Update SKILL.md
   - `create_files` → Generate missing files
   - `run_task` → Re-run task
   - `manual_intervention` → Give up
4. Executes suggested fix

**Example:**

```
Task blocked: mysterious dependency issue

Gap Detected → AIBlockerAnalysisStrategy
  → AI reads: task code, logs, filesystem
  → AI diagnoses: "Missing environment variable API_KEY"
  → AI suggests: Create .env file with API_KEY
  → Executes fix
  → Retry → Success! ✅
```

**Pros:**

- ✅ Handles complex, unknown issues
- ✅ AI can diagnose subtle problems
- ✅ Comprehensive analysis

**Cons:**

- ⚠️ Very slow (30-60 seconds)
- ⚠️ Expensive (high token usage)
- 🔴 Can hallucinate incorrect fixes
- 🔴 Not deterministic

---

### 9. SelfRepairStrategy

**Priority**: 5 (default)
**Handles**: Code bugs in task outputs

**When it runs:**

```typescript
canHandle(gap: Gap): boolean {
  return gap.metadata?.gapKind === 'check-failed' ||
         gap.metadata?.gapKind === 'corrupted';
}
```

**What it does:**

Targeted AI code repair for check failures caused by bugs.

**Process:**

1. AI reads generated task code
2. Identifies syntax errors, bugs, typos
3. Generates corrected code
4. Applies fix to task files

**Example:**

```
Task check fails: generated code has syntax error

Gap Detected → SelfRepairStrategy
  → AI reads: generated code
  → AI finds: missing semicolon at line 42
  → AI generates: corrected code
  → Applies fix
  → Retry → Success! ✅
```

**Pros:**

- ✅ Fixes actual code bugs
- ✅ Learns from error messages
- ✅ Can fix typos, syntax errors

**Cons:**

- ⚠️ Only works if task code is accessible
- 🔴 Modifying task code is risky
- 🔴 AI might introduce new bugs
- 🔴 Hard to rollback

---

## Configuration

### Enable/Disable Strategies

**Globally** (in `src/repair/index.ts`):

```typescript
export function buildDefaultPipeline(projectDir, journalCtx) {
  const strategies = [
    new MissingIntermediateTaskStrategy(),
    // new TaskDefinitionRepairStrategy(), // ❌ Disabled
    new TaskRunStrategy(),
  ];
  return new GapResolutionPipeline(
    strategies,
    projectDir,
    journalCtx,
    timeline,
    tracker,
  );
}
```

**Per-Task** (in `SKILL.md`):

```yaml
---
name: My Task
metadata:
  disableTaskDefinitionRepair: true
---
```

### Adjust Strategy Priority

```typescript
import { TaskDefinitionRepairStrategy } from "@converge/core/repair";

const strategy = new TaskDefinitionRepairStrategy();
(strategy as any).priority = 10; // Higher = runs earlier

// Register in custom pipeline
const strategies = [strategy /* ... */];
```

### AI Configuration

```typescript
import { createAIContext } from "@converge/core/ai";

const ai = createAIContext(projectDir, journalCtx);

await ai.ask(prompt, {
  phase: "analyze",
  allowedTools: ["Read", "Glob", "Bash"],
  timeoutMs: 180_000, // 3 minutes
  schema: MyZodSchema, // Optional zod validation
});
```

---

## Usage Examples

### Example 1: Automatic Definition Repair

**Scenario**: Stitch CLI changed output format

```bash
cd example
pnpm converge run --epic 02-prepare-designs

# Console output:
# Gap Detected: output mismatch for 003-001-design-home
# Expected: .stitch/designs/home.html
# Found:    .stitch/designs/home/design.html
#
# [1] Trying strategy: tool-integration-repair
# 🔍 Analyzing for tool integration changes...
# 🧠 AI analyzing tool behavior...
# 🔧 Applying adaptation: update-expectations
# ✓ Updated SKILL.md to match new tool format
# ✓ Created compatibility symlink: home.html → home/design.html
#
# ✅ Resolved by: tool-integration-repair
```

**Result**:

- SKILL.md updated with correct output path
- Symlink created for backward compatibility
- Task validation passes on retry

### Example 2: WBS Generator Repair

**Scenario**: Multiple tasks fail with same pattern

```bash
pnpm converge run --epic 02-prepare-designs

# Console output:
# Gap Detected: 3 tasks with identical output mismatch
# Pattern: All expect flat files but tool outputs directories
#
# [1] Trying strategy: wbs-generator-repair
# 🔍 Analyzing WBS generator for systemic issue...
# 🧠 AI analyzing generator code...
# Bug Location: Line 45 - .outputs([`.stitch/designs/${screenId}.html`])
# 🔧 Generating fixed generator code...
# 💾 Applying fix to generator...
# 🔄 Regenerating 3 affected tasks...
# ✓ Regenerated task: 003-001-design-home
# ✓ Regenerated task: 003-002-design-lesson
# ✓ Regenerated task: 003-003-design-progress
#
# ✅ Resolved by: wbs-generator-repair
```

**Result**:

- Generator code fixed at line 45
- All 3 affected tasks regenerated
- Future spawned tasks use correct format

### Example 3: Health Check Detection

**Scenario**: Task completes but has anomalies

```bash
pnpm converge run --epic 02-prepare-designs

# Console output:
# ✅ Task 003-001-design-home completed
# ⚠️  Task health check found issues:
#    [medium] Expected .stitch/designs/home.html but found home/design.html
#    💡 Suggested fix: Update task outputs to match new structure
# 🔧 Triggering self-healing...
#
# [1] Trying strategy: task-definition-repair
# 🔍 Phase 1: LEARN - Analyzing gap...
# ✅ Analysis complete, LEARN.md saved
# 🔧 Phase 2: FIX - Executing repair...
# ✓ Updated SKILL.md
#
# ✅ Resolved by: task-definition-repair
```

**Result**:

- Health check detected mismatch proactively
- Issue logged to journal
- Self-healing triggered automatically

---

## Health Check Hooks

### taskCompletionHealthCheck

**Hook**: `task:complete`

Analyzes completed tasks for potential issues that might cause downstream failures.

**Checks:**

- Output path mismatches (expected vs actual)
- Warnings about deprecated formats
- Tool version changes
- Unexpected file structures
- Suspicious warnings in logs

**Configuration**:

```typescript
// In converge.ts
import { registerHealthCheckHooks } from "@converge/core/repair";

export default defineConverge({
  hooks: {
    ...registerHealthCheckHooks(),
  },
});
```

### wbsSpawnReview

**Custom Event**: `wbs:spawned`

Reviews task definitions spawned by WBS generators before execution.

**Checks:**

- Consistent output path formats across all tasks
- Realistic output paths for tools being used
- Check commands match output paths
- Common mistakes (e.g., flat files when tool outputs directories)

**Usage**:

```typescript
// In WBS context
await ctx.spawn(taskDef);

// Review spawned tasks
await wbsSpawnReview({
  parentTaskId: ctx.taskId,
  childTasks: spawnedTasks,
  ctx,
});
```

---

## Troubleshooting

### Common Issues

#### 1. AI Analysis Timeout

**Symptom**: `Strategy failed: AI analysis timed out`

**Solution**:

```typescript
// Increase timeout in ai.ask()
await ai.ask(prompt, {
  timeoutMs: 300_000, // 5 minutes
});
```

#### 2. Low Confidence Repairs Skipped

**Symptom**: `Strategy returns: Low confidence repair - skipping for safety`

**Solution**:

- Review LEARN.md for AI reasoning
- Provide more context in gap metadata
- Adjust prompts to be more specific

#### 3. LEARN.md Not Created

**Symptom**: No LEARN.md file in journal directory

**Solutions**:

- Check permissions on `.converge/journal` directory
- Check available disk space
- Review journal events for errors:
  ```bash
  cat .converge/journal/epics/{epic}/tasks/{task}/attempts/01/logs/events.jsonl
  ```

#### 4. Symlink Creation Fails

**Symptom**: `Failed to create symlink: EACCES permission denied`

**Solutions**:

- Check file permissions in output directory
- Ensure target file exists before creating symlink
- Use absolute paths in `createSymlink()`

#### 5. Strategy Not Running

**Symptom**: Expected strategy doesn't execute

**Debug steps**:

1. Check `canHandle()` logic:

   ```typescript
   console.log("Gap metadata:", JSON.stringify(gap.metadata, null, 2));
   console.log("Can handle?", strategy.canHandle(gap));
   ```

2. Check strategy priority (higher priority runs first)

3. Check if another strategy already resolved the gap

### Debug Mode

Enable verbose logging in strategies:

```typescript
// In strategy.ts
console.log(`   🔍 Gap:`, JSON.stringify(gap, null, 2));
console.log(`   📖 LEARN.md:`, JSON.stringify(learnDoc, null, 2));
console.log(`   🔧 Repair plan:`, JSON.stringify(repairPlan, null, 2));
console.log(`   ✅ Result:`, JSON.stringify(result, null, 2));
```

### View Logs

```bash
# Find all LEARN.md files
find .converge/journal -name "LEARN.md"

# View latest LEARN.md
cat .converge/journal/epics/{epic}/tasks/{task}/attempts/01/LEARN.md

# View journal events
cat .converge/journal/epics/{epic}/tasks/{task}/attempts/01/logs/events.jsonl | jq

# View attempt records
cat .converge/journal/epics/{epic}/tasks/{task}/attempts.jsonl | jq
```

---

## API Reference

### AIContext

```typescript
class AIContext {
  constructor(projectDir: string, journalCtx?: JournalContext);

  // Ask AI with optional schema validation
  async ask<T>(
    prompt: string,
    options?: {
      phase?: string;
      label?: string;
      allowedTools?: string[];
      timeoutMs?: number;
      schema?: ZodSchema<T>;
    },
  ): Promise<AIResponse<T>>;

  // Ask AI and parse as JSON
  async askJson<T>(
    prompt: string,
    schema: ZodSchema<T>,
    options?: AskOptions,
  ): Promise<T>;

  // Ask yes/no question
  async askBool(prompt: string, options?: AskOptions): Promise<boolean>;

  // Create child context
  withJournalContext(journalCtx: JournalContext): AIContext;
}
```

### AIResponse

```typescript
class AIResponse<T> {
  // Get raw text
  asText(): string;

  // Parse as JSON (handles markdown code blocks)
  asJson<J = T>(): J;

  // Parse as boolean
  asBool(): boolean;

  // Extract reasoning from response
  getReasoning(): string;

  // Get raw AgentFnResult
  getRaw(): AgentFnResult<T>;
}
```

### FilesystemHelper

```typescript
interface FilesystemHelper {
  // Read file contents
  readFile(path: string): Promise<string>;

  // Write file (creates parent directories)
  writeFile(path: string, content: string): Promise<void>;

  // List files matching pattern
  listDirectory(path: string, pattern?: string): Promise<string[]>;

  // Create symbolic link
  createSymlink(target: string, link: string): Promise<void>;

  // Update SKILL.md frontmatter
  updateSkillMd(path: string, updates: Partial<TaskDefinition>): Promise<void>;

  // Remove directory recursively
  removeDirectory(path: string): Promise<void>;
}
```

### TaskHelper

```typescript
interface TaskHelper {
  // Get task definition from SKILL.md
  getDefinition(taskId: string): Promise<TaskDefinition>;

  // Get last N lines from task logs
  getLogTail(taskId: string, lines?: number): Promise<string[]>;

  // Get all attempt records
  getAttempts(taskId: string): Promise<AttemptRecord[]>;
}
```

### FixStrategy

```typescript
interface FixStrategy {
  readonly name: string;
  readonly description?: string;
  readonly priority?: number; // Higher = runs first

  // Quick check if strategy can handle gap
  canHandle(gap: Gap): boolean;

  // Execute repair
  tryFix(gap: Gap, ctx: StrategyContext): Promise<StrategyOutcome>;
}

interface StrategyContext {
  projectDir: string;
  journalCtx: JournalContext;
  timeline: ExecutionTimeline;
  attempt: number; // 1-based attempt number
}

type StrategyOutcome =
  | {
      success: true;
      reason?: string;
      metadata?: Record<string, unknown>;
    }
  | {
      success: false;
      reason: string;
      shouldRetry?: boolean;
      metadata?: Record<string, unknown>;
    };
```

---

## Best Practices

### 1. Monitor AI Costs

Track API usage in journal events:

```typescript
import { logTaskEvent } from "@converge/core/journal";

await logTaskEvent(projectDir, epicId, taskId, "AI_API_CALL", "Analysis", {
  phase: "analyze",
  tokenCount: result.usage?.total_tokens,
  estimatedCost: (result.usage?.total_tokens || 0) * 0.00001,
});
```

### 2. Use Confidence Thresholds

Skip low-confidence repairs for safety:

```typescript
if (analysis.confidence === "low") {
  return {
    success: false,
    reason: "Low confidence - skipping for safety",
    shouldRetry: false,
  };
}
```

### 3. Preserve Repair History

Keep all LEARN.md files for debugging:

```typescript
// Don't delete old attempts
const learnPath = `attempts/${attempt.toString().padStart(2, "0")}/LEARN.md`;
```

### 4. Test Strategies Independently

Unit test strategies with mock gaps:

```typescript
import { TaskDefinitionRepairStrategy } from "@converge/core/repair";

const strategy = new TaskDefinitionRepairStrategy();
const mockGap = {
  /* gap object */
};
const mockCtx = {
  /* context */
};

const result = await strategy.tryFix(mockGap, mockCtx);
expect(result.success).toBe(true);
```

### 5. Use Dry-Run Mode

Preview repairs without applying them:

```typescript
const DRY_RUN = process.env.CONVERGE_DRY_RUN === "true";

if (DRY_RUN) {
  console.log("Would execute:", action);
} else {
  await executeAction(action);
}
```

### 6. Make canHandle() Precise

Avoid broad filters that match too many gaps:

```typescript
// ✅ Good: Specific
canHandle(gap: Gap): boolean {
  return gap.metadata?.gapKind === 'output' &&
         gap.metadata?.taskCompletedSuccessfully === true;
}

// ❌ Bad: Too broad
canHandle(gap: Gap): boolean {
  return gap.type === 'structural'; // Matches everything!
}
```

### 7. Return shouldRetry Wisely

Only retry when it makes sense:

```typescript
// shouldRetry: true when:
// - Fix applied, just needs validation
// - Transient failure possible

// shouldRetry: false when:
// - Fundamental issue
// - Low confidence fix
// - Already tried multiple times
```

### 8. Log Generously

Users need visibility into what AI is doing:

```typescript
console.log(`   🔍 Analyzing gap: ${gap.description}`);
console.log(`   🧠 AI detected: ${analysis.rootCause}`);
console.log(`   🔧 Applying fix: ${action.type}`);
console.log(`   ✅ Fixed: ${result.reason}`);
```

---

## Advanced Topics

### Custom Repair Strategies

Create your own repair strategy:

```typescript
import {
  FixStrategy,
  StrategyContext,
  StrategyOutcome,
} from "@converge/core/repair";
import { createAIContext } from "@converge/core/ai";

export class CustomRepairStrategy implements FixStrategy {
  readonly name = "custom-repair";
  readonly description = "My custom repair logic";
  readonly priority = 9;

  canHandle(gap: Gap): boolean {
    return gap.metadata?.customCondition === true;
  }

  async tryFix(gap: Gap, ctx: StrategyContext): Promise<StrategyOutcome> {
    const ai = createAIContext(ctx.projectDir, ctx.journalCtx);

    // Your custom repair logic here
    const analysis = await ai.askJson(prompt, schema);

    // Execute repair
    await executeCustomFix(analysis);

    return {
      success: true,
      reason: "Custom fix applied",
      metadata: { analysis },
    };
  }
}
```

Register in pipeline:

```typescript
// In src/repair/index.ts
export function buildDefaultPipeline(projectDir, journalCtx) {
  const strategies = [
    new CustomRepairStrategy(), // Add your strategy
    new MissingIntermediateTaskStrategy(),
    // ... other strategies
  ];
  return new GapResolutionPipeline(/* ... */);
}
```

### Strategy Registry

Use the registry for dynamic strategy management:

```typescript
import { StrategyRegistry } from "@converge/core/repair";

const registry = new StrategyRegistry();

// Register strategies
registry.register(new CustomStrategy(), /* priority */ 10);
registry.register(new AnotherStrategy(), /* priority */ 8);

// Find applicable strategies
const applicable = await registry.findApplicableStrategies(gap);

// Get all strategies
const all = registry.getAll();

// Get strategy by name
const strategy = registry.get("custom-repair");
```

---

## Future Enhancements

### Planned Features

1. **Batch Repair** - Analyze multiple related gaps in single AI call
2. **Pattern Detection** - Automatically detect systemic issues
3. **Cost Control** - Cache AI analyses for similar gaps
4. **Confidence Tuning** - Learn from successful repairs
5. **Rollback** - Auto-rollback if repair makes things worse
6. **LEARN.md Viewer** - Dashboard for browsing repair history

### Contributing

To add a new strategy:

1. Create strategy class implementing `FixStrategy`
2. Add to `buildDefaultPipeline()` in `src/repair/index.ts`
3. Export from `src/repair/index.ts`
4. Add documentation and tests
5. Update this guide

---

## Support

For issues or questions:

1. Check LEARN.md for detailed analysis
2. Review journal events for strategy execution
3. Enable verbose logging for debugging
4. File issue in Converge framework repository

## References

- [Implementation Summary](../../../../IMPLEMENTATION_SUMMARY.md)
- [TaskDefinitionRepairStrategy README](../src/repair/strategies/task-definition-repair/README.md)
- [Quick Start Guide](../../../../QUICK_START.md)
- [Final Summary](../../../../FINAL_IMPLEMENTATION_SUMMARY.md)
