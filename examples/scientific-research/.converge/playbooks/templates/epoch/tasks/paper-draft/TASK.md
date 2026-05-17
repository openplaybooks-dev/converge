---
id: "{{taskId}}"
title: "Paper draft — epoch {{epoch}}"
depends_on:
  - 006-contradiction-resolution
seed:
  mode: cli
---

# Paper Draft — Epoch {{epoch}}

Generate an academic-quality research paper from the accumulated evidence by spawning one child task per paper section.

Sections (in order): `abstract`, `intro`, `methods`, `results`, `discussion`, `conclusion`, `references`, `supplementary`.

## Spawn per-section children

Spawn exactly eight `paper-section` children — one per section, in order:

```bash
for SECTION in abstract intro methods results discussion conclusion references supplementary; do
  converge spawn template \
    --path .converge/playbooks/templates/paper-section/TASK.md \
    --id "paper-${CONVERGE_VAR_EPOCH}-${SECTION}" \
    --var "epoch=${CONVERGE_VAR_EPOCH}" \
    --var "question=${CONVERGE_VAR_QUESTION}" \
    --var "domain=${CONVERGE_VAR_DOMAIN:-general}" \
    --var "section=${SECTION}"
done
```

Each spawned `paper-section` child writes its section to `{{artifactsDir}}/paper-draft/<section>.md`. The full paper (`paper-draft.md`) is assembled by concatenating the section files in order — handled either by the final section child or by the downstream convergence-check task.
