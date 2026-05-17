---
title: "Deep Research: iterative-deepening research playbook with quality gates"
description: "Multi-layer AI research with breadth survey → focused exploration → deep investigation. Each layer aggregates findings, identifies promising areas, and triggers deeper probes. Includes inline source citations and quality gates."
sidebar:
  label: "Deep Research"
  order: 1
---

> **Use this if:** *"I want a thorough briefing on a topic: not a one-shot summary, but layered investigation that goes deeper where the evidence is interesting."*

**Complexity:** medium · **Run time:** minutes to hours (depends on layers) · **Category:** [Research](../)

Most "deep research" agents do one wide pass and call it done. This playbook treats research the way a human analyst does: **breadth first, then focus, then depth.** Each layer aggregates findings, identifies promising areas, and only proceeds to the next layer if quality gates pass.

If you've tried tools like Perplexity Deep Research or OpenAI's deep-research mode and wished they were transparent, configurable, and reproducible: this is the open playbook version of that.

## What it does

You give it a question. It returns a final report (`report.md`) with inline `[SRC-N]` citations, traceable reasoning chains, and a registry of every source consulted. Along the way it produces structured aggregation artifacts at each layer so you can audit what was kept, what was dropped, and why.

```
Layer 1: Breadth Survey         → identify ≥3 promising areas
Layer 2: Focused Exploration    → deep-dive each area, cross-analyze
Layer 3: Deep Investigation     → critical investigation + reasoning chains
Final Report                    → synthesize all layers with [SRC-N] citations
```

## Why it works

Three design choices distinguish this from a one-shot deep-research call:

1. **Aggregation is a first-class phase, not a summary step.** Each layer ends with an explicit aggregation task that produces a JSON artifact: key findings, promising areas (with rationale + evidence strength), dropped areas (with reasons), and insight triggers for the next layer. Nothing gets silently abandoned.
2. **Insight triggers flow between layers.** A `contradiction` in Layer 1 *forces* Layer 2 to investigate it. `weakEvidence` triggers a stronger-source hunt. `scopeExpansion` widens the next layer's search. The next layer's plan is shaped by what the current layer learned, not chosen blindly.
3. **Quality gates prevent wasted work.** Layer 1 must identify ≥3 promising areas to proceed; Layer 2 must produce cross-area insights to unlock Layer 3. If a gate fails, the playbook terminates with a partial report rather than burning tokens on a dead lead.

## Anatomy

```
.converge/playbooks/deep-research/
├── playbook.yml                              # run limits + top-level config
├── TASK.md                                   # root loop / seed driver
└── templates/
    ├── layer-1/                              # Breadth Survey
    │   └── tasks/
    │       ├── 001-rapid-search/
    │       ├── 002-surface-gather/
    │       ├── 003-area-identification/
    │       └── 004-aggregation/              # → quality gate
    ├── layer-2/                              # Focused Exploration
    │   └── tasks/
    │       ├── 001-deep-dive-areas/
    │       ├── 002-cross-analysis/
    │       ├── 003-compare-findings/
    │       └── 004-aggregation/              # → quality gate
    ├── layer-3/                              # Deep Investigation
    │   └── tasks/
    │       ├── 001-critical-investigation/
    │       ├── 002-reasoning-chains/
    │       ├── 003-comprehensive-synthesis/
    │       └── 004-aggregation/
    └── final/                                # Final Report
```

### Aggregation artifact (one per layer)

```json
{
  "layer": 1,
  "keyFindings": [...],
  "promisingAreas": [
    { "area": "Name", "rationale": "...", "evidenceStrength": 0.8 }
  ],
  "droppedAreas": [
    { "area": "Name", "rationale": "..." }
  ],
  "insightTriggers": [
    { "type": "contradiction", "description": "...", "targetLayer": 2 }
  ],
  "recommendation": "proceed_to_layer_2|terminate|skip_layer_3",
  "qualityGatePassed": true
}
```

## Run it

```bash
git clone https://github.com/myanlabs/converge.git
cd converge/examples/deep-research

converge .converge/playbooks/deep-research/playbook.yml run \
  --question="What are the fundamental limits of in-context learning in transformer architectures?"
```

### Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `question` | yes |: | The research question to investigate |
| `domain` | no | `general` | Research domain for context |
| `maxLayers` | no | `3` | Maximum layers to execute (1–3) |
| `minPromisingAreas` | no | `3` | Min promising areas to proceed from Layer 1 |

### Output

```
.converge/artifacts/deep-research/
├── source-registry.json           # all sources accumulated across layers
├── layers/00X-{name}/004-aggregation/aggregation.json
└── final/report.md                # the deliverable
```

## Customize it

- **Add a Layer 4**: copy `templates/layer-3/`, drop in domain-specific synthesis tasks (e.g. mechanistic interpretation, mathematical proof sketching), and bump `maxLayers`.
- **Tighten quality gates**: edit `004-aggregation` skill prompts to require ≥5 promising areas, or to require a minimum evidence-strength score.
- **Swap providers**: see [Switch providers](../../guides/switch-providers). The research skills are model-agnostic; you can run Layer 1 on a cheap fast model and Layer 3 on Opus.
- **Domain-specific skills**: replace `research-rapid-search` with a skill that hits arXiv, PubMed, or your internal knowledge base instead of generic web search.

See [Research a topic deeply](../../guides/research-a-topic-deeply) for the full customization walkthrough.

## Related examples

- [Frontier Research](../research/frontier-research): sibling playbook using **beam search** instead of layered deepening. Use it for open-ended exploration where you don't yet know which direction is most promising.
- [Scientific Research](../research/scientific-research): adds Bayesian reasoning, GRADE methodology, and academic-paper formatting on top of the same layered pattern.
- [Deep Research source on GitHub](https://github.com/myanlabs/converge/tree/main/examples/deep-research)
