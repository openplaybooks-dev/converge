---
id: "{{taskId}}"
title: "Initial Aggregation"
skill: research-layer-aggregate
vars:
  questionDir:
depends_on:
  - 003-scope-identification
checks:
  - id: aggregation-written
    cmd: "test -f {{questionDir}}/output/1-initial/summary.json"
    description: "summary.json exists"
---

# Initial Aggregation

Read `{{questionDir}}/question.md` and all Phase 1 artifacts under `{{questionDir}}/output/1-initial/`:
- `search.md`
- `sources.json`
- `scope.json`

Synthesize them into `{{questionDir}}/output/1-initial/summary.json`:

```json
{
  "question_restated": "the original question in 1-2 sentences",
  "landscape_summary": "150-300 word picture of the field",
  "key_uncertainties": ["...", "...", "..."],
  "recommended_depth": "shallow|medium|deep",
  "phase_2_subtopics": [
    {"id": "ST-1", "name": "...", "priority": "high|medium|low"}
  ],
  "ready_for_phase_2": true,
  "rationale": "1-2 sentence justification for proceeding"
}
```

Use the `Write` tool.
