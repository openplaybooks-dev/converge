---
title: Remove dead command code paths, dead functions, and dead imports
description: |
  Remove: cleanup/plugins/skills/shims cases from main.ts, commands-cleanup.ts,
  runCommand/resumeCommand/statusCommand from commands.ts, core autonomous-run
  stub, dead imports.

inputs:
  - packages/cli/src/main.ts
  - packages/cli/src/commands.ts
  - packages/cli/src/skills
  - packages/core/src/converge/dod-runner.ts

outputs:
  - packages/cli/src/main.ts
  - packages/cli/src/commands.ts

checks:
  - id: dead-cases-gone
    cmd: test -f packages/cli/src/main.ts && ! grep -qE 'case \"cleanup\"|case \"plugins\"|case \"skills\"|case \"shims\"' packages/cli/src/main.ts
    description: Dead command cases removed.
  - id: dead-functions-gone
    cmd: test -f packages/cli/src/commands.ts && ! grep -qE 'export async function (runCommand|resumeCommand|statusCommand)' packages/cli/src/commands.ts
    description: Dead functions in commands.ts removed.
  - id: commands-cleanup-gone
    cmd: test -f packages/cli/src/commands.ts && ! test -f packages/cli/src/skills
    description: Commander-based cleanup file deleted.
  - id: core-stub-gone
    cmd: test -f packages/core/src/index.ts && ! test -f packages/core/src/cli/autonomous-run.ts
    description: Core autonomous-run stub deleted.
  - id: typecheck-green
    cmd: test -f packages/cli/src/main.ts && pnpm -r typecheck
    description: Repo typechecks.
  - id: tests-green
    cmd: test -f packages/cli/src/main.ts && pnpm -r test
    description: All tests pass.

skills: []
references:
  - "packages/cli/src/main.ts"
  - "packages/cli/src/commands.ts"

vars: {}
dependencies:
  - 04a-remove-redirects
---

# 04b — Remove dead code

## What to remove

| Item | File | Why |
|---|---|---|
| `case "cleanup"` | main.ts ~1281 | Use `clean --orphaned` |
| `case "plugins"` | main.ts ~1196 | Use `deps list` |
| `case "skills"` subcommand router | main.ts ~1455 | Use `deps list/install` |
| `case "shims"` | main.ts ~1580 | shims/ dir doesn't exist |
| `commands-cleanup.ts` | 47 lines | Never imported (uses commander) |
| `runCommand` | commands.ts ~365-463 | Dead — main.ts uses runAutonomousCommand |
| `resumeCommand` | commands.ts ~472-547 | Dead |
| `statusCommand` | commands.ts ~556-638 | Dead — main.ts uses treeCommand |
| `import { autonomousRun... }` | commands.ts line 23 | Dead import |
| `core/src/cli/autonomous-run.ts` | 30 lines | Do-nothing stub |
| `dod-runner.ts` | 259 lines | Zero references — dead code |

## Red phase

Verify each item exists before deletion.

## Green phase

Delete each item. Keep typecheck green at each step. Strip any newly
orphaned imports.

## Done when

All 6 checks pass.
