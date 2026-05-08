---
title: "Why Converge"
description: "Agent harnessing and orchestration for complex, repeatable, verifiable AI workflows. Filesystem-native, multi-provider, TypeScript."
sidebar:
  order: 1
---
Converge is the harness and orchestration runtime for autonomous AI agent playbooks — long-running workflows that need to be complex, repeatable, and verifiable.

Most agent frameworks ask you to author the *path*: a graph of nodes, a sequence of steps, a set of roles. You spend days wiring the machine before it runs. Converge inverts that. You author tasks as plain files on disk; the runtime composes the graph, runs the work, verifies every step with shell commands, and repairs typed failures before falling back to the agent.

We built this after watching AI agents flail. They generate, they fail, they retry blind. The loop without a target is just noise. Converge gives every task a target — the artifacts that must exist, the checks that must pass — and drives the loop until it converges.

**The name isn't a brand. It's the pattern.** Every task follows diverge → converge: split into sub-tasks, let them execute independently, integrate their results. The same rhythm repeats at every level — leaf tasks, container tasks, the entire playbook. A playbook converges when every task at every level produces its declared outputs and passes its checks.

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
- **Crash-safe.** Every task attempt is checkpointed atomically. Kill the runner mid-task, `converge run` picks up exactly where it left off — no rework, no duplicate side effects.
- **TypeScript-native.** Programmatic API, full type coverage, ships with `taskDef()`, `project()`, `createRuntime()`.

This is not a graph runtime. It's not a chatbot framework. It's not a multi-agent collaboration toolkit. If you need step-by-step orchestration with prewired roles, look elsewhere. If you know what done looks like and want to get there, Converge is built for that.

## Design lineage

Converge draws from ideas that predate AI agents: SQL's declarative data retrieval, Terraform's desired-state infrastructure, and control theory's feedback loops. The convergence model applies those proven patterns to AI orchestration — measure the distance to done, generate work to close it, verify, correct, repeat. The vocabulary of the runtime — projects, tasks, dependencies, manifests — is borrowed from a generation of tools that turned ad-hoc scripts into version-controlled engineering. None of these analogies are perfect for agent work, but the shape of the problem is the same: a graph of work to be done, an explicit definition of *done* per node, and a runtime that resolves the graph deterministically.

Continue to [Install](./install).
