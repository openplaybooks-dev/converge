# Frontier Research

Beam-search frontier research — explores unknown solution spaces using parallel beams, multi-dimensional scoring, and gradient-descent convergence to discover novel insights on complex open-ended questions.

## Usage

```bash
converge .converge/playbooks/frontier-research/playbook.yml run \
  --question="What are the fundamental limits of in-context learning in transformer architectures?"
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `question` | yes | — | The complex research question to explore |
| `domain` | no | `general` | Research domain for context |
| `beamWidth` | no | `5` | Number of parallel beams per epoch |
| `selectionWidth` | no | `2` | Number of top beams selected per epoch |
| `convergenceThreshold` | no | `0.15` | Minimum insight delta to continue |

## Architecture

**Run mode**: `loop` — each iteration spawns a new epoch. Knowledge accumulates across epochs. Dead ends are tracked. The loop stops when insight delta falls below threshold for 2 consecutive epochs.

### Core Metaphor

Each epoch = one gradient step. Within each epoch, N parallel "beams" explore different research directions simultaneously. Top-K beams are selected, their insights merged, and the next epoch branches from the accumulated knowledge.

### Epoch Pipeline (6 phases)

```
001-frontier-analysis → 002-beam-spawning → 003-beam-execution (N parallel) →
004-beam-scoring (N parallel) → 005-selection-merge → 006-gradient-step
```

| # | Phase | Description |
|---|-------|-------------|
| 1 | **Frontier Analysis** | Map knowledge frontier, rank edges by impact/tractability/novelty |
| 2 | **Beam Spawning** | Define N beams targeting promising edges (each with unique methodology) |
| 3 | **Beam Execution** | Explore each beam in parallel (dynamic Seed, per-beam tasks) |
| 4 | **Beam Scoring** | Score each beam on 5 dimensions (dynamic Seed, per-beam tasks) |
| 5 | **Selection & Merge** | Select top-K beams, merge insights, compute insight delta |
| 6 | **Gradient Step** | Update knowledge model, decide convergence |

### Key Differentiators

- **No fixed methodology** — each beam defines its own research approach (literature synthesis, adversarial analysis, analogical reasoning, formal modeling, etc.)
- **Dead-end tracking** — eliminated beams contribute negative results, preventing re-exploration
- **Insight delta convergence** — loop stops when new epochs produce diminishing returns
- **Unknown solution spaces** — designed for problems where the structure itself is discovered during research

### Scoring Dimensions

Each beam is scored on 5 dimensions (0-1):

| Dimension | Weight | What it measures |
|-----------|--------|-----------------|
| Novelty | 25% | Genuinely new insights vs restating known facts |
| Evidence | 20% | Quality of reasoning and evidence chains |
| Coherence | 20% | Internal consistency and fit with accumulated knowledge |
| Depth | 20% | Structural understanding vs surface observations |
| Generativity | 15% | Opens new research directions and follow-up questions |

### Convergence

Insight delta measures the proportion of new unique insights per epoch. Convergence occurs when delta falls below threshold (default: 0.15) for 2 consecutive epochs.

## Artifacts

```
.converge/artifacts/frontier-research/
  research-state.json                # accumulated knowledge model
  research-ledger.jsonl              # insight delta per epoch
  epochs/
    001/
      frontier-analysis.json
      beams.json
      explorations/beam-B1.json, ..., summary.json
      scores/beam-B1.json, ..., summary.json
      selection.json
      gradient-step.json
```

## File Structure

```
.converge/
├── playbooks/
│   ├── playbook.yml
│   ├── TASK.md
│   ├── seed/
│   │   ├── seed.js                              # epoch spawner
│   │   └── templates/
│   │       └── epoch/
│   │           ├── TASK.md                      # epoch template
│   │           ├── wb./seed.js                   # 6-phase pipeline spawner
│   │           └── tasks/
│   │               ├── frontier-analysis/TASK.md
│   │               ├── beam-spawning/TASK.md
│   │               ├── beam-execution/
│   │               │   ├── TASK.md              # Seed parent
│   │               │   └── wb./seed.js           # per-beam spawner
│   │               ├── beam-scoring/
│   │               │   ├── TASK.md              # Seed parent
│   │               │   └── wb./seed.js           # per-beam scorer
│   │               ├── selection-merge/TASK.md
│   │               └── gradient-step/TASK.md
└── skills/
    ├── frontier-analyze/SKILL.md
    ├── frontier-spawn-beams/SKILL.md
    ├── frontier-explore-beam/SKILL.md
    ├── frontier-score-beam/SKILL.md
    ├── frontier-select-merge/SKILL.md
    ├── frontier-gradient-step/SKILL.md
    └── frontier-report/SKILL.md
```
