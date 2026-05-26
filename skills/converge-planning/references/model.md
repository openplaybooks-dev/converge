# Model Reference

Full mental model for converge-planning. Read when you need the deep theory — goal decomposition, DAG semantics, convergence, delegation.

---

## The core idea

A playbook starts with a goal and decomposes into deliverable sub-goals. Each sub-goal produces a complete result. The parent converges them into the whole.

```
Goal: "Working payment dashboard"
  ├── Sub-goal A: Database schema + seed → migration.sql + seed.sql
  ├── Sub-goal B: Payment API → working server with passing tests
  ├── Sub-goal C: Dashboard UI → rendered page with live data
  └── Sub-goal D: Auth → login flow with role checks
```

This is recursive. Sub-goal B might split into `POST /charges`, `GET /transactions`, `Webhook handler` — each complete and testable.

---

## Three execution phases

**1. Decompose** — Identify sub-goals and write contracts for each child. The set must form a complete cover — nothing unassigned, no overlap.

**2. Execute** — Children produce deliverables independently. Each reads its `inputs:`, writes its `outputs:`. Parallelism is implicit when `depends_on` allows it.

**3. Converge** — Parent reads children's files via `inputs:`, integrates, validates cross-child consistency, produces its `outputs:`. Convergence is what makes a parent a real task — not just a folder.

---

## The delegation contract

A TASK.md is one node's contract:

| Part | Field | What it specifies |
|---|---|---|
| **Scope** | `title` + `description` + body | The bounded problem |
| **Context In** | `inputs:` | Files this task reads |
| **Context Out** | `outputs:` | Files this task produces |
| **Acceptance** | `checks:` | Deterministic predicates — exit 0 = pass |
| **Resources** | `skills:`, `vars:` | Tools and data |
| **Dependencies** | `depends_on:` | What must finish first |

The file paths are the handshake. Parent says "I expect `B/data.json`." Child says "I produce `B/data.json`." When paths match, the edge is wired.

---

## Decompose scope, not process

Task names are nouns: "database schema", "payment API". Verbs signal process decomposition: "design database", "build API" — wrong.

**The diagnostic — three questions:**
1. Are the names verbs or nouns? Verbs = process decomposition.
2. Does each child produce a complete result, or does the next stage finish it? If finish → wrong.
3. What does failure look like? Process: one stage fails, the whole pipeline retries. Scope: one entity fails, only that task retries.

**Why scope wins:**
- Failures are small — one entity's task re-runs in isolation
- Cost is visible — each scope-child's cost is its own journal line
- Contract is closed — outputs are deliverables, not intermediate goo
- Parallelism is implicit — per-entity children run in parallel

---

## Files are the currency

Tasks pass work through `outputs:` and `inputs:`, not through prompts pasted into bodies. Content that another task needs lives in a declared file.

| Inline in TASK.md | Goes in a file |
|---|---|
| Scope, instructions, acceptance criteria | Specs, designs, code |
| Short literal vars (≤10 lines) | Anything ≥10 lines or structured |

If you're tempted to paste content into a body that another task needs → make the producer write a file instead.

---

## Not middle work

Every task output must be a complete, usable deliverable. Middle work is partial results the next task finishes.

**The three questions:**
1. Can someone use this output directly? If no → middle work.
2. Does the next task consume it, or finish it? If finish → middle work.
3. Does the name describe a thing that exists, or a stage of making one? If stage → middle work.

**Middle work examples:**

| Wrong | Right |
|---|---|
| `design-database` → `implement-database` | `database-schema` produces runnable migration.sql + seed.sql |
| `spec-api` → `build-api` | `charges-endpoint` produces working endpoint with tests |
| `prepare-project` (installs deps, creates folders) | `project-skeleton` produces runnable app with health-check |

If you can't hand the output to a user and have them use it, it's not done.

---

## The DAG

A playbook is a DAG. `depends_on` edges are declared; the framework resolves topological order.

**Edges have semantics:**
- Parent → child: division (parent spawns, depends on child completing before converging)
- Sibling → sibling: sequential constraint (C needs B's output before C starts)
- Child → parent: implicit (child completes, parent converges via its `depends_on`)

**Declarative, not imperative.** Say what you produce and what you need. The framework figures out when things run.

---

## Three principles

**Nested over flat.** Top-level: 3–7 phases. Each phase: 3–7 children. Continue until every leaf is 15–45 min of self-contained work. Smells: one-child node, verb-named siblings, no convergence step in a container.

**Templates for replicable work.** When N children share the same shape, write the contract once as a template. Runtime spawns instances. Use when: driven by a list, N is large, each instance has the same input/output shape.

**Progressive decomposition.** Plan one layer at a time. Write contracts for your direct children only. Never reach into grandchildren. If something's missing, write it in PLAN.md under "Open questions" — don't fix under-specification by reaching outside your scope.