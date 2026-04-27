<div align="center">

![Converge](./banner.svg)

### Define done. Converge gets there.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![npm](https://img.shields.io/badge/npm-%40converge%2Fcore-cb3837.svg)](https://www.npmjs.com/package/@converge/core)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/node-%E2%89%A520-339933.svg)](https://nodejs.org/)

</div>

Converge is an open-source, TypeScript-native framework for orchestrating complex AI agent workflows. Instead of defining steps, graphs, or roles, you declare what "done" looks like — what files must exist, what checks must pass — and Converge continuously measures gaps, generates work to close them, and self-corrects when things fail.

Crash-safe by design — atomic checkpoints, resumable runs, deterministic checks.

```bash
npm install -g @converge/core
```

## Why Converge?

**Goal-driven, not step-driven** — Describe the finished project. Let the agent figure out the path. SQL declares the data you want, not the API calls to fetch it; converge declares the artifacts and checks that define done, not the steps to get there.

**Deterministic checks, not AI judgement** — Verification runs as shell commands (`test`, `grep`, `npm test`). The agent has latitude in how it solves the problem; it has zero latitude on whether the predicate passes.

**Strategy-based self-correction** — When a check fails, the framework dispatches the failure to a pipeline of named repair strategies — fix the missing input, schedule the upstream producer, relax a buggy check, learn from the failure for the next attempt. Each kind of failure gets a targeted fix instead of blind retries.

**Dynamic task spawning** — WBS scripts decompose work at runtime based on project state. Scope emerges from the problem, not from a predetermined graph.

**Crash-safe checkpoints** — Kill the process, restart, and Converge picks up exactly where it left off. Long-running workflows survive interruptions.

**Multi-provider** — Claude, Gemini, Kimi, and Qwen via the `agentfn` abstraction. No vendor lock-in.

## How It Works

```mermaid
flowchart LR
    A[Scan task tree] --> B[Pick next gap]
    B --> C[Execute via AI agent]
    C --> D{Checks pass?}
    D -- Yes --> E[Mark complete]
    D -- No --> F[Write LEARN.md]
    F --> C
    E --> A
```

Converge runs a continuous loop: scan the task tree for incomplete work, pick the next gap, execute it with an AI agent following markdown instructions, and verify with shell-based checks. When a check fails, the agent writes a LEARN.md capturing what went wrong. The next attempt reads that analysis and applies targeted corrections. The loop repeats until every task passes or the budget is exhausted.

## Quick Start

```bash
npm install -g @converge/core
converge init --name="my-api"
converge plan "REST API with health check endpoint and test suite"
converge run  # Auto-detects default playbook or the only playbook
```

Converge generates a task tree from your description. Each task includes target files, shell-based checks, and instructions for the AI agent. Here's what a generated task looks like:

```markdown
---
title: Health Check Endpoint
outputs:
  - src/routes/health.ts
  - src/routes/health.test.ts
checks:
  - id: server-starts
    cmd: npx tsx src/index.ts &; sleep 2; curl -sf http://localhost:3000/health; kill %1
    description: Health endpoint returns 200
  - id: tests-pass
    cmd: npx vitest run src/routes/health.test.ts
    description: Health check tests pass
---

Implement a GET /health endpoint that returns `{ "status": "ok" }`.
Write unit tests covering the success case and response shape.
```

`converge run` discovers gaps (missing files, failing checks), executes tasks, self-corrects on failure, and repeats until done.

## Use Cases

**Software Development** — Full application builds where requirements flow through design, implementation, tests, and docs. Checks run linters, type checkers, and test suites at every step. Failed tests produce structured analysis; the next attempt applies targeted fixes.

**Deep Research** — Multi-source literature reviews, competitive analyses, and synthesis reports. Tasks gather sources, extract findings, cross-reference, and synthesize — each step verified before the next begins.

**Scientific Research** — Literature reviews, hypothesis formulation, experiments, and academic paper drafting. Checks enforce GRADE evidence ratings, statistical rigor, and contradiction resolution. Bayesian priors update across epochs; the loop stops when quality scores converge.

**Content Production** — Blog posts, documentation, marketing copy with editorial checks. Checks enforce word counts, required sections, link validity, and brand voice consistency. Playbooks encode your editorial process for repeatable execution.

**Business Automation** — Client deliverables, compliance audits, onboarding workflows. Define what the final package looks like; Converge assembles it from templates, data sources, and verification steps.

The domain doesn't matter. If you can describe what done looks like, Converge can get there.

## Development

Build Converge from source and run the `converge` CLI against your local checkout.

### Prerequisites

- **Node.js** >= 20
- **pnpm** 10.29.3+ (specified via `packageManager` in `package.json`)

### Clone, install, build

```bash
git clone https://github.com/myanlabs/converge.git
cd converge
pnpm install
pnpm build
```

### Use the CLI locally

From the repo root, run the CLI directly against source (no global install):

```bash
pnpm converge --help
pnpm converge init --name="my-api"
pnpm converge plan "REST API with health check endpoint and test suite"
pnpm converge run
```

To expose the built CLI as a `converge` command on your `$PATH`, link the `@converge/core` package globally:

```bash
pnpm build
pnpm --filter @converge/core link --global

converge --help
```

Run `pnpm --filter @converge/core unlink --global` to remove the link.

### Common tasks

```bash
pnpm test           # run all tests
pnpm typecheck      # type-check the monorepo
pnpm build          # rebuild after source changes
pnpm clean          # remove build artifacts
```

## Documentation

- **[Getting Started](./docs/getting-started.md)** — Install, configure, and run your first workflow
- **[Architecture & Reference](./packages/core/README.md)** — Core internals, task format, and full API
- **[Why Converge?](./docs/why-converge.md)** — Problem statement and design philosophy
- **[Architecture Decisions](./docs/adr/)** — ADRs for key design choices
- **[Contributing](./CONTRIBUTING.md)** — Development setup and guidelines

## Acknowledgements

Converge draws from ideas that predate AI agents: SQL's declarative data retrieval, Terraform's desired-state infrastructure, and control theory's feedback loops. The gap-driven convergence model applies these proven patterns to AI orchestration — measure the distance to done, generate work to close it, verify, correct, repeat.

## License

MIT — see [LICENSE](./LICENSE)

<div align="center">

Goal-driven. Deterministic. Self-correcting.

</div>
