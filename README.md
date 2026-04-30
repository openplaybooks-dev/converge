<div align="center">

![Converge](./banner.svg)

# Autonomous AI agent playbooks.

**Agent harnessing and orchestration for complex, repeatable, verifiable workflows.**

[![npm version](https://img.shields.io/npm/v/@converge/core?color=cb3837&logo=npm&label=npm)](https://www.npmjs.com/package/@converge/core)
[![GitHub stars](https://img.shields.io/github/stars/myanlabs/converge?logo=github&color=181717)](https://github.com/myanlabs/converge/stargazers)
[![License: MIT](https://img.shields.io/github/license/myanlabs/converge?color=blue)](./LICENSE)
[![Node](https://img.shields.io/node/v/@converge/core?color=339933&logo=node.js&logoColor=white)](https://nodejs.org/)

[Quick Start](#quick-start) · [What you can build](#what-you-can-build) · [Examples](./examples) · [Documentation](./docs) · [Contributing](./CONTRIBUTING.md)

</div>

> **Status:** `v0.1.0` · public preview. Pre-1.0, no users yet. The runtime is real and 22+ runnable example playbooks span software, research, security, and creative work — see [examples](./examples). CLI ergonomics are in active development; API surface stabilizes toward v1.0.

---

## What a run looks like

```
$ converge init my-research && cd my-research
$ converge plan "Literature review on transformer in-context learning limits"
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

You write the goal. The runtime plans the tasks, executes them in dependency order, verifies every step with shell-command checks, and self-corrects when anything fails. No graph wiring, no hand-tuned prompts, no babysitting.

## What is Converge?

A Converge **playbook** is an AI project: a tree of tasks on disk, each one declaring what it produces and the shell commands that check whether it's done. You write the playbook (or clone one from [examples](./examples)). The runtime composes the tasks into a graph, runs each in dependency order, verifies the outputs, and self-corrects when checks fail — for hours or days, across thousands of tasks, resumable from any kill.

The result: long-running AI work becomes a version-controlled project, not a prompt you babysit.

A playbook on disk:

```
.converge/playbooks/{name}/
├── playbook.yml              # entry: name, defaults, root task
└── tasks/
    └── root/
        ├── TASK.md           # frontmatter (outputs, checks) + agent instructions
        ├── wbs.js            # optional: spawn children at runtime
        └── design/
            ├── TASK.md
            └── implementation/
                ├── TASK.md
                ├── server/TASK.md
                └── tests/TASK.md
```

How a run executes:

```mermaid
flowchart LR
    R["RED<br/>detect gaps<br/><i>walks tree, runs all checks</i>"] --> Y["YELLOW<br/>plan tasks<br/><i>agent writes new TASK.md</i>"]
    Y --> G["GREEN<br/>execute tree<br/><i>dispatches to inner loop</i>"]
    G -- "gaps remain" --> R
    G -. "0 gaps" .-> DONE(["✓ CONVERGED"])
    G -. "stalled 3 waves" .-> FAIL(["✗ FAIL"])
```

Each wave detects gaps, plans tasks to close them, and executes — looping until the playbook converges or three consecutive waves make no progress. Inside each task, typed failures route through named repair strategies before falling back to the agent. See [Concepts](./docs/concepts/) for the full runtime model.

## Highlights

- **Autonomous** — runs for hours or days without supervision; resumes from any kill
- **Verifiable** — every check is a shell command, never an LLM judge
- **Repeatable** — same playbook, same shape of result; outputs and journal are version-controlled
- **Self-correcting** — typed failures auto-repair through named strategies before retrying the agent
- **Adaptive** — the task graph grows at runtime as scope emerges
- **Multi-provider** — Claude, Gemini, Kimi, Qwen behind one `agentfn` abstraction

## Who is this for?

**Engineers building agent workflows.** You want a project structure and a runtime that treats agent work like software. You care about dependencies, version control, deterministic checks, and a journal you can `cat`. You're tired of one-shot prompts and frameworks that ask you to wire a graph by hand.

**AI facilitators and operators.** You run other people's playbooks, tune prompts, debug long runs, and recommend tooling to your team. You care about cost predictability, observability, multi-provider portability, and the ability to kill a run and resume from disk. The journal at `.converge/journal/` is your dashboard.

**Domain experts — researchers, marketers, content teams.** You don't write code, but you have a process: a literature review, a campaign launch, a quarterly compliance audit. Converge lets you encode that process once as a playbook (or start from a template), then run it whenever you need the same shape of result. The agent does the work; the playbook is the recipe.

## What you can build

Every example below is a real, runnable playbook in [`examples/`](./examples/) — clone it, edit the `idea.md` or scope file, and run.

### Software & apps

- **[`fullstack-app`](./examples/fullstack-app/)** — WBS-driven playbook that dynamically spawns backend + frontend tasks. Generates a runnable codebase with passing tests.
- **[`flutter-app`](./examples/flutter-app/)** — autonomous mobile app generation in Flutter / Dart.
- **[`baby-app`](./examples/baby-app/)** — minimal full-stack template; clone-and-edit starting point.

### Research & writing

- **[`deep-research`](./examples/deep-research/)** — layered iterative-deepening research. Layer 1 surveys breadth, Layer 2 narrows to promising areas, Layer 3 investigates deeply. Quality gates control progression.
- **[`scientific-research`](./examples/scientific-research/)** — autonomous research pipeline with Bayesian reasoning, GRADE evidence ratings, meta-analysis, and academic paper generation. 8-phase epoch loop; converges when quality scores plateau.
- **[`frontier-research`](./examples/frontier-research/)** — multi-source synthesis for fast-moving technical domains.

### Creative production

- **[`cinematic-video-production`](./examples/cinematic-video-production/)** — end-to-end AI film director. Input an `idea.md`, get a `clips/` folder with consistent cinematic shots and a `clips.json` manifest ready for an NLE. 15 min – 1 h narrative video; defeats AI-video drift with locked element libraries + compositing bridge + bookend frames.
- **[`game-assets-video`](./examples/game-assets-video/)** — complete platformer asset pack — characters, props, scenes, tilesheets, parallax backgrounds — driven by a single `idea.md`. Per-character animations rendered as video, then split into game-engine frames.
- **[`game-aiwolf`](./examples/game-aiwolf/)** — multi-agent simulation playbook.

### Security

- **[`autonomous-pentest`](./examples/autonomous-pentest/)** — one-off, sequential, exhaustive pentest sweep. Spawns ~250 tasks per run; findings reach the final report only when a reproducible PoC is captured (Shannon's proof-by-exploit gate). Refuses to run without a `scope.yml` declaring authorization. **Authorized use only.**

### Operations & data

- **[`data-pipeline`](./examples/data-pipeline/)** — sequential pipeline with task dependencies: fetch → transform → validate.
- **[`evolutionary-optimization`](./examples/evolutionary-optimization/)** — search over a fitness landscape; useful for prompt tuning, hyperparameter sweeps, copy testing.

[Browse all 22 examples →](./examples/)

## Quick Start

```bash
npm install -g @converge/core
converge init my-project
converge plan "What you want done — one sentence"
converge run
```

Generates a task tree from your description and runs it to convergence. The five-minute walkthrough: **[Your first playbook](./docs/getting-started/your-first-playbook.md)**.

For a deeper start:
- **[Install](./docs/getting-started/install.md)** — install the CLI and configure providers
- **[Concepts](./docs/concepts/)** — deterministic checks, dynamic WBS, the journal, repair strategies
- **[Why Converge](./docs/getting-started/why-converge.md)** — design philosophy and lineage

## Community

- **[GitHub Discussions](https://github.com/myanlabs/converge/discussions)** — questions, ideas, playbook patterns
- **[GitHub Issues](https://github.com/myanlabs/converge/issues)** — bug reports and feature requests
- **[Contributing Guide](./CONTRIBUTING.md)** — development setup, project structure, how to ship a PR

## License

MIT — see [LICENSE](./LICENSE)

<div align="center">

**Autonomous · Repeatable · Verifiable**

</div>
