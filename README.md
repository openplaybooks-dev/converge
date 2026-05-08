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

## How it works

**You write playbooks as markdown files and folders. Converge compiles them into a DAG and dispatches AI agents to run it.**

```mermaid
graph LR
    A["one big<br/>problem"] --> D["diverge<br/>break into pieces"]
    D --> T1["piece 1"]
    D --> T2["piece 2"]
    D --> T3["piece N"]
    T1 --> C["converge<br/>assemble the whole"]
    T2 --> C
    T3 --> C
    C --> R["one complete<br/>solution"]

    style A fill:#E8A838,color:#222
    style R fill:#5DA05D,color:#fff
    style D fill:#4A90D9,color:#fff
    style C fill:#4A90D9,color:#fff
```

**The mental model: diverge → converge.** Break the problem into independent pieces, run them in parallel, assemble the result. Recursive — any piece can itself diverge.

1. **Write** — TASK.md files and folders. Plain markdown. Version control it.
2. **`converge compile`** — resolves the graph, fingerprints every node.
3. **`converge run`** — walks the DAG. Each node: an agent does the work, shell checks verify it. Retries on failure, caches on success.

**Share the playbook, re-run it anytime. Same inputs, same outputs.**

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

Execution loop — diverge, execute, converge:

```
  DIVERGE ──→ EXECUTE ──→ CONVERGE
  seed runs   children     body reads outputs,
  spawns      produce      integrates, validates
  children    outputs      → 0 gaps = done
```

The runtime walks the DAG in topological layers. Each node either executes (AI agent + shell checks) or is cached (fingerprint unchanged from previous run). Failed nodes retry up to the attempt cap; downstream nodes wait until dependencies complete. Like dbt's `run` — deterministic ordering, incremental caching, no loops.

---

## Quick Start

### 1. Install

```bash
npm install -g @converge/core
```

### 2. Bootstrap a project

```bash
converge init --name=my-project
converge init --from-prompt "Literature review on in-context learning"
```

### 3. Compile and run

```bash
converge compile
converge run
```

That's it. The five-minute walkthrough: **[Your first playbook](./docs/getting-started/your-first-playbook.md)**.

---

## Why Converge

**Checks, not vibes.** Every task declares shell-command checks — `tsc`, `grep`, `eslint`, a test suite. The runtime loops until they pass. No LLM judging its own output.

**Fingerprint caching, not checkpoint files.** Every node gets a SHA-256 fingerprint. Unchanged nodes skip execution — like dbt's incremental models. Kill at node 47; re-run picks up from what completed.

**Playbooks, not prompts.** A chat transcript dies with the session. A playbook is version-controlled TASK.md files. Same inputs, same outputs, every run. Anyone on the team can re-run it.

**DAG, not context window.** A chat window exhausts after a few features. A playbook DAG breaks work into independent TASK.md files — each fits in one window. The runtime chains them topologically. 670 tasks, zero lost context.

**Swap providers, not rewrite workflows.** Claude, Gemini, Kimi, Qwen — change one config, same playbook runs. Stub mode for zero-cost offline development.

**Dynamic scope, not static wiring.** A `seed.js` function spawns nodes at runtime based on input — one scene becomes one task, one stock ticker becomes one analysis branch. The DAG grows to fit the problem, not the template.

---

## Claude Code & Codex integration

Converge ships with two **skills** that plug into your coding agent so you can design and run playbooks without leaving the terminal:

| Skill | What it does |
|---|---|
| `converge-planning` | Design a new playbook from a prompt — generates PLAN.md, TASK.md files, dependency graph, and shell-level checks |
| `converge-control` | Compile, run, and monitor a playbook — classifies DAG events, diagnoses failures, re-runs incrementally |

### End-to-end flow

```bash
# 1. Bootstrap a project with skills installed
converge init --name=my-project --skills

# 2. In Claude Code, design the playbook
/converge-planning   # "Build a REST API for user management with auth"

# 3. Compile and run
converge compile
converge run

# 4. Hand off to converge-control — it monitors, diagnoses, and re-runs on failure
/converge-control    # compile → run → monitor → retry failures
```

### How it works

- `converge init --skills` installs both skills to `.claude/skills/` and `.codex/skills/`
- **Claude Code** and **Codex** auto-discover skills from these directories — no configuration needed
- Type `/skill-name` to invoke: the skill loads its full reference docs (CLI commands, event catalog, troubleshooting recipes) and operates with full context
- `converge-planning` handles the upfront design phase; `converge-control` takes over during execution — they're built to hand off to each other

### Install skills to an existing project

```bash
converge skills install                    # default: .claude/skills/
converge skills install --target .codex/skills
```

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
