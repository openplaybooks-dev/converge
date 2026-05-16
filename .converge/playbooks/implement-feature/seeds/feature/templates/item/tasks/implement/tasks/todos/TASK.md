---
id: "{{taskId}}"
title: "Execute todos — {{task}}"
seed:
  mode: cli
---

# Execute implementation

Read `{{artifactsDir}}/implement/plan.md` if it exists.

If it does not exist, emit one `converge spawn task` command for
`001-execute` telling the child to implement `{{task}}` using
`{{artifactsDir}}/analyze/plan.md`.

If it exists, parse numbered steps from a `## Changes`, `## Order of Operations`,
or `## Steps` section. Emit one `converge spawn task` command per step using ids
`001-step`, `002-step`, and so on. Each child body should include the step text
plus the full plan for context.

Emit only `converge spawn ...` commands.
