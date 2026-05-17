---
id: "{{taskId}}"
title: "Scope Identification"
skill: research-layer-aggregate
vars:
  questionDir:
depends_on:
  - 002-initial-gather
checks:
  - id: scope-written
    cmd: "test -f {{questionDir}}/output/1-initial/scope.json"
    description: "scope.json exists"
---

# Scope Identification

Read `{{questionDir}}/question.md`, `{{questionDir}}/output/1-initial/search.md`, and `{{questionDir}}/output/1-initial/sources.json`.

Identify the 3-5 sub-topics most worth deep investigation in Phase 2. Write `{{questionDir}}/output/1-initial/scope.json`:

```json
{
  "subtopics": [
    {
      "id": "ST-1",
      "name": "concise name",
      "rationale": "why this sub-topic is high-leverage for the main question",
      "key_questions": ["...", "..."],
      "evidence_strength_so_far": "strong|moderate|weak"
    }
  ],
  "deprioritized": [
    {"name": "...", "reason": "..."}
  ]
}
```

Use the `Write` tool. Be ruthless — only sub-topics that materially advance answering the main question.
