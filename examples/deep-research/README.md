# Deep Research

Layered deep research with iterative deepening — each layer aggregates findings, identifies promising areas, and triggers deeper investigation in subsequent layers.

## Usage

```bash
converge .converge/playbooks/deep-research/playbook.yml run \
  --question="What are the fundamental limits of in-context learning in transformer architectures?"
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `question` | yes | — | The research question to investigate |
| `domain` | no | `general` | Research domain for context |
| `maxLayers` | no | `3` | Maximum layers to execute (1-3) |
| `minPromisingAreas` | no | `3` | Minimum promising areas to proceed from Layer 1 |

## Architecture

**Run mode**: `loop` — each iteration spawns a layer. Layers proceed sequentially: Layer 1 → Layer 2 → Layer 3 → Final Report. Quality gates control progression.

### Core Metaphor

Research is not a linear pipeline — it's iterative deepening. Layer 1 surveys the breadth of the problem space. Layer 2 focuses on promising areas. Layer 3 deeply investigates the most critical areas. Each layer's aggregation feeds into the next.

### Layer Pipeline

```
Layer 1: Breadth Survey
  ├── 001-rapid-search
  ├── 002-surface-gather
  ├── 003-area-identification
  └── 004-aggregation → quality gate (≥3 promising areas)

Layer 2: Focused Exploration
  ├── 001-deep-dive-areas
  ├── 002-cross-analysis
  ├── 003-compare-findings
  └── 004-aggregation → quality gate (cross-area insights)

Layer 3: Deep Investigation
  ├── 001-critical-investigation
  ├── 002-reasoning-chains
  ├── 003-comprehensive-synthesis
  └── 004-aggregation

Final Report
  └── Synthesizes all layers with inline [SRC-N] citations
```

### Key Differentiators

1. **Aggregation is a first-class phase** — not a summary step but explicit synthesis that produces actionable outputs
2. **Insight triggers flow between layers** — contradictions, weak evidence, scope expansion trigger focused investigation in subsequent layers
3. **Quality gates control progression** — Layer 1 must identify ≥3 promising areas to proceed; Layer 2 must produce cross-area insights
4. **Reasoning chains are traced** — each conclusion traces back to specific evidence
5. **Dropped areas are documented** — rationale for deprioritization is recorded, not silently abandoned

### Insight Trigger Types

| Trigger | Effect on Next Layer |
|---------|---------------------|
| `contradiction` | Layer N+1 must investigate and resolve |
| `weakEvidence` | Layer N+1 must find stronger sources |
| `scopeExpansion` | Layer N+1 expands investigation scope |
| `confirmation` | Document finding, move focus elsewhere |
| `deadEnd` | Drop from further investigation |

### Quality Gates

- **Layer 1**: ≥3 promising areas identified → proceed to Layer 2, else terminate with Layer 1 report
- **Layer 2**: cross-area insights produced → proceed to Layer 3, else skip Layer 3
- **Layer 3**: definitive synthesis with traceable reasoning → high-confidence final report

## Aggregation Output

Each layer's aggregation produces a structured artifact:

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

## Artifacts

```
.converge/artifacts/deep-research/
├── source-registry.json           # all sources accumulated across layers
├── layers/
│   ├── 001-breadth-survey/
│   │   ├── 001-rapid-search/
│   │   ├── 002-surface-gather/
│   │   ├── 003-area-identification/
│   │   └── 004-aggregation/aggregation.json
│   ├── 002-focused-exploration/
│   │   ├── 001-deep-dive-areas/
│   │   ├── 002-cross-analysis/
│   │   ├── 003-compare-findings/
│   │   └── 004-aggregation/aggregation.json
│   └── 003-deep-investigation/
│       ├── 001-critical-investigation/
│       ├── 002-reasoning-chains/
│       ├── 003-comprehensive-synthesis/
│       └── 004-aggregation/aggregation.json
└── final/
    └── report.md
```

## File Structure

```
.converge/
├── playbooks/
│   ├── playbook.yml
│   ├── TASK.md
│   ├── seed/
│   │   └── seed.js                    # layer spawner
│   └── templates/
│       ├── layer-1/                   # Breadth Survey
│       │   ├── TASK.md
│       │   ├── wb./seed.js
│       │   └── tasks/
│       │       ├── 001-rapid-search/
│       │       ├── 002-surface-gather/
│       │       ├── 003-area-identification/
│       │       └── 004-aggregation/
│       ├── layer-2/                   # Focused Exploration
│       │   ├── TASK.md
│       │   ├── wb./seed.js
│       │   └── tasks/
│       │       ├── 001-deep-dive-areas/
│       │       ├── 002-cross-analysis/
│       │       ├── 003-compare-findings/
│       │       └── 004-aggregation/
│       ├── layer-3/                   # Deep Investigation
│       │   ├── TASK.md
│       │   ├── wb./seed.js
│       │   └── tasks/
│       │       ├── 001-critical-investigation/
│       │       ├── 002-reasoning-chains/
│       │       ├── 003-comprehensive-synthesis/
│       │       └── 004-aggregation/
│       └── final/                    # Final Report
│           ├── TASK.md
│           └── wb./seed.js
└── skills/
    ├── research-rapid-search/
    ├── research-surface-gather/
    ├── research-area-identify/
    ├── research-layer-aggregate/
    ├── research-deep-dive/
    ├── research-cross-analysis/
    ├── research-compare-findings/
    ├── research-critical-investigation/
    ├── research-reasoning-chains/
    ├── research-comprehensive-synthesis/
    └── research-final-report/
```