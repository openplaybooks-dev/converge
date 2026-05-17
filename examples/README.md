# Examples

Each subdirectory is a self-contained, runnable Converge playbook. Pick one, `cd` in, follow its `README.md`. Most run the same way:

```bash
cd examples/<name>
export ANTHROPIC_API_KEY=sk-…    # or MINIMAX_API_KEY — see .env.example at the repo root
scripts/run.sh
```

Three examples ship with a committed sample run you can browse without executing anything: [`deep-research`](./deep-research/) (per-question outputs under `questions/`), [`data-pipeline`](./data-pipeline/) (`episodes/<date>/`), and [`social-sim`](./social-sim/) (`vault/runs/<runId>/`).

## Index

### Starter — read these first

| Example                                | Description                                                |
| -------------------------------------- | ---------------------------------------------------------- |
| [`hello-world`](./hello-world/)        | The smallest possible playbook: one task, two checks.      |
| [`data-pipeline`](./data-pipeline/)    | Sequential pipeline: RSS → cluster → persona-voiced script. Demonstrates static task chains with `depends_on`. |

### Software — code-generation playbooks

| Example                                | Description                                                |
| -------------------------------------- | ---------------------------------------------------------- |
| [`fullstack-app`](./fullstack-app/)    | Seed-driven dynamic backend + frontend generation (diverge → execute → converge). |
| [`flutter-app`](./flutter-app/)        | Autonomous Flutter / Dart mobile app generation from `idea.md`. |
| [`app-builder`](./app-builder/)        | React app generation: requirements → visual direction → assets → screens → wiring. |

### Research — multi-layer information synthesis

| Example                                          | Description                                                                                  |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| [`deep-research`](./deep-research/)              | Layered iterative-deepening, one folder per question, sourced final report. (Has sample run.)|
| [`scientific-research`](./scientific-research/)  | Bayesian + GRADE evidence + meta-analysis, 8-phase epoch loop with paper generation.         |
| [`frontier-research`](./frontier-research/)      | Beam-search exploration of unknown solution spaces with parallel beams + convergence tracking.|

### Simulation — agent-based + emergent dynamics

| Example                                | Description                                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| [`social-sim`](./social-sim/)          | Persona-driven social network simulation. Every persona's per-tick decision is a first-class spawned task. Posts, feeds, actions are Obsidian-navigable markdown. (Has sample run.) |
| [`game-ai-pk`](./game-ai-pk/)          | _Coming soon_ — persistent-cast reality-show single-episode game.                                             |

### Optimization

| Example                                                  | Description                                                                              |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [`evolutionary-optimization`](./evolutionary-optimization/) | Fitness-landscape search via generate → evaluate → select → crossover for prompts, hyperparameters, training recipes. |

### Provider integration

| Example                                | Description                                                                              |
| -------------------------------------- | ---------------------------------------------------------------------------------------- |
| [`acp-demo`](./acp-demo/)              | The `acp` provider — Converge's adapter for the Claude Agent SDK. Programmatic invocation. |

## Patterns illustrated

Pick an example based on the converge pattern you want to learn:

- **Static task chain (`depends_on`)** — [`hello-world`](./hello-world/), [`data-pipeline`](./data-pipeline/). Tasks listed in `playbook.yml`, edges declared inline. Simplest mental model.
- **Bootstrap with explicit chain (`seed:cli` emits `spawn task` lines)** — [`deep-research`](./deep-research/). One root task fires once at wave 1 and emits the entire pipeline with `--depends-on` edges.
- **Recursive `seed:cli` + dynamic fanout via `spawn template`** — [`social-sim`](./social-sim/), [`fullstack-app`](./fullstack-app/). Each spawning task is itself seed:cli; children carry their own `seed:`/`passthrough:` frontmatter via template materialization. Use this when downstream layers need to spawn more tasks from runtime data (e.g. one task per persona, one task per feature).
- **Diverge → execute → converge** — [`fullstack-app`](./fullstack-app/), [`frontier-research`](./frontier-research/), [`evolutionary-optimization`](./evolutionary-optimization/). A planning phase fans out parallel children; an aggregation phase converges them.
- **Iterative deepening / multi-epoch** — [`scientific-research`](./scientific-research/), [`evolutionary-optimization`](./evolutionary-optimization/). Each loop refines a shared artifact (the question, the population).
- **Wave-driven do-while** — [`tests/test-waves/`](../tests/test-waves/) (in tests, not examples). A single `passthrough: true` task uses the framework's wave counter + `converge:` verdict prompt to iterate. Reference fixture for the pattern.

## Variable threading — the one rule that bites everyone

Vars do NOT auto-inherit from parent to child in converge. The seed-cli parser carries `--var` flags into the spawned child exactly; if a child template references `{{var}}` and the parent didn't pass it, you'll either see literal `{{var}}` text in checks (for `spawn task --task-file`) or a hard throw at spawn time (for `spawn template --path`). Every example above threads vars explicitly. If you copy patterns from one example into another, double-check that every `{{var}}` the destination references is in the spawning command's `--var` list.

## Provider configuration

Most examples ship with a `.converge/project.yml` that routes the `claude` CLI through MiniMax's Anthropic-compatible endpoint by default. Override `ANTHROPIC_BASE_URL` / `ANTHROPIC_MODEL` to switch to Anthropic direct, DeepSeek, or any Anthropic-compatible provider. See [Switching providers](../docs/guides/switch-providers.md).
