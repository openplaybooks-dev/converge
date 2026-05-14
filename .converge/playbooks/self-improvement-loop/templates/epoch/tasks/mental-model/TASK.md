---
id: "{{taskId}}"
title: "Select mental model to audit — epoch {{epoch}}"
outputs:
  - "{{artifactsRel}}/mental-model/selection.json"
seeds: [selection]
checks:
  - id: selection-valid
    cmd: "node .converge/playbooks/self-improvement-loop/scripts/jq-safe.mjs empty {{artifactsRel}}/mental-model/selection.json"
    description: Mental model selection is valid JSON
  - id: model-named
    cmd: "node .converge/playbooks/self-improvement-loop/scripts/jq-safe.mjs -e '.model != \"\" and .model_index >= 1 and .model_index <= 10' {{artifactsRel}}/mental-model/selection.json"
    description: A valid mental model (1-10) is selected
  - id: not-recently-audited
    cmd: "node .converge/playbooks/self-improvement-loop/scripts/jq-safe.mjs -e '.reason | contains(\"not recently audited\")' {{artifactsRel}}/mental-model/selection.json"
    description: Selected model was not audited in the last 2 epochs
  - id: not-escalated
    cmd: "node .converge/playbooks/self-improvement-loop/scripts/jq-safe.mjs -e '.escalation_check == \"clean\"' {{artifactsRel}}/mental-model/selection.json"
    description: Selected model does not overlap escalated bugs
---

Selection is deterministic — the seed script picks the lowest-index mental model
not audited in the last 2 epochs and not blocked by escalation. No AI needed.

