# `.converge/` — how Converge maintains itself

This directory is the engine room. Six playbooks live here; together they handle continuous integration on every PR and run an end-to-end RFC pipeline that drafts and ships features. The framework you see in `packages/` was extended, in non-trivial part, by these playbooks running themselves against the codebase.

```
.converge/
├── README.md           ← you are here
├── project.yaml        ← backend + provider declaration
├── playbooks/          ← 6 production playbooks (4 CI + 2 RFC)
└── artifacts/          ← runtime traces — gitignored, not source
```

---

## How it works

The agent never ships code directly. It drafts proposals; humans accept them; the agent then implements what was accepted.

```
              ┌────────── HUMAN GATE #1 ──────────┐
              │   edit  status: draft → accepted  │
              ▼                                   │
   ┌──────────────────┐                ┌──────────────────┐
   │   rfc-ideation   │ ────RFC────▶   │   rfc-shipping   │
   │                  │  docs/rfcs/    │                  │
   │ surveys: issues, │  status:draft  │ branches:        │
   │   ideas, backlog,│                │   rfc/NNNN-slug  │
   │   code findings  │                │ applies impl.    │
   │ drafts 1 RFC     │                │ runs tests       │
   │   per epoch      │                │ opens PR         │
   └──────────────────┘                └──────────────────┘
                                                  │
                                                  ▼
                                       ┌────── HUMAN GATE #2 ─────┐
                                       │   review & merge the PR  │
                                       └──────────────────────────┘
```

### The two-gate trade

Traditional development asks humans to do two kinds of work: deciding what to build, and reviewing line-by-line how it was built. The how-was-it-built review is where teams drown — reading code the reviewer didn't write and barely understands.

The two-gate split moves review effort earlier:

| Gate | What the human reads | What the human decides |
|---|---|---|
| **Specification** (RFC accept) | A 200-line RFC: problem, current behaviour with `file:line` evidence, proposal, code-level design, implementation steps, test plan | Is this worth building, and is the proposed approach right? |
| **Merge** (PR review) | A diff against an explicit RFC contract | Does this PR satisfy the contract? |

The agent owns the mechanical middle: branching, applying, testing, opening the PR. The cost is honest — more upfront spec work, and a bad RFC produces a bad PR faster than a human would. That's the trade: review effort moves earlier and into a higher-leverage surface.

### Why this repo is the proof

The [22 numbered RFCs](../docs/rfcs/) are the artifacts. Every checked-in [`TASK.md`](./playbooks/) under `playbooks/` is an `outputs:` + `checks:` contract a real run had to satisfy. Per-epoch traces under `artifacts/<playbook>/epochs/NNN/` record:

- which sources were surveyed (`pick/source-cursor.jsonl`)
- what was drafted (`draft/draft.md`)
- which citations were verified against HEAD (`cite-check/cite-report.json`)
- what tests ran and how their outcomes were classified (`test/test-result.json`)
- what classified as recoverable failure vs blocked

The framework was extended by playbooks running the framework. The commit history is the demonstration.

---

## The six playbooks

### Per-PR CI

Wired to GitHub Actions; run on every pull request or via manual dispatch.

| Playbook | Workflow | Trigger | What it does |
|---|---|---|---|
| [`ci-commit-lint/`](./playbooks/ci-commit-lint/) | [`commit-lint.yml`](../.github/workflows/commit-lint.yml) | PR opened/synchronize | Verifies every commit in a PR against the project convention |
| [`ci-docs-drift/`](./playbooks/ci-docs-drift/) | [`docs-drift.yml`](../.github/workflows/docs-drift.yml) | Manual dispatch | Detects drift between changed source and docs that reference it |
| [`ci-pr-review/`](./playbooks/ci-pr-review/) | [`pr-review.yml`](../.github/workflows/pr-review.yml) | Manual dispatch | Produces a structured markdown PR-review verdict |
| [`ci-release-notes/`](./playbooks/ci-release-notes/) | [`release-notes.yml`](../.github/workflows/release-notes.yml) | Manual dispatch on tag | Drafts release notes from commits since the previous tag |

### Autonomous SDLC

The two playbooks that fuse into the RFC pipeline.

| Playbook | Workflow | Trigger | What it does |
|---|---|---|---|
| [`rfc-ideation/`](./playbooks/rfc-ideation/) | [`rfc-ideation.yml`](../.github/workflows/rfc-ideation.yml) | Manual dispatch *(hourly cron wired but commented out)* | Drafts one RFC per run under `docs/rfcs/NNNN-*.md` with `status: draft` |
| [`rfc-shipping/`](./playbooks/rfc-shipping/) | [`rfc-shipping.yml`](../.github/workflows/rfc-shipping.yml) | Manual dispatch *(hourly cron wired but commented out)* | Ships one accepted RFC per run as a PR; flips RFC `status: implementing`; never auto-merges |

**To enable hourly runs**: uncomment the `schedule:` block in each YAML. Crons are staggered (`:17` ideation, `:47` shipping) so they never collide. Both loops idle cheaply when there's no work — ideation when no candidates surface; shipping when the accepted queue is empty (`check-accepted-available.mjs` precheck job).

---

## RFC status lifecycle

The `status:` field in each RFC's frontmatter is the contract between ideation, the human, shipping, and the merge. The full lifecycle:

```
draft ──(human accepts)──▶ accepted ──(shipping starts)──▶ implementing ──(PR merged)──▶ shipped
  │                            │                                  │
  │                            └─(citations drifted)─▶ stale      └─(tests fail)─▶ implementing-needs-human
  │
  └──(human rejects)──▶ rejected (file kept for history)
```

For the full frontmatter schema, type-driven policy, and back-pressure rules, see [`docs/rfcs/README.md`](../docs/rfcs/README.md).

---

## Run a playbook locally

The same playbooks run by GitHub Actions also run on your machine. From the repo root:

```sh
# Source provider credentials (gitignored .env)
set -a; . .env; set +a

# Run any playbook — name matches the directory under playbooks/
converge run --playbook=rfc-ideation --max-duration=10m
converge run --playbook=ci-pr-review --max-duration=10m
```

[`project.yaml`](./project.yaml) declares the provider — a `claude` CLI subprocess routed through a MiniMax-compatible endpoint, so any contributor with a MiniMax key (or another Anthropic-compat endpoint) can run the playbooks at low cost. Override per-run with `ANTHROPIC_BASE_URL` / `ANTHROPIC_MODEL`.

Each playbook directory has its own `PLAN.md` describing the loop architecture, durable state, and guardrails. Read that before authoring a new task.

---

## See also

- [`../README.md`](../README.md) — what Converge is, the broader Dogfood pitch
- [`../docs/concepts/convergence.md`](../docs/concepts/convergence.md) — the diverge → execute → converge primitive these playbooks compose
- [`../docs/rfcs/README.md`](../docs/rfcs/README.md) — RFC frontmatter schema, status lifecycle, type-driven policy
- [`../docs/ideas/README.md`](../docs/ideas/README.md) — convention for dropping idea files that ideation picks up
- [`./project.yaml`](./project.yaml) — backend and provider declaration
