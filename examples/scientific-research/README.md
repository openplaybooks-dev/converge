# Scientific Research

Autonomous scientific research pipeline with iterative evidence synthesis, Bayesian reasoning, GRADE methodology, meta-analysis, and academic paper generation.

## Usage

```bash
converge .converge/playbooks/scientific-research/playbook.yml run \
  --question="What causes transformer models to lose in-context learning ability during fine-tuning?"
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `question` | yes | — | The research question to investigate |
| `domain` | no | `general` | Research domain for context |
| `targetScore` | no | `70` | Minimum quality score (0-100) for convergence |

## Architecture

**Run mode**: `loop` — each iteration spawns a new epoch (research iteration). Evidence accumulates across epochs. Bayesian priors update. The loop stops when quality thresholds are met and improvement plateaus.

### Epoch Pipeline (8 phases)

```
001-literature → 002-hypothesize → 003-experiment → 004-statistical-analysis →
005-evidence-synthesis → 006-contradiction-resolution → 007-paper-draft → 008-convergence-check
```

| # | Phase | Description |
|---|-------|-------------|
| 1 | **Literature** | Incremental literature search; reads prior epochs to avoid duplication |
| 2 | **Hypothesize** | Bayesian hypothesis formulation with prior updating |
| 3 | **Experiment** | Per-hypothesis structured experiments (dynamic Seed) |
| 4 | **Statistical Analysis** | Effect sizes (Cohen's d), CIs, meta-analysis, I² heterogeneity |
| 5 | **Evidence Synthesis** | GRADE methodology — rates claims A/B/C/D |
| 6 | **Contradiction Resolution** | Systematic conflict resolution with strategy taxonomy |
| 7 | **Paper Draft** | Academic paper with 8 sections (dynamic Seed per section) |
| 8 | **Convergence Check** | Quality scoring, gap analysis, continue/stop decision |

### Convergence

Quality score (0-100) based on weighted criteria:

| Criterion | Weight |
|-----------|--------|
| Evidence Coverage | 25% |
| GRADE Quality | 30% |
| Contradiction Resolution | 15% |
| Statistical Rigor | 15% |
| Paper Completeness | 15% |

Stops when score meets target AND improvement < 3 points from prior epoch.

### Evidence Model

Each claim carries a GRADE rating (A-D), effect size with confidence interval, and Bayesian posterior probability. Hypotheses track priors across epochs using Bayesian updating.

## Artifacts

```
.converge/artifacts/scientific-research/
  research-ledger.jsonl              # quality scores per epoch
  epochs/
    001/
      literature/sources.json, prior-state.json
      hypothesize/hypotheses.json
      experiment/{H1,H2,...}.json, summary.json
      statistical-analysis/statistics.json, meta-analysis.json
      evidence-synthesis/evidence-grades.json
      contradiction-resolution/contradictions.json
      paper-draft/sections/{abstract,intro,...}.md, paper-draft.md
      convergence/convergence.json, gap-analysis.md
```

## File Structure

```
.converge/
├── skills/
│   ├── research-literature/SKILL.md
│   ├── research-hypothesize/SKILL.md
│   ├── research-experiment/SKILL.md
│   ├── research-statistics/SKILL.md
│   ├── research-grade/SKILL.md
│   ├── research-contradictions/SKILL.md
│   ├── research-draft-section/SKILL.md
│   ├── research-assemble/SKILL.md
│   └── research-convergence/SKILL.md
└── playbooks/
    ├── playbook.yml                              # loop mode config
    ├── TASK.md                                   # root Seed entry point
    └── seed/
        ├── seed.js                                # epoch spawner
        └── templates/
            └── epoch/
                ├── TASK.md                       # epoch template
                ├── wb./seed.js                    # 8-phase pipeline spawner
                └── tasks/
                    ├── literature/TASK.md
                    ├── hypothesize/TASK.md
                    ├── experiment/
                    │   ├── TASK.md               # Seed parent
                    │   └── wb./seed.js            # per-hypothesis spawner
                    ├── statistical-analysis/TASK.md
                    ├── evidence-synthesis/TASK.md
                    ├── contradiction-resolution/TASK.md
                    ├── paper-draft/
                    │   ├── TASK.md               # Seed parent
                    │   └── wb./seed.js            # per-section spawner
                    └── convergence-check/TASK.md
```
