---
id: 000-bootstrap
title: Deep research — bootstrap
passthrough: true
checks:
  - id: spawn-plan-applied
    cmd: bash -c '! grep -q "\"ok\":false" "$CONVERGE_TASK_DIR/spawn.plan.result.jsonl"'
    description: "every row in spawn.plan.result.jsonl is ok:true"
---

# Bootstrap

Wave-1 entry point. Spawns the linear 6-task pipeline against one question
folder under `questions/`.

## Pick the question directory

Read the active question slug from `.converge/.question-dir`. It contains a
single line like `questions/icl-limits`. If the file is missing, fail with a
clear message.

## Write the spawn manifest

Compose one JSONL line per child under `$CONVERGE_TASK_DIR/spawn.plan.jsonl`,
then run `converge apply` against it. No shell quoting — the manifest is
read as JSON, so values containing spaces, slashes, or non-ASCII characters
round-trip verbatim.

```bash
QDIR=$(cat .converge/.question-dir)

cat > "$CONVERGE_TASK_DIR/spawn.plan.jsonl" <<JSON
{"id":"initial-search","template":".converge/playbooks/deep-research/templates/001-initial/tasks/001-initial-search/TASK.md","vars":{"questionDir":"$QDIR"}}
{"id":"initial-gather","template":".converge/playbooks/deep-research/templates/001-initial/tasks/002-initial-gather/TASK.md","vars":{"questionDir":"$QDIR"},"after":["initial-search"]}
{"id":"scope-identification","template":".converge/playbooks/deep-research/templates/001-initial/tasks/003-scope-identification/TASK.md","vars":{"questionDir":"$QDIR"},"after":["initial-gather"]}
{"id":"initial-aggregation","template":".converge/playbooks/deep-research/templates/001-initial/tasks/004-initial-aggregation/TASK.md","vars":{"questionDir":"$QDIR"},"after":["scope-identification"]}
{"id":"deep-research","template":".converge/playbooks/deep-research/templates/002-research-x/tasks/deep-research/TASK.md","vars":{"questionDir":"$QDIR"},"after":["initial-aggregation"]}
{"id":"final-report","template":".converge/playbooks/deep-research/templates/003-report/tasks/001-final-report/TASK.md","vars":{"questionDir":"$QDIR"},"after":["deep-research"]}
JSON

converge apply "$CONVERGE_TASK_DIR/spawn.plan.jsonl"
```

If `converge apply` exits non-zero, the per-row failures land in
`$CONVERGE_TASK_DIR/spawn.plan.result.jsonl`. The check above fails until
every row is `ok:true`, at which point bootstrap converges.
