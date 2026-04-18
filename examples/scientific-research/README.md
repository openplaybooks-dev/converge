# Scientific Research

Autonomous scientific research following the standard methodology — literature review, hypothesis formulation, experimentation, analysis, and synthesis.

## Usage

```bash
converge run --converge --playbook=research \
  --question="What causes transformer models to lose in-context learning ability during fine-tuning?"
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `question` | yes | — | The research question |
| `maxDepth` | no | `5` | Maximum recursive decomposition depth |

## How It Works

The playbook runs a 5-phase pipeline, re-triggered by the convergence loop until all evidence criteria are met:

```
001-literature-review → 002-hypothesize → 003-experiment → 004-analyze → 005-synthesize
```

1. **Literature Review** — survey existing knowledge, output structured findings
2. **Hypothesize** — formulate testable hypotheses from the findings
3. **Experiment** — test each hypothesis (spawns per-hypothesis tasks dynamically; complex hypotheses trigger recursive sub-pipelines)
4. **Analyze** — cross-reference results, build evidence index
5. **Synthesize** — produce final answer with evidence chain

### Convergence

The `dod.js` checks 6 criteria:
- Literature review exists with adequate sources
- Testable hypotheses have been formulated
- All hypotheses have been tested
- All claims are backed by evidence
- No unresolved contradictions remain
- Synthesis document addresses the research question

The loop re-runs when evidence is insufficient or contradictions remain.

## File Structure

```
.converge/playbooks/
├── playbook.yml
├── tasks/
│   ├── TASK.md
│   ├── wbs.js              # 5-phase sequential pipeline
│   └── experiment-wbs.js   # Per-hypothesis dynamic spawner
├── skills/
│   ├── research-survey/
│   ├── research-hypothesize/
│   ├── research-experiment/
│   ├── research-analyze/
│   ├── research-synthesize/
│   └��─ research-evaluate/
│       ├── SKILL.md
│       └── check.js         # Deterministic evidence validator
└── goals/
    └── 001-research-complete/
        ├── GOAL.md
        └── dod.js            # 6-test convergence check
```
