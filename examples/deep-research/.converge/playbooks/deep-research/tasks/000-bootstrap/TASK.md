---
id: 000-bootstrap
title: Deep research — bootstrap
seed:
  mode: cli
---

# Bootstrap

Wave-1 entry point. Spawns the linear 6-task pipeline against one question
folder under `questions/`.

## Pick the question directory

Run `cat .converge/.question-dir` to read the active question slug. It will
contain a single line like `questions/icl-limits`. Use that value verbatim
as `QDIR` in the spawn commands below — replace the literal string
`<QDIR>` in each line with what the file contains.

If the file is missing, fail with a clear message.

## Spawn

Emit these six commands, with `<QDIR>` replaced by the value you read:

```
converge spawn task --id "initial-search" --task-file ".converge/playbooks/deep-research/templates/001-initial/tasks/001-initial-search/TASK.md" --var "questionDir=<QDIR>"
converge spawn task --id "initial-gather" --task-file ".converge/playbooks/deep-research/templates/001-initial/tasks/002-initial-gather/TASK.md" --depends-on "initial-search" --var "questionDir=<QDIR>"
converge spawn task --id "scope-identification" --task-file ".converge/playbooks/deep-research/templates/001-initial/tasks/003-scope-identification/TASK.md" --depends-on "initial-gather" --var "questionDir=<QDIR>"
converge spawn task --id "initial-aggregation" --task-file ".converge/playbooks/deep-research/templates/001-initial/tasks/004-initial-aggregation/TASK.md" --depends-on "scope-identification" --var "questionDir=<QDIR>"
converge spawn task --id "deep-research" --task-file ".converge/playbooks/deep-research/templates/002-research-x/tasks/deep-research/TASK.md" --depends-on "initial-aggregation" --var "questionDir=<QDIR>"
converge spawn task --id "final-report" --task-file ".converge/playbooks/deep-research/templates/003-report/tasks/001-final-report/TASK.md" --depends-on "deep-research" --var "questionDir=<QDIR>"
```

On later waves emit no commands and return `done: true`.
