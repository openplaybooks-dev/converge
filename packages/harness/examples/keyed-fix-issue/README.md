# Example: Keyed Playbook (Fix Issue)

Each `--issue=N` generates a fresh task pipeline via WBS.

## Structure

```
.harness/playbooks/fix-issue/
├── playbook.yml              ← inputs, key, run config
└── tasks/
    ├── TASK.md               ← root task with wbs: in frontmatter
    └── wbs.js                ← generates child tasks per issue
```

The root TASK.md uses the standard task API — `wbs:` in frontmatter
points to `wbs.js` which calls `ctx.spawn()` to create the pipeline.
No special playbook mechanism needed.

## Usage

```bash
harness run --playbook=fix-issue --issue=42
harness run --playbook=fix-issue --issue=43
harness playbook history fix-issue
```

## What Happens

1. Playbook copies `tasks/` into `.harness/epics/fix-issue-42/`
2. `TASK.md` has `wbs:` — autonomousRun treats it as a WBS parent
3. `wbs.js` runs, spawns: investigate → implement → verify → commit
4. autonomousRun executes the spawned tasks in order
