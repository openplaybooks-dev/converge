<div align="center">

![Converge — Autonomous AI Agent Playbooks](./assets/brand/banner-v2.svg)

# Autonomous AI agent playbooks

**Agent harnessing and orchestration for complex, repeatable, verifiable workflows.**

[![npm version](https://img.shields.io/npm/v/@converge/core?color=cb3837&logo=npm&label=npm)](https://www.npmjs.com/package/@converge/core)
[![GitHub stars](https://img.shields.io/github/stars/myanlabs/converge?logo=github&color=181717)](https://github.com/myanlabs/converge/stargazers)
[![License: MIT](https://img.shields.io/github/license/myanlabs/converge?color=blue)](./LICENSE)
[![Node](https://img.shields.io/node/v/@converge/core?color=339933&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7%2B-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Examples](https://img.shields.io/badge/examples-26%2B-blue)](./examples)
[![Providers](https://img.shields.io/badge/providers-Claude%20%7C%20Gemini%20%7C%20Kimi%20%7C%20Qwen-orange)](./docs/getting-started/install.md)

[Quick Start](#quick-start) · [Examples](./examples) · [Docs](./docs) · [Contributing](./CONTRIBUTING.md)

</div>

> **`v0.1.0` · public preview** — Runtime ships. **26+ runnable example playbooks** across software, research, security, and creative production.

---

## How it works in 30 seconds

```
$ converge init my-project
$ converge init --from-prompt "Literature review on transformer in-context learning limits"
$ converge run

[plan]   generated 8 tasks across 3 phases
[wave 1] RED  detected 8 gaps
         YELLOW planned tasks
         GREEN  executing...

  ✓ 01-define-scope        converged in 2 attempts
  ✓ 02-source-search       converged in 1 attempt
  ⟳ 03-extract-findings    check failed → repair-strategy:missing-input → ✓
  ✓ 04-cross-reference     converged in 1 attempt
  ✓ 05-synthesize          converged in 3 attempts
  ✓ 06-evidence-grade      converged in 1 attempt
  ✓ 07-draft-report        converged in 2 attempts
  ✓ 08-convergence-check   converged in 1 attempt

[wave 2] RED  detected 0 gaps  →  ✓ CONVERGED

8/8 tasks. 1 auto-repair. report.md written to ./out/
```

1. **You write the goal** — one sentence or a playbook tree of TASK.md files
2. **It plans the tasks** — dependency graph, shell-level checks, no hand-tuned prompts
3. **It runs to done** — executes in order, verifies every step, self-corrects on failure

**No graph wiring. No LLM-as-judge. No babysitting.** Every check is a shell command — `tsc`, `eslint`, `grep`, a test suite. "Done" is deterministic, not a vibe.

---

## Why Converge

✅ **Agents say "done." Checks prove it.**

Most AI agent frameworks treat the LLM's word as truth. Converge doesn't. Every task declares shell-command checks — `tsc`, `grep`, `eslint`, a test suite. The runtime loops until checks pass or the run fails deterministically. No LLM judging its own output. No vibes.

💾 **Long runs crash. Hours of work vanish.**

Converge checkpoints every step to disk. Kill the process at task 47 of 200 — it resumes from 47, not zero. Tasks form a graph, not a chain: a stuck check on task 23 never touches task 47. The largest playbook in this repo runs 670 tasks end-to-end — unattended.

📋 **Prompts aren't repeatable. Playbooks are.**

A chat transcript dies with the session. A playbook is a directory of TASK.md files — version-controlled, reviewable, shareable. Same playbook, same outputs, every run. Anyone on the team can re-run it.

🧩 **Context windows run out. Task trees don't.**

A chat window fits maybe three features before context exhausts, leaving work half-implemented. A playbook breaks work into independent TASK.md files — each one small enough to fit in a single context window. The runtime chains them into a dependency graph and executes in order. 670 tasks, one playbook, zero lost context.

🔓 **Providers lock you in. Converge doesn't.**

Swap AI providers by changing one config — Claude, Gemini, Kimi, Qwen. Same playbook, same checks, different backend. Develop offline with stub mode — test the pipeline at zero API cost before running for real.

---

## What you can build

Every example below is a real, runnable playbook in [`examples/`](./examples/).

### Software
| Example | Description |
|---|---|
| [`fullstack-app`](./examples/fullstack-app/) | Seed-driven dynamic backend + frontend generation with passing tests |
| [`flutter-app`](./examples/flutter-app/) | Autonomous mobile app generation in Flutter / Dart |
| [`baby-app`](./examples/baby-app/) | Minimal full-stack template; clone, edit, run |

### Research
| Example | Description |
|---|---|
| [`deep-research`](./examples/deep-research/) | Layered iterative-deepening with quality-gated progression |
| [`scientific-research`](./examples/scientific-research/) | Bayesian reasoning, GRADE evidence, meta-analysis, paper generation — 8-phase epoch loop |
| [`frontier-research`](./examples/frontier-research/) | Multi-source synthesis for fast-moving technical domains |

### Creative
| Example | Description |
|---|---|
| [`cinematic-video-production`](./examples/cinematic-video-production/) | End-to-end AI film director. `idea.md` → `clips/` with locked elements + compositing |
| [`game-assets-video`](./examples/game-assets-video/) | Platformer asset pack — characters, props, tilesheets, parallax — from a single `idea.md` |
| [`game-aiwolf`](./examples/game-aiwolf/) | Multi-agent simulation playbook |

### Security
| Example | Description |
|---|---|
| [`autonomous-pentest`](./examples/autonomous-pentest/) | ~250-task pentest sweep. Findings gated by reproducible PoC. Requires `scope.yml`. **Authorized use only.** |

### Ops & data
| Example | Description |
|---|---|
| [`data-pipeline`](./examples/data-pipeline/) | Sequential pipeline: fetch → transform → validate |
| [`evolutionary-optimization`](./examples/evolutionary-optimization/) | Fitness-landscape search for prompt tuning, hyperparameter sweeps, copy testing |

[Browse all 26 examples →](./examples/)

---

## Playbook structure

A playbook is a tree of tasks on disk. Each TASK.md declares what it produces and the shell commands that check whether it's done. No centralized wiring.

```
.converge/playbooks/{name}/
├── playbook.yml              # entry: name, run config, task paths
└── tasks/
    ├── 01-analyze/
    │   ├── TASK.md
    │   └── tasks/
    │       ├── 01a-extract/TASK.md    # frontmatter (depends_on, outputs, checks)
    │       └── 01b-fingerprint/TASK.md
    ├── 02-catalog/TASK.md
    └── 03-build/
        ├── TASK.md
        ├── seed.js           # optional: spawn children at runtime
        └── tasks/
            ├── 03a-backend/TASK.md
            └── 03b-frontend/TASK.md
```

Execution loop:

```
  RED ──→ YELLOW ──→ GREEN
  detect   plan       execute
  gaps     tasks      tree
    ↑                   │
    └────── gaps ───────┘        → ✓ CONVERGED (0 gaps)
             3 stalled waves      → ✗ FAIL
```

Each wave detects gaps, plans tasks to close them, and executes — looping until convergence or three consecutive waves make no progress.

---

## Quick Start

### 1. Install

```bash
npm install -g @converge/core
```

### 2. Bootstrap a project

```bash
converge init my-project
converge init --from-prompt "Literature review on in-context learning"
```

### 3. Run

```bash
converge run
```

That's it. The five-minute walkthrough: **[Your first playbook](./docs/getting-started/your-first-playbook.md)**.

---

## Packages

| Package | Path | Purpose |
|---|---|---|
| [`@converge/core`](./packages/core/) | `packages/core/` | Pure-TypeScript engine: runner registry, task graph, state machine, repair strategies. No UI dependencies. |
| [`@converge/cli`](./packages/cli/) | `packages/cli/` | Terminal CLI. Bootstrap, run, watch, tail. Drives runs via provider backends. |
| [`@converge/studio`](./packages/studio/) | `packages/studio/` | Web UI for visualizing runs, inspecting tasks, browsing journals. |
| Provider packs | `packages/{claude,gemini,kimi,qwen}fn/` | Provider-specific backends. Swap without changing playbooks. |

---

## Dogfood

Significant parts of this repo were built by Converge running playbooks against itself — CLI redesign (63 tasks), landing page (65 tasks), docs generation, and more. [See the receipts →](./.converge/playbooks/). If the runtime didn't work, this README would be hand-typed.

---

## Community

- **[Discussions](https://github.com/myanlabs/converge/discussions)** — questions, ideas, playbook patterns
- **[Issues](https://github.com/myanlabs/converge/issues)** — bug reports, feature requests
- **[Contributing](./CONTRIBUTING.md)** — dev setup, project structure, how to ship a PR

---

## License

MIT — see [LICENSE](./LICENSE)

<div align="center">

**Autonomous · Repeatable · Verifiable**

</div>
