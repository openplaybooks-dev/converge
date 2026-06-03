# Software Development Playbook — Worked Example

## When to use this scenario

**Trigger phrases:**
- "build an app" / "generate application code"
- "implement features from a spec"
- "create screens and components"
- "generate API endpoints and routes"
- "scaffold a project and implement features"

**What it covers:** Large-scale dev: 5 static phases, 4 simultaneous spawner types (screens, components, providers, api-clients), nested spawners with static grandchildren.

---

Real software projects have **hundreds to thousands of tasks** across multiple nesting levels. This scenario shows the full anatomy — not a toy example.

## The thinking sequence applied

1. **What does it contain?** (BOM — bill of materials)
   - Source specification
   - Architecture (schema + API design + routing)
   - Feature implementation (per-screen, per-component, per-provider work)
   - Integration (screen wiring with state + routes + handlers)
   - Verification (build, test, lint)

2. **Composition?**
   - Static phases gate dynamic per-entity work
   - 03-implement spawns per-screen, per-component, per-provider, per-api-client simultaneously
   - 04-wire spawns per-screen, each wire-task has static grandchild tasks

3. **Static vs. dynamic?**
   - **Static:** top-level phases + phase-level children (always run, known at plan time)
   - **Dynamic:** per-entity work spawned from templates at runtime (screens from SPEC.md, providers from schema)

4. **Modes?**
   - Static phases: task
   - Per-entity spawners: spawner
   - wire-screen: spawner → static grandchildren

---

## playbook.yml — top-level structure

**No `tasks:` entry.** The loader discovers tasks from `tasks/` at compile time. Static tasks are found automatically; templates are never run directly — only when spawned by a parent spawner.

```yaml
name: software-dev
description: >-
  Build a complete application.
  Phases: spec → scaffold → implement → wire → verify.
  Per-entity work is dynamic (spawned from templates/).

run:
  maxTaskAttempts: 3
  maxIterations: 250

goals:
  - id: build-passes
    cmd: pnpm build
  - id: tests-pass
    cmd: pnpm test
  - id: analysis-clean
    cmd: pnpm analyze
```

---

## tasks/ — full anatomy (5 phases, deep nesting, multiple spawner types)

```
tasks/
├── 01-spec/
│   └── TASK.md                        ← task (writes SPEC.md)
│
├── 02-scaffold/
│   ├── TASK.md                       ← task (base project setup)
│   └── tasks/
│       ├── 001-schema/
│       │   ├── TASK.md               ← spawner: per entity table
│       │   └── tasks/templates/
│       │       └── entity/TASK.md    ← DYNAMIC template
│       │
│       ├── 002-api-surface/
│       │   ├── TASK.md               ← spawner: per endpoint
│       │   └── tasks/templates/
│       │       └── endpoint/TASK.md  ← DYNAMIC template
│       │
│       └── 003-routing/
│           ├── TASK.md               ← spawner: per route
│           └── tasks/templates/
│               └── route/TASK.md     ← DYNAMIC template
│
├── 03-implement/
│   ├── TASK.md                       ← task (phase coordinator, no spawn -- scans, spawns children)
│   └── tasks/
│       ├── 001-screens/
│       │   ├── TASK.md               ← spawner: per screen
│       │   └── tasks/templates/
│       │       └── screen/TASK.md
│       │
│       ├── 002-components/
│       │   ├── TASK.md               ← spawner: per component group
│       │   └── tasks/templates/
│       │       └── component-group/TASK.md
│       │
│       ├── 003-providers/
│       │   ├── TASK.md               ← spawner: per state provider
│       │   └── tasks/templates/
│       │       └── provider/TASK.md
│       │
│       └── 004-api-clients/
│           ├── TASK.md               ← spawner: per API client
│           └── tasks/templates/
│               └── api-client/TASK.md
│
├── 04-wire/
│   ├── TASK.md                       ← spawner: per screen to wire
│   └── tasks/
│       └── templates/
│           └── wire-screen/
│               └── TASK.md           ← DYNAMIC (spawned per screen)
│               └── tasks/
│                   ├── 001-state/    ← STATIC grandchild
│                   │   └── TASK.md
│                   ├── 002-routes/   ← STATIC grandchild
│                   │   └── TASK.md
│                   └── 003-handlers/ ← STATIC grandchild
│                       └── TASK.md
│
└── 05-verify/
    └── TASK.md                       ← task (build + test + lint)
```

---

## Phase breakdown

### 01-spec (static task)

Single task. All spec work done in one shot — no need to split further.

```yaml
tasks/01-spec/TASK.md:
  ---
  id: 01-spec
  title: Source specification
  inputs: []
  outputs:
    - SPEC.md
  checks:
    - id: spec-exists
      cmd: test -s SPEC.md
  ---
```

### 02-scaffold (STATIC parent, THREE SPAWNER children)

Top-level `02-scaffold` is a task — it creates the base project (package.json, tsconfig, etc.). Under it are **three static children**, each a **spawner** that fans out per entity from SPEC.md.

```
tasks/02-scaffold/
├── TASK.md                           ← task: creates base project
└── tasks/
    ├── 001-schema/                   ← static child: DB schema
    │   ├── TASK.md                   ← SP<spawner
    │   └── tasks/templates/
    │       └── entity/TASK.md        ← DYNAMIC template: runs per entity
    │
    ├── 002-api-surface/             ← static child: API design
    │   ├── TASK.md                   ← spawner: per endpoint
    │   └── tasks/templates/
    │       └── endpoint/TASK.md      ← DYNAMIC template
    │
    └── 003-routing/                 ← static child: route setup
        ├── TASK.md                   ← spawner: per route
        └── tasks/templates/
            └── route/TASK.md        ← DYNAMIC template
```

### 02-scaffold/001-schema → entity template:

```yaml
tasks/02-scaffold/001-schema/tasks/templates/entity/TASK.md:
  ---
  id: entity-{{entityId}}
  title: "DB table: {{entityName}}"
  inputs:
    - ../../../../02-scaffold/project/scaffold/db/
  outputs:
    - db/schema/{{entityName}}.sql
  checks:
    - id: table-exists
      cmd: test -s db/schema/{{entityName}}.sql
  ---
```

### 03-implement (STATIC parent, FOUR SPAWNER children)

Top-level `03-implement` is a task that acts as phase coordinator. Under it are **four static children**, each a **spawner** for a different artifact type.

```
tasks/03-implement/
├── TASK.md                           ← task: phase coordinator
└── tasks/
    ├── 001-screens/                 ← SPANNER: per screen
    ├── 002-components/              ← SPAWNER: per component group
    ├── 003-providers/               ← SPAWNER: per state provider
    └── 004-api-clients/            ← SPAWNER: per API client
```

This is where the scale lives: 50 screens × 4 sub-tasks = 200 tasks at this level alone, spawned from 4 template types.

### 04-wire (SPAWNER + STATIC GRANDCHILDREN)

This is the pattern where a spawned task itself has static children.

```
tasks/04-wire/
├── TASK.md                           ← spawner: spawns wire-screen per screen
└── tasks/
    └── templates/
        └── wire-screen/
            └── TASK.md               ← DYNAMIC: created per screen at runtime
            └── tasks/               ← STATIC grandchildren of wire-screen
                ├── 001-state/
                │   └── TASK.md
                ├── 002-routes/
                │   └── TASK.md
                └── 003-handlers/
                    └── TASK.md
```

The wire-screen template is spawned per screen at runtime. When it spawns, it already has its static grandchild structure — `tasks/wire-screen/tasks/001-state/TASK.md` is part of the template.

### 05-verify (static task)

```yaml
tasks/05-verify/TASK.md:
  ---
  id: 05-verify
  title: Verification
  inputs:
    - app/
    - db/
  checks:
    - id: build-passes
      cmd: pnpm build
    - id: tests-pass
      cmd: pnpm test
    - id: analysis-clean
      cmd: pnpm analyze
  ---
```

---

## Key insight: static vs. dynamic at every level

| Level |_static or dynamic? | How |
|---|---|---|
| Top-level phase (01-spec, 02-scaffold...) | **Static** | Exists at plan time. Runner discovers from `tasks/` at compile time. |
| Phase child (001-schema, 001-screens...) | **Static** | Known at plan time. Exists in `tasks/<phase>/tasks/`. |
| Phase child's child (entity, screen, provider...) | **Static** | But the actual instances are **Dynamic** — spawned from a template at runtime |
| Template instance (entity-User, screen-Home...) | **Dynamic** | Spawned by a spawner. Lives only at runtime. |
| Template instance's children (001-state...) | **Static** | Part of the template definition. Created when template is spawned. |

**Static** = known at plan time. Exists in `tasks/` directory. Discovered by runner at compile time.

**Dynamic** = instantiated at runtime from a template. Only exists after a spawner runs.

**Multiple spawners at same level** — `02-scaffold` has 3 spawner children (schema, api-surface, routing). `03-implement` has 4 spawner children (screens, components, providers, api-clients). All fan out independently at runtime.

**Nested spawners** — a spawned task (like `wire-screen`) can itself have static children. The template contains the full sub-tree. When the spawner instantiates the template, all those static grandchildren come with it.

**No `tasks:` in playbook.yml.** The pattern works because:
- Static tasks are auto-discovered from the `tasks/` tree at compile time
- Templates live in `tasks/<parent>/tasks/templates/` and are never run directly
- Spawners explicitly call `converge spawn` to create template instances at runtime
