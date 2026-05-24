---
status: proposed
author: Luc Van Minh
created: 2026-05-23
---

# RFC: `stub:` Block — Declarative Stub Tasks for Playbook Validation

## Context

Users building Converge playbooks face a hard feedback loop: to validate a playbook works, they must run it end-to-end with real AI calls. A single misconfigured `depends_on` edge or a missing `vars` threading breaks the entire run — and the only signal is a failed task after minutes of execution and API costs.

The test suite already has stubs (`stubPrompt`, `stubHash`) for unit-testing individual components, but these are test-only utilities unavailable at runtime. Meanwhile, the framework has a `CONVERGE_ALLOW_SKILL_SIMULATION` flag that writes placeholder outputs for skill tasks — but it is a safety guard for a specific internal path, not a designed stub API for playbook authors.

The goal of this RFC is to give playbook authors a first-class, declarative way to attach a **stub implementation** to any task, so that running the playbook with `--stub` produces realistic fake outputs without calling any AI provider.

---

## Problem Statement

1. **Playbook iteration is slow and expensive** — a misconfigured var or wrong `depends_on` edge isn't caught until a real run completes (or fails after minutes).
2. **No abstraction for "what does this task actually do?"** — a TASK.md captures inputs/outputs/checks but not the behavior a stub implementation should mimic.
3. **Skill simulation is a hidden footgun** — `CONVERGE_ALLOW_SKILL_SIMULATION` is a blunt env flag that silently produces empty outputs, not useful fake data.
4. **Tests and runtime live in separate worlds** — test stubs (`stubPrompt`, `stubHash`) can't be reused by playbook authors to validate their own playbooks locally.

---

## Proposed Solution

Introduce a **`stub:` block in TASK.md** that declares a shell-command stub implementation alongside the real task behavior. When the playbook runs in stub mode (`converge run --stub`), the executor runs the stub command instead of the real executor (Claude fn / skill / function) and uses its output as the task's result.

### TASK.md `stub:` Block

Stub blocks are **embedded directly in TASK.md** source files, parsed at compile time. The stub block lives next to the task definition it mocks — no separate catalog.

```yaml
---
id: my-task
title: Generate a report
inputs:
  - data.csv
outputs:
  - report.md
checks:
  - id: exists
    cmd: test -f report.md
stub:
  cmd: echo "# Fake Report" > report.md
  cleanup: rm -f report.md
---
```

### Stub Command Execution

Stub commands run as **real shell scripts** that write to actual filesystem paths (the same output locations as real tasks). Checks pass when the stub command writes correct fake files. This means:
- Stub commands run in the **same attempt directory** as real tasks (`wip/` under `journal/<taskId>/attempts/N/`)
- Stub commands receive the **same env vars** (`CONVERGE_VAR_*`, `CONVERGE_TASK_DIR`, etc.)
- Stub commands must **exit 0** to be considered successful
- Stub outputs land in the **same locations** as real outputs (so checks pass)
- Spawned children are **NOT** stubbed unless `--stub-children` is passed (to test real inter-task coordination)

### CLI / Runtime Flag

```bash
converge run my-playbook --stub    # run with stub tasks enabled
```

When `--stub` is active:
1. Tasks **with** a `stub:` block → executor runs `stub.cmd` instead of real executor
2. Tasks **without** a `stub:` block → task is marked **blocked** with a descriptive message (not silently skipped)

---

## Design Details

### Executor Changes

In `packages/core/src/executor/`:

1. **`function-executor.ts`** — When building a task executor, check for `taskDef.stub` before falling into the real executor path. If stub mode is active and `stub.cmd` exists, spawn the stub shell command instead of invoking the real executor (Claude fn / skill / inline function). Use the same child-process infrastructure as task checks.

2. **`execute-task.ts`** — Propagate `stubMode` from `opts` into the `TaskExecutionContext`. Pass stub config to the executor builder.

3. **`run/index.ts`** — Add `--stub` flag to `RunOpts`. Activate stub mode before executor selection.

### Stub Block Discovery

Stub blocks are declared **in the TASK.md source file**, parsed at compile time. No separate catalog needed — the stub block lives next to the task definition it mocks.

**Parsing:** `packages/core/src/declarative/loader.ts` (or wherever TASK.md frontmatter is parsed) gains a new `stub?: { cmd: string; cleanup?: string }` field on the task definition type.

**Type shape:**
```typescript
interface StubConfig {
  cmd: string;           // shell command(s) to run in stub mode
  cleanup?: string;      // optional cleanup command after stub run
}
```

### Checkpoints and State

- Stub runs produce normal checkpoints (iteration, completed tasks, etc.)
- A flag in the checkpoint records whether each task ran as stub or real — useful for reporting
- `converge inspect --run <id>` shows a `[stub]` badge next to stub-run tasks

### Error Handling

- Stub command exits non-zero → task is marked **failed** (same as real failure)
- Missing `stub:` on a task when `--stub` is set → task is marked **blocked** with a descriptive message
- Real executor errors surface normally when not in stub mode

### Cleanup After Stub Run

Because stub tasks write real files to satisfy checks, each `stub:` block has an optional `cleanup:` command. A `--stub-cleanup <run-id>` flag runs cleanup commands for all stub tasks in a specific run, enabling a full reset before a real run.

---

## Progress

| Item | Status | Notes |
|---|---|---|
| RFC document | **done** | Written and proposed |
| Tests (TDD) | **defer** | — |
| Executor stub path | **defer** | — |
| `--stub` flag | **defer** | — |
| `--stub-cleanup` flag | **defer** | — |
| Reference example | **defer** | — |
| `pnpm build` | **defer** | TypeScript + DTS clean |
| Pre-existing failures | **skip** | — |

---

## Migration / Adoption

- Existing TASK.md files are unaffected (`stub:` is optional)
- No breaking changes to existing playbooks
- Stub mode is opt-in only; tasks without `stub:` blocks are blocked (not silently executed for real)
- Documentation: add a "Testing Your Playbook" section to the examples README covering `--stub` usage

---

## Future Extensions (out of scope for initial RFC)

- Stub catalog: a shared library of stub implementations for common task types
- Stub recording: run a task once for real, capture outputs as a stub replay
- Coverage report: which tasks in a playbook lack `stub:`
- `--stub-children` flag to also stub spawned children