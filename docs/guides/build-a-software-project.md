---
title: "Build a software project"
description: "Use Converge to drive a real codebase to a working state. Anchored on flutter-app, fullstack-app, stitch-to-flutter."
sidebar:
  order: 4
---
# Build a software project

Building runnable software with Converge. This guide is for developers (or those working with one) who want the framework to drive a real codebase to a working state: apps, websites, game asset pipelines.

## The shape

Software playbooks differ from research or fan-out playbooks in three key ways:

**Type-checks and builds are checks.** Commands like `tsc --noEmit`, `dart analyze`, or `pnpm build` return exit code 0 on success, making them natural Converge checks. If the build fails, the task fails. If it passes, you've verified real correctness: not just that files exist.

**The repo is the output.** Files live in `src/`, `lib/`, `app/`, not in `out/`. You're building something that gets committed, not something that gets consumed and discarded. This changes how you think about outputs: every task should produce working code, not just artifacts.

**Long-running with multiple phases.** A software playbook typically has many phases, each with sub-tasks. Dynamic expansion happens through root or parent tasks that declare `mode: spawner` — the body writes `$CONVERGE_TASK_DIR/spawn.plan.jsonl`, and the framework runs `converge apply` after the body. Plan for 50–250 tasks in a mature software playbook.

## Anatomy of a real software playbook

Read the canonical example at `examples/stitch-to-flutter-baby-watch-v2/.converge/playbooks/default/playbook.yml`:

```yaml
name: default
description: |
  Production-ready Flutter app generation from idea.md + .stitch/references/.

run:
  maxIterations: 250
  maxTaskAttempts: 3

tasks:
  - path: 01-prepare-requirements
  - path: 02-design-system
  - path: 03-build-screens
  - path: 05-add-behavior
  - path: 06-wire-screens
  - path: 07-build-overlays

checks:
  - id: dart-analyze
    cmd: dart analyze lib/
    description: Dart analysis passes for lib
  - id: has-theme
    cmd: test -f lib/theme/app_theme.dart
    description: Theme file exists
  - id: has-router
    cmd: test -f lib/router/app_router.dart
    description: Router file exists
```

Key fields:

- **`name`** / **`description`**: Human-readable identity. The description should tell you what the playbook produces.
- **`run.maxIterations`**: Upper bound on agent loops. For a Flutter app with 6 phases and ~100 screens, 250 gives headroom.
- **`run.maxTaskAttempts`**: How many times to retry a failing task before giving up.
- **`tasks`**: Ordered list of phase IDs. Each phase is a directory containing a `TASK.md`.
- **`depends_on`**: Phase ordering. `03-build-screens` depends on `02-design-system`: the framework won't run it until the design system is complete.
- **`checks`**: Global validation that runs after every iteration. These are the gates: `dart analyze` keeps type errors out, `test -f` verifies structure.

## Phases vs leaves

Naming conventions matter for navigation:

- **Phases**: `NN-slug` (e.g., `01-vendor`, `02-design-system`). Phase directories contain a `TASK.md` and a `tasks/` subdirectory.
- **Leaves**: `NNN-slug` (e.g., `001-pick-base`, `002-install-deps`). Leaf tasks have full frontmatter and live under `tasks/`.

```
06-wire-screens/
├── TASK.md              # Parent task: minimal frontmatter
└── tasks/
    ├── 001-connect-providers.yaml
    ├── 002-add-routes.yaml
    └── 003-verify-navigation.yaml
```

Parent tasks have minimal frontmatter: just `id`, `title`, and `description`. Leaf tasks get full frontmatter with `outputs:`, `checks:`, and `inputs:`.

## `mode: spawner` for "one per screen / one per route"

The stitch-to-flutter style of playbook often spawns one task per screen. The pattern:

1. **Manifest**: A file (e.g., `screens.json`) lists every screen.
2. **Parent task with `mode: spawner`**: The body reads the manifest and writes one JSONL row per screen to `$CONVERGE_TASK_DIR/spawn.plan.jsonl`.
3. **Template directory**: Contains a template `TASK.md` referenced by each spawn row; the framework renders one child per row.

```markdown
---
id: 03-build-screens
mode: spawner
spawn:
  template: .converge/playbooks/default/templates/screen
  min_children: 1
---

```bash
jq -c '.[] | {id:("screen-"+.id), template:".converge/playbooks/default/templates/screen", vars:.}' \
  .stitch/screens.json > "$CONVERGE_TASK_DIR/spawn.plan.jsonl"
```
```

Each row in `spawn.plan.jsonl` becomes a child task. The framework runs `converge apply` after the body, fans out, runs the children, and fans in when they complete.

For schema-level detail, see [TASK.md reference](/reference/task-md).

## Checks that work for software

The right checks verify real correctness:

- **Existence**: `test -f path/to/Component.tsx`: did the scaffolder produce the file?
- **Type-clean**: `pnpm --filter @app typecheck`: does TypeScript/Dart agree with the code? Note: pre-existing type errors in vendored code will block this check. See [troubleshooting typecheck errors in vendored code](/troubleshooting/typecheck-errors-in-vendored-code).
- **Build passes**: `pnpm --filter @app build`: does the package actually compile?
- **Negative checks**: `test -z "$(grep -rl 'TODO' src/)"`: verify no TODO comments remain in source.

## Anti-patterns

Three patterns that break convergence:

**Mixed-shape tasks.** A task that both creates files and does tree-wide cleanup runs slowly and converges poorly. Keep tasks single-purpose: either build something or verify something, not both. See [troubleshooting mixed-shape tasks](/troubleshooting/mixed-shape-task).

**Long-running E2E inside an attempt.** Running `pnpm dev`, then curling the server, then killing it: inside a single attempt: deadlocks. The dev server never returns, so the task never completes. Use separate tasks with a status file marker, or a check that verifies the server is up without blocking.

**All-or-nothing typecheck on a vendored codebase.** If you're working with borrowed code that has pre-existing type errors, a global `tsc --noEmit` will always fail. Use per-package typecheck with `--filter`, or disable the check for vendored directories.

## Where to go next

- [Examples gallery → software](/docs/examples/): find the closest match to your domain.
- [Customize an example](/guides/customize-an-example): field-by-field walkthrough of editing a copied playbook.
- [Reference: playbook.yml](/reference/playbook-yml): schema-level detail.
- [Reference: TASK.md](/reference/task-md): the four task modes (leaf / spawner / converger / gateway) and the full frontmatter reference.
