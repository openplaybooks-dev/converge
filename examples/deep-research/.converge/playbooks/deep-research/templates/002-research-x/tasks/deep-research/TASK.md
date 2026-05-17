---
id: "{{taskId}}"
title: "Deep Research"
skill: research-layer-aggregate
vars:
  questionDir:
checks:
  - id: deep-research-written
    cmd: "test -f {{questionDir}}/output/2-research/deep-research.md"
    description: "deep-research.md exists"
---

# Deep Research

Read `{{questionDir}}/question.md` and all Phase 1 artifacts under `{{questionDir}}/output/1-initial/`:
- `search.md` — initial breadth
- `sources.json` — source list
- `scope.json` — sub-topics identified
- `summary.json` — Phase 1 synthesis with the recommended sub-topics

For each sub-topic in `summary.json#phase_2_subtopics`, produce a focused analysis. Bring in additional sources beyond Phase 1 where relevant — cite them by name (author, year, venue). Where evidence conflicts, surface the contradiction explicitly rather than picking a side.

Write `{{questionDir}}/output/2-research/deep-research.md` with this structure:

```markdown
# Deep Research

**Question**: (restate from question.md)

## Sub-topic Analyses

### ST-1: <name>

**Key findings**:
- finding 1 with [SRC-N] or full inline citation
- finding 2 ...

**Strongest evidence**: ...

**Counter-evidence / open questions**: ...

**Confidence**: high|medium|low

[Repeat for each sub-topic]

## Cross-Subtopic Insights

3-5 insights that emerge from looking across sub-topics together — connections, contradictions, surprises.

## What's Still Unresolved

3-5 specific things we'd need to know to give a definitive answer to the main question.
```

Use the `Write` tool. Aim for substantive content — this is the core of the research.
