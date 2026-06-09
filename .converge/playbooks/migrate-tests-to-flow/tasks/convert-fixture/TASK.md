---
id: convert-fixture
title: "Clean-break migrate {{fixtureDir}} ({{playbookName}}) to a flow"
vars:
  fixtureDir:
  playbookName:
outputs:
  - "{{fixtureDir}}/.converge/playbooks/{{playbookName}}/playbook.js"
checks:
  - id: flow-written
    cmd: 'test -f "{{fixtureDir}}/.converge/playbooks/{{playbookName}}/playbook.js"'
    description: playbook.js exists
  - id: flow-valid-js
    cmd: 'node --check "{{fixtureDir}}/.converge/playbooks/{{playbookName}}/playbook.js"'
    description: playbook.js is valid JavaScript
  - id: yaml-removed
    cmd: 'test ! -f "{{fixtureDir}}/.converge/playbooks/{{playbookName}}/playbook.yml"'
    description: playbook.yml removed (clean break)
  - id: minimax-wired
    cmd: 'grep -q "api.minimax.io" "{{fixtureDir}}/.converge/project.yaml" 2>/dev/null || grep -q "api.minimax.io" "{{fixtureDir}}/.converge/project.yml" 2>/dev/null'
    description: project routes through MiniMax
---

# Clean-break migrate one folder playbook to a code-first flow (RFC 0050)

Convert `{{fixtureDir}}/.converge/playbooks/{{playbookName}}/` (`playbook.yml` +
`tasks/<id>/TASK.md`) into a code-first **`playbook.js`** flow, **remove the
`playbook.yml`**, wire MiniMax, and **verify it works**. The repo root is your
current working directory.

## Steps

1. **Read the source.** Read `{{fixtureDir}}/.converge/playbooks/{{playbookName}}/playbook.yml`
   and every `tasks/<id>/TASK.md`. Note each task `id`, dependency order (RFC
   0034: sibling static tasks with no explicit `tasks:` list auto-chain
   alphabetically), and `run.workers`. Identify any **runtime fan-out** tasks:
   `mode: spawner` / `mode: converger`, a `seed:` / `spawn:` / `spawns:` block,
   a do-while `converge:`, or a body that shells out to `converge spawn` /
   `converge apply`.

   **STOP if dynamic.** If the playbook uses ANY runtime fan-out, do NOT migrate
   it: a static `playbook.js` cannot reproduce a DAG that is shaped at runtime,
   and `converge compile` passing does NOT mean it will *run* correctly. Leave
   `playbook.yml` and `project.yaml` untouched, write a
   `{{fixtureDir}}/.converge/playbooks/{{playbookName}}/MIGRATION-TODO.md`
   noting it needs a `ctx.spawn` flow primitive, and finish. (The `yaml-removed`
   check will fail — that is the intended "needs manual finishing" signal.)
   Only continue to step 2 for **purely static** playbooks.

2. **Write `playbook.js`** at `{{fixtureDir}}/.converge/playbooks/{{playbookName}}/playbook.js`.
   - `task()` calls MUST use **relative paths** to the task's TASK.md, e.g.
     `await task("tasks/01-hello/TASK.md")` (resolved against this playbook dir).
   - Preserve dependency order; independent tasks in the same layer →
     `await parallel([() => task("tasks/a/TASK.md"), () => task("tasks/b/TASK.md")])`.
   - Chain by passing a prior task's returned JSON as the next task's params.
   - For **runtime fan-out** fixtures, express the fan-out **imperatively** — a
     JS `for` / `parallel` loop that calls `task("tasks/<child>/TASK.md", vars,
     { key })` per item, reading the data the spawner used (a manifest the
     parent writes, or the literal ids it spawned). **No TODO skeletons.**

   Shape:
   ```js
   export const meta = {
     name: "{{playbookName}}",
     description: "<from playbook.yml>",
     run: { workers: <N if > 1> },
   };
   export default async function flow({ task, parallel }) {
     await task("tasks/01-first/TASK.md");
     await parallel([
       () => task("tasks/02a/TASK.md"),
       () => task("tasks/02b/TASK.md"),
     ]);
     return { done: true };
   }
   ```

3. **Wire MiniMax** into `{{fixtureDir}}/.converge/project.yaml` (or `.yml`),
   replacing any top-level `ai:` block, keeping other keys:
   ```yaml
   ai:
     default: claude
     providers:
       claude:
         provider: claude
         env:
           ANTHROPIC_BASE_URL: ${ANTHROPIC_BASE_URL:-https://api.minimax.io/anthropic}
           ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
           ANTHROPIC_MODEL: ${ANTHROPIC_MODEL:-MiniMax-M2.7}
           ANTHROPIC_DEFAULT_SONNET_MODEL: ${ANTHROPIC_DEFAULT_SONNET_MODEL:-MiniMax-M2.7}
           ANTHROPIC_DEFAULT_OPUS_MODEL: ${ANTHROPIC_DEFAULT_OPUS_MODEL:-MiniMax-M2.7}
           ANTHROPIC_DEFAULT_HAIKU_MODEL: ${ANTHROPIC_DEFAULT_HAIKU_MODEL:-MiniMax-M2.7}
   ```

4. **Verify, THEN clean-break.** Before removing the YAML, sanity-check:
   - `node --check {{fixtureDir}}/.converge/playbooks/{{playbookName}}/playbook.js`
   - `node packages/cli/dist/index.js compile --dir {{fixtureDir}} --playbook {{playbookName}}`
     (this works without `playbook.yml` via the RFC 0050 compile fallback).
   If both succeed, **delete** `{{fixtureDir}}/.converge/playbooks/{{playbookName}}/playbook.yml`
   (the clean break). Re-run `compile` once more to confirm it still compiles
   with the YAML gone.

5. **On failure, stay safe.** If you cannot produce a flow that compiles (e.g. a
   genuinely runtime-dynamic shape you can't express), **keep `playbook.yml`**
   and write `{{fixtureDir}}/.converge/playbooks/{{playbookName}}/MIGRATION-TODO.md`
   explaining what's missing. (The `yaml-removed` check will then fail, flagging
   this fixture as needing manual finishing — that is the intended signal.)
