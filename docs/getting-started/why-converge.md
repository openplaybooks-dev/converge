---
title: "Why Converge"
description: "Define what 'done' looks like. Converge closes the gap. Filesystem-native, multi-provider, TypeScript."
sidebar:
  order: 1
---
Converge describes what done looks like and closes the gap.

Most agent frameworks ask you to define *how*: a graph of nodes, a sequence of steps, a set of roles. You spend days wiring the machine before it runs. Converge asks you to define done — the target state — and handles the rest. Like SQL, like Terraform, like every tool that survived the distance between "instructions" and "result."

We built this after watching AI agents flail. They generate, they fail, they retry blind. The loop without a target is just noise. Converge gives the loop a target: measure the gap, close the gap, verify, repeat.

A six-line TASK.md says it all:

```markdown
---
outputs:
  - src/api/health.ts
  - src/api/health.test.ts
checks:
  - cmd: npx tsx src/index.ts &
    sleep 2; curl -sf http://localhost:3000/health; kill %1
    description: Health endpoint returns 200
---
Implement a GET /health endpoint returning `{ "status": "ok" }`.
Write unit tests covering the success case.
```

What you get from that framing:

- **Gap-driven self-correction.** When a check fails, Converge writes a structured LEARN.md analyzing what went wrong. The next attempt reads that analysis and applies targeted corrections — not a blind retry.
- **Filesystem as plan.** Your `.converge/` directory is the execution plan. `ls` is your dashboard, `git diff` shows exactly what changed.
- **Multi-provider.** Claude, Gemini, Kimi, Qwen via the `agentfn` abstraction. No vendor lock-in.
- **Crash-safe.** Every task attempt is checkpointed atomically. Kill the runner mid-task, `converge run --resume` picks up exactly where it left off — no rework, no duplicate side effects.
- **TypeScript-native.** Programmatic API, full type coverage, ships with `taskDef()`, `project()`, `createRuntime()`.

This is not a graph runtime. It's not a chatbot framework. It's not a multi-agent collaboration toolkit. If you need step-by-step orchestration with prewired roles, look elsewhere. If you know what done looks like and want to get there, Converge is built for that.

Continue to [Install](./install).
