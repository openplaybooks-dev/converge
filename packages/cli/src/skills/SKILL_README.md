# Converge Autonomous Orchestrator - Claude Code Skill

This is a Claude Code skill that enables fully autonomous AI execution of converge projects.

## What It Does

When you run `converge run project.ts`, Claude Code (AI) becomes the orchestrator and:

1. **📋 Discovers Tasks:** Scans `.converge/tasks/` for task files
2. **⚡ Executes Tasks:** Runs each task with real-time output
3. **✅ Validates:** Uses AutoConverge to validate task outputs
4. **🔍 Detects Gaps:** Finds missing work, failed tasks, incomplete features
5. **🔧 Fills Gaps:** Creates new task files to address gaps
6. **🔄 Self-Corrects:** Analyzes failures and tries different approaches
7. **📝 Modifies Code:** Edits `project.ts` and task files directly
8. **↻ Repeats:** Continues until all tasks converge to success

## Installation

```bash
# Install converge
npm install @openplaybooks/converge-core

# Or use via npx
npx converge run project.ts
```

## Usage

### Basic

```bash
converge run project.ts
```

### With Options

```bash
# Limit iterations
converge run project.ts --max=50

# Watch mode (auto-restart on changes)
converge run project.ts --watch

# Show help
converge run --help
```

## How It Works

### 1. Project File (`project.ts`)

You define high-level objectives and initial tasks:

```typescript
import { project, epic, taskDef } from "@openplaybooks/converge-core";

const myProject = project()
  .name("My API")
  .epic(
    epic()
      .id("setup")
      .task(
        taskDef()
          .id("init-ts")
          .title("Initialize TypeScript")
          .autoConverge({ from: "outputs", refinable: true })
          .run(async (ctx) => {
            // Implementation
          })
          .build(),
      )
      .build(),
  )
  .build();

export default myProject;
```

### 2. AI Orchestration Loop

```
┌─────────────────────────────────────┐
│  converge run project.ts            │
└───────────┬─────────────────────────┘
            │
            ▼
    ┌───────────────┐
    │ Iteration 1   │
    └───────┬───────┘
            │
    ┌───────▼────────────────────────┐
    │ 1. Discover Tasks              │
    │    Scan .converge/tasks/*.ts       │
    └───────┬────────────────────────┘
            │
    ┌───────▼────────────────────────┐
    │ 2. Execute Tasks               │
    │    Run task.run() functions    │
    │    Show: ⚡ Executing: X        │
    │          ✅ Success / ❌ Failed  │
    └───────┬────────────────────────┘
            │
    ┌───────▼────────────────────────┐
    │ 3. Validate with AutoConverge   │
    │    Synthesize validation code  │
    │    Execute in sandbox          │
    │    Show: 🔍 Validation issues  │
    └───────┬────────────────────────┘
            │
    ┌───────▼────────────────────────┐
    │ 4. Detect Gaps                 │
    │    Check failures              │
    │    Show: ⚠️  Detected N gaps    │
    └───────┬────────────────────────┘
            │
    ┌───────▼────────────────────────┐
    │ 5. Fill Gaps                   │
    │    AI creates new task files   │
    │    Show: + 005-fix-error.ts    │
    └───────┬────────────────────────┘
            │
    ┌───────▼────────────────────────┐
    │ 6. Self-Correct                │
    │    Analyze patterns            │
    │    Replan if needed            │
    │    Show: 💡 Pattern detected   │
    └───────┬────────────────────────┘
            │
    ┌───────▼────────────────────────┐
    │ 7. Check Convergence           │
    │    All tasks complete?         │
    └───────┬────────────────────────┘
            │
            ├──Yes──▶ ✅ PROJECT COMPLETE
            │
            └──No───▶ Iteration 2 (repeat)
```

### 3. Real-Time Output

```
╔════════════════════════════════════════════════════════════╗
║         🤖 Autonomous AI Orchestrator Starting...         ║
╚════════════════════════════════════════════════════════════╝

🤖 Starting Autonomous Orchestrator
📁 Project: /path/to/project.ts
📂 Workspace: /path/to

============================================================
🔄 ITERATION 1
============================================================

📋 Step 1: Discovering tasks...
   ✓ Found 3 tasks
     [1] ⏸️  Initialize TypeScript
     [2] ⏸️  Implement Authentication
     [3] ⏸️  Build CRUD API

⚡ Step 2: Executing tasks...

   🔧 Executing: Initialize TypeScript
      Attempt 1
      📝 Loading: .converge/tasks/001-init-ts.ts
      ✅ Success (523ms)

   🔧 Executing: Implement Authentication
      Attempt 1
      📝 Loading: .converge/tasks/002-implement-auth.ts
      🔍 Running AutoConverge validation...
      ❌ Failed: JWT secret not configured
         [error] Environment variable JWT_SECRET not found
         [error] Middleware doesn't validate token expiry

🔍 Step 3: Detecting gaps...
   ⚠️  Detected 1 gaps:
      - [semantic] JWT configuration missing

   🔧 AI is filling gaps...
   ✅ Created 1 tasks to fill gaps:
      + 002b-configure-jwt-secrets.ts

🔄 Step 4: Self-correcting...
   ⚠️  Task implement-auth has 1 recent failures
   🤖 AI analyzing patterns...
      💡 Pattern detected: "JWT secret" occurred 1 times
      🔧 AI will try a different approach...

📊 Status:
   Tasks: 1✅ / 1❌ / 3📋
   Gaps: 1 detected
   Replans: 1

============================================================
🔄 ITERATION 2
============================================================
...
```

## AI Capabilities

### 1. Auto-Discovery

AI scans filesystem to find tasks:

```typescript
// AI discovers these automatically:
.converge/tasks/
├── 001-init-ts.ts
├── 002-implement-auth.ts
└── 003-build-api.ts
```

### 2. Self-Modification

AI modifies code directly:

```typescript
// AI can edit project.ts to add new tasks:
.task(
  taskDef()
    .id('configure-jwt')  // AI added this
    .title('Configure JWT Secrets')
    .run(async (ctx) => {
      // AI generated this code
      await ctx.shell.exec('echo "JWT_SECRET=..." > .env');
      return { success: true };
    })
    .build()
)
```

### 3. Self-Correction

AI learns from failures:

```typescript
// Attempt 1: Failed (missing dependency)
// Attempt 2: AI tries different approach
// Attempt 3: AI splits into smaller tasks
// Result: Success
```

### 4. Gap-Driven Execution

AI detects and fills gaps:

```
Gap Detected: Missing tests
   ↓
AI Creates: 004-add-tests.ts
   ↓
Scanner Discovers: New task
   ↓
AI Executes: Tests are written
```

## Configuration

### Project File Options

```typescript
project()
  .name("My Project")
  .dir(__dirname)
  .variables({
    // Custom variables
    apiPort: 3000,
    dbUrl: "postgresql://...",
  })
  .build();
```

### Task Options

```typescript
taskDef()
  .id("my-task")
  .title("My Task")
  .description("What this task does")
  .deps(["other-task"]) // Dependencies
  .inputs(["src/input.ts"]) // Required inputs
  .outputs(["src/output.ts"]) // Expected outputs
  .checks(["typescript", "tests"]) // Validation checks
  .autoConverge({
    // Auto-validation
    from: "task-prompt",
    refinable: true,
    maxRefinements: 3,
  })
  .yields({
    // Dynamic task spawning
    plan: "Create one test per endpoint",
    maxTasks: 10,
  })
  .run(async (ctx) => {
    // Implementation
  })
  .build();
```

### Orchestrator Options

```bash
converge run project.ts --max=100  # Max iterations
```

## Output Files

```
.converge/
├── orchestrator.log          # Detailed execution log
├── tasks/                    # Task files (the plan)
│   ├── 001-init-ts.ts
│   └── 002-implement-auth.ts
└── history/                  # Execution history
    └── feedback.json         # Task attempts and patterns
```

## Advanced Features

### 1. Progressive Self-Correction

AI learns from repeated failures:

```
Attempt 1: Error A → Basic retry
Attempt 2: Error A → Analyze pattern
Attempt 3: Error A → Different approach
Attempt 4: Success → Pattern learned
```

### 2. Dynamic Replanning

AI modifies the plan when stuck:

```typescript
// Original plan:
001-setup.ts
002-build-api.ts
003-deploy.ts

// After detecting blocker:
001-setup.ts          (done)
002-fix-blocker.ts    (AI added)
003-build-api.ts      (reordered)
004-deploy.ts         (reordered)
```

### 3. AutoConverge Refinement

AI improves validation code:

```javascript
// Iteration 1: Basic check
if (!file.exists("output.ts")) {
  issues.push({ message: "Missing file" });
}

// Iteration 2: More specific
if (!file.exists("output.ts")) {
  issues.push({ message: "Missing output.ts", severity: "error" });
}
const content = await file.read("output.ts");
if (!content.includes("export")) {
  issues.push({ message: "File has no exports", severity: "warning" });
}
```

## Troubleshooting

### Task Keeps Failing

AI will automatically:

1. Analyze error patterns
2. Try different approaches
3. Split into smaller tasks
4. Replan if stuck after 3 attempts

### No Tasks Found

AI will:

1. Detect empty `.converge/tasks/`
2. Generate initial plan from project objectives
3. Create task files automatically

### Stuck in Loop

Use `--max` to limit iterations:

```bash
converge run project.ts --max=50
```

## Integration with Claude Code

This skill is designed to work with Claude Code (claude.ai/code):

1. Claude Code reads project.ts
2. Claude Code runs orchestrator
3. Claude Code modifies files as needed
4. Claude Code shows real-time progress
5. Claude Code handles errors autonomously

## License

MIT
