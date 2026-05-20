# `.converge/` — how Converge maintains itself

This directory is the engine room. Three playbooks live here: two drive an end-to-end RFC pipeline that drafts and ships features; one runs on every PR as a standalone auditor for the human reviewer. The framework you see in `packages/` was extended, in non-trivial part, by these playbooks running themselves against the codebase.

```
.converge/
├── README.md           ← you are here
├── project.yaml        ← backend + provider declaration
├── playbooks/          ← 3 production playbooks (2 RFC + 1 code auditor)
└── artifacts/          ← runtime traces — gitignored, not source
```

---

## How it works

One autonomous SDLC. The human is the supervisor — sets direction at the top, accepts the outcome at the bottom. The agent owns the mechanical middle, and `code-audit` is the agent's own self-review that lands on every PR before the human looks at it.

```
   sources       rfc-ideation       human         rfc-shipping     code-audit         human          shipped
      │                │              │                │                │                │              │
      │ issues         │              │                │                │                │              │
      │───────────────▶│              │                │                │                │              │
      │ ideas/         │              │                │                │                │              │
      │───────────────▶│  pick 1      │                │                │                │              │
      │ backlog        │  (weighted   │                │                │                │              │
      │───────────────▶│   round-     │                │                │                │              │
      │ code findings  │   robin)     │                │                │                │              │
      │───────────────▶│              │                │                │                │              │
      │                │  draft RFC   │                │                │                │              │
      │                │─────────────▶│                │                │                │              │
      │                │              │── accept ─────▶│                │                │              │
      │◀── reject ─────┼──────────────│                │                │                │              │
      │                │              │                │ branch         │                │              │
      │                │              │                │ impl · tests   │                │              │
      │                │              │                │ open PR        │                │              │
      │                │              │                │───────────────▶│                │              │
      │                │              │                │                │ audit-commits  │              │
      │                │              │                │                │ audit-docs     │              │
      │                │              │                │                │ audit-code     │              │
      │                │              │                │                │ synthesize     │              │
      │                │              │                │                │── one comment ▶│              │
      │                │              │                │                │                │── merge ────▶│
      │                │              │                │◀────────── reject (fix code) ───│              │
      ▼                ▼              ▼                ▼                ▼                ▼              ▼
```

Sources feed `rfc-ideation`, which picks one candidate per epoch via weighted round-robin and drafts an RFC. The human approves direction (RFC accept). `rfc-shipping` branches, implements, tests, opens a PR. `code-audit` triggers on the PR, runs three audits in parallel, and posts one combined comment. The human approves outcome (PR merge).

Two reject paths, each rewinds only as far as it needs to:

- **Direction reject** (first human lane) — the RFC was wrong. `status: rejected` in `docs/rfcs/`, signal re-enters `sources` via `backlog.jsonl` for the next ideation epoch.
- **Outcome reject** (second human lane) — the RFC is fine, the code isn't. Bounces back to `rfc-shipping` to fix the implementation on the same branch; no new RFC, no new ideation epoch.

### What the supervisor actually does

Like a CEO or CTO: they don't write code, they don't read every diff. They trust the process and they trust their team — `rfc-ideation` to draft a worthwhile RFC, `rfc-shipping` to implement it honestly, `code-audit` to flag anything off. The supervisor only weighs in at two gates: direction and outcome.

| Decision | Input the supervisor reads | What they decide |
|---|---|---|
| **Direction** (RFC accept) | A 200-line RFC: problem, current behaviour with `file:line` evidence, proposal, code-level design, implementation steps, test plan | Is this worth building, and is the proposed approach right? |
| **Outcome** (PR merge) | The PR diff + `code-audit`'s combined comment (commits, docs drift, code) | Does this PR ship the RFC the supervisor accepted? |

The agent owns everything in between: picking the candidate, drafting the RFC, branching, applying, testing, opening the PR, and reviewing its own work via `code-audit`. The cost is honest — more upfront spec work at the direction gate, and a bad RFC produces a bad PR faster than a human would. That's the trade: review effort moves earlier and into a higher-leverage surface.

---

## The three playbooks

| Playbook | Workflow | Trigger | What it does |
|---|---|---|---|
| [`code-audit/`](./playbooks/code-audit/) | [`code-audit.yml`](../.github/workflows/code-audit.yml) | Every PR (`pull_request`) | Runs three audits in parallel (commits, docs drift, code) and posts one combined comment |
| [`rfc-ideation/`](./playbooks/rfc-ideation/) | [`rfc-ideation.yml`](../.github/workflows/rfc-ideation.yml) | Manual dispatch *(hourly cron wired but commented out)* | Drafts one RFC per run under `docs/rfcs/NNNN-*.md` with `status: draft` |
| [`rfc-shipping/`](./playbooks/rfc-shipping/) | [`rfc-shipping.yml`](../.github/workflows/rfc-shipping.yml) | Manual dispatch *(hourly cron wired but commented out)* | Ships one accepted RFC per run as a PR; flips RFC `status: implementing`; never auto-merges |

**To enable hourly RFC runs**: uncomment the `schedule:` block in each RFC YAML. Crons are staggered (`:17` ideation, `:47` shipping) so they never collide. Both loops idle cheaply when there's no work — ideation when no candidates surface; shipping when the accepted queue is empty (`check-accepted-available.mjs` precheck job).

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
converge run --playbook=code-audit --max-duration=30m
```

[`project.yaml`](./project.yaml) declares the provider — a `claude` CLI subprocess routed through a MiniMax-compatible endpoint, so any contributor with a MiniMax key (or another Anthropic-compat endpoint) can run the playbooks at low cost. Override per-run with `ANTHROPIC_BASE_URL` / `ANTHROPIC_MODEL`.

`code-audit` expects pre-materialized inputs under `.converge/inputs/` (see [`playbooks/code-audit/README.md`](./playbooks/code-audit/README.md) for the local-run recipe). Each RFC playbook has its own `PLAN.md` describing the loop architecture, durable state, and guardrails.

---

## See also

- [`../README.md`](../README.md) — what Converge is, the broader Dogfood pitch
- [`../docs/concepts/convergence.md`](../docs/concepts/convergence.md) — the diverge → execute → converge primitive these playbooks compose
- [`../docs/rfcs/README.md`](../docs/rfcs/README.md) — RFC frontmatter schema, status lifecycle, type-driven policy
- [`../docs/ideas/README.md`](../docs/ideas/README.md) — convention for dropping idea files that ideation picks up
- [`./project.yaml`](./project.yaml) — backend and provider declaration
