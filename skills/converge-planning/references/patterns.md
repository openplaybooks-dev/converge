# Patterns Reference

Goal-tree shapes. Use to sanity-check a decomposition — if the tree looks nothing like any of these, the decomposition might be process decomposition.

---

## The eleven patterns

| Pattern | What it looks like | When it fits |
|---|---|---|
| **Nested static** | `tasks/02-build/tasks/01-schema/TASK.md` | N deterministic children, known at plan time, N ≤ 7 |
| **Fan-out via spawn** | `templates/iteration/TASK.md` + parent calls `ctx.loop.spawn()` | N children from data or large N; runtime instantiation |
| **Fan-out via catalog** | `01-catalog → 02-build` (spawner reads catalog, spawns one per row) | N similar deliverables, large or data-driven |
| **Ordered Stages** | `01-prepare → 02-design → 03-build → 04-deploy` | One artifact evolves through distinct phases |
| **Linear Pipeline** | `A → B → C → D` (each produces a different artifact) | Data transforms once through bounded stages |
| **Domain Split** | `00-shared → 01-chars → 02-props → 03-scenes → 04-export` | N parallel pipelines, one per entity type |
| **Epoch Loop** | `root → templates/epoch/ → repeat until halt` | Iterative refinement — quality converges over rounds |
| **Goal-Driven Epoch Loop** | `converger root with goals in playbook.yml; halt when all pass` | Measurable end-state; large replayable work |
| **RED → GREEN** | write test first → implement until test passes | Well-defined acceptance criteria; test-driven dev |
| **PLAN → WORK** | write spec.md first → implement from spec | Ambiguous scope; analyze before building |
| **WORK → AUDIT** | do the work → run quality/safety audit | Compliance required; post-work verification |

---

## Nested static — simplest fan-out

When the child list is known at plan time and N ≤ 7, just nest static TASK.md files:

```
tasks/
└── 02-build/
    ├── TASK.md              ← parent (no mode needed)
    └── tasks/               ← static children, discovered at compile time
        ├── 01-schema/
        │   └── TASK.md      ← leaf
        ├── 02-api/
        │   └── TASK.md      ← leaf
        └── 03-ui/
            └── TASK.md      ← leaf
```

No spawning, no templates, no catalog. The runtime discovers children under `tasks/` at compile time and runs them before the parent converges.

**Rule:** Use nested static when N ≤ 7 and the child list is deterministic. Use **Fan-out via catalog** when N > 7 or the list comes from data at runtime.

---

## Ordered Stages

```
01-prepare         (screens.json, requirements)
02-design-system   (shared tokens)
03-build-screens    mode: spawner, spawns one per screen
05-add-behavior    mode: spawner, spawns one per provider
06-wire-screens    mode: spawner, spawns one per handler
07-polish
```

Each phase gates the next. Per-entity work inside a phase is dynamic via spawner.

---

## Linear Pipeline

```
01-recon → 02-intel → 03-sweep → 04-explore → 05-evidence → 06-report
```

Each stage produces a qualitatively different artifact. No fan-out unless a stage explicitly needs it.

Not a license to verb-decompose. If your "stages" all operate on the same population, collapse into one task with a spawner inside.

---

## Fan-out via catalog

```
01-catalog       → writes screens.json (or tokens.json, etc.)
02-build-screens → mode: spawner, reads catalog, spawns one per entry
```

Use when N > 7 or the child list comes from data at runtime. The spawner body reads the catalog and calls `ctx.loop.spawn()` per row.

---

## Fan-out via spawn — dynamic instantiation at runtime

A `mode: spawner` body calls `ctx.loop.spawn()` per child. Each child is instantiated from a template with `{{paramName}}` interpolation. The parent never writes child TASK.md files directly — templates own those.

**Anatomy:**

```
templates/iteration/           ← spawn template (hand-authored once)
├── TASK.md                  # {{waveId}}, {{wave}} substituted at spawn
├── PARAMS.yml               # param contract
└── EXAMPLES.yml             # when to pick this template

tasks/01-improve-loop/
└── TASK.md                  # mode: spawner body calls ctx.loop.spawn() per wave
```

**Spawner task:**

```yaml
---
id: 01-improve-loop
title: Improvement loop — 10 waves
mode: converger
converge:
  max_waves: 11
  halt_when:
    - id: all-waves-done
      cmd: "bash -c '[[ -f improve-test/.all-waves-done ]]'"
---

# Body: each wave spawns one iteration template instance
for WAVE in $(seq 1 10); do
  WAVE_ID="wave-$(printf '%03d' $WAVE)"
  WAVE_NUM="$WAVE"
  converge spawn "$WAVE_ID" iteration --var wave="$WAVE_NUM" --var waveId="$WAVE_ID"
done
```

**Iteration template:**

```yaml
# templates/iteration/TASK.md
---
id: iter-{{waveId}}
title: "Iteration {{waveId}} — propose → implement"
mode: spawner
spawn:
  min_children: 2
  max_children: 2
  apply: auto
vars:
  - waveId
  - wave
outputs:
  - "improve-test/{{waveId}}/implemented.txt"
checks:
  - id: done
    cmd: 'test -f improve-test/{{waveId}}/implemented.txt'
---

# Fan out to two sequential children
converge spawn propose-$WAVE_ID propose --var waveId="$WAVE_ID" --var wave="$WAVE"
converge spawn implement-$WAVE_ID implement --var waveId="$WAVE_ID" --var wave="$WAVE" --after propose-$WAVE_ID
```

**Template param contract:**

```yaml
# templates/iteration/PARAMS.yml
params:
  waveId:
    type: string
    required: true
  wave:
    type: string
    required: true
```

**Spawner decision tree:**

```
Child list known at plan time, N ≤ 7?
  → nested static (tasks/<parent>/tasks/)

Child list data-driven or large?
  → mode: spawner + ctx.loop.spawn() per child
  → templates live under templates/<name>/TASK.md
  → optional: PARAMS.yml + EXAMPLES.yml
```

---

## Domain Split

```
00-shared-spec    → writes spec.json (shared across all domains)
01-characters     → spawner per character, each owns its pipeline
02-props          → spawner per prop, each owns its pipeline
03-scenes         → spawner per scene, each owns its pipeline (consumes chars + props)
04-export         → assemble all
```

Use when entities are heavy enough to warrant their own delegation tree.

---

## Epoch Loop

```
root
  └── templates/epoch/
        ├── 001-hypothesize
        ├── 002-experiment
        ├── 003-evaluate
        └── 004-decide
```

The template is static. Each epoch instance is spawned at runtime. Stop condition is a convergence check.

---

## Goal-Driven Epoch Loop

```yaml
# playbook.yml
goals:
  - id: code-quality
    checks:
      - cmd: pnpm tsc --noEmit
      - cmd: pnpm vitest run

# root task
mode: converger
converge:
  halt_when: [all goal checks pass]
```

Each wave: converger evaluates goals, picks unsatisfied ones, spawns implement+verify children for each, converges, re-evaluates. Halts when all goals pass.

---

## RED → GREEN — test first

Write the failing test before writing any implementation code. Run it to confirm it fails. Then implement until the test passes. Repeat.

**Signal to choose:** The user says "test-driven", "write the test first", "red-green", or acceptance criteria are well-defined and machine-verifiable (e.g., `pnpm test`, `npm run build`).

```
01-write-test     → test file exists, test fails
02-implement     → implement until test passes
03-refine        → (optional) clean up, test still passes
```

Each child is a `leaf`. The parent convergence checks that all tests pass.

---

## PLAN → WORK — spec first

Write the spec (markdown, JSON schema, design doc) before writing any implementation. The spec is the contract between planner and executor.

**Signal to choose:** The user says "analyze first", "write the spec", "design before building", "scope is unclear", or the problem is complex enough that diving in without a plan would cause rework.

```
01-analyze       → produce SPEC.md (or PRD.md, design.md)
02-implement     → implement from spec
03-verify        → verify implementation matches spec
```

The spec task is a `leaf` that outputs a file. The implement task declares that file as an `input:`. The verify task checks the spec against the implementation.

---

## WORK → AUDIT — do then verify

Do the work first. Then run a separate audit task that checks quality, safety, compliance, or correctness — independent of the implementer.

**Signal to choose:** The user says "audit", "compliance", "safety check", "independent verification", "quality gate", or there's a regulatory/contractual requirement that a human didn't build this.

```
01-implement     → produce the deliverable
02-audit         → run independent checks (lint, security scan, compliance)
```

The audit is a `leaf` that reads the implementation's outputs. If audit fails, the workflow stops — fix and re-audit.

---

## Shape mixing

Real projects combine shapes:

- **Ordered Stages + Fan-out**: top-level stages, but one stage fans out per entity inside it
- **Linear Pipeline → Epoch Loop**: deterministic ingestion phase feeds a research loop
- **Creative Progression → Domain Split**: early singletons produce specs; late stages fan out per entity

The outermost shape describes how the root goal decomposes. Don't force all sub-trees into the same shape.