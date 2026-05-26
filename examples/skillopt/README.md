# SkillOpt — ReflACT Skill Optimization

Iterative LLM skill training via Microsoft's [SkillOpt](https://github.com/microsoft/SkillOpt) ReflACT framework, orchestrated as a Converge playbook.

## Quick start

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
bash scripts/run.sh
```

Requires Python 3.10+ and Node.js. SkillOpt is cloned and installed automatically on first run.

## What it does

SkillOpt trains LLM agent "skills" (markdown prompt documents) through a feedback loop analogous to gradient descent:

```
rollout → reflect → aggregate → select → update → evaluate
   ↑                                                  │
   └──────────────── next epoch ───────────────────────┘
```

Each epoch: run the agent with the current skill, analyze failures, propose patches, rank them, apply the best, evaluate. Repeat until the skill plateaus.

## How it works

```
01-setup        →  Clone SkillOpt, install deps, score baseline skill
02-train        →  Converger: one wave per epoch, halts on plateau
03-final-eval   →  Evaluate best skill on held-out eval set
04-report       →  Generate quality comparison (baseline vs optimized)
```

The `02-train` task is a **converger** — it loops one wave per epoch, running SkillOpt's full ReflACT pipeline each wave. The `wave_check` detects:

- **Plateau** (exit 0): score deltas < 0.01 for 3 consecutive epochs → halt, success
- **Degradation** (exit 2): score below baseline for 3 consecutive epochs → halt, failure
- Max 10 epochs via `max_waves`

## Artifacts

```
output/
├── best_skill.md       Best skill found during training
├── baseline_skill.md   Original skill (before training)
├── history.json        Per-epoch scores and decisions
├── final_eval.json     Test-set hard/soft accuracy
├── report.md           Human-readable comparison
└── skills/             All intermediate skill versions
```

## Configuration

The demo config at `configs/demo.yaml` uses:

| Setting | Value | Notes |
|---------|-------|-------|
| Backend | Claude | via SkillOpt's `claude_backend.py` |
| Model | `claude-sonnet-4-6` | for both optimizer and target |
| Train size | 20 items | bundled sample data |
| Eval size | 10 items | bundled sample data |
| Batch size | 10 | 2 batches per epoch |
| Edit budget | 3 | max skill edits per step |
| Max epochs | 10 | via converger `max_waves` |

### Using a different benchmark

The playbook is benchmark-agnostic. To use a different SkillOpt environment:

1. Add your data under `data/<benchmark>/` (train.jsonl + eval.jsonl)
2. Edit `configs/demo.yaml`:
   ```yaml
   env:
     name: alfworld          # or livemathematicianbench, spreadsheetbench, etc.
     split_dir: data/alfworld
     skill_init: output/baseline_skill.md
   ```
3. Install any extra dependencies: `vendor/skillopt/.venv/bin/pip install -e "vendor/skillopt[alfworld]"`

### Using the full dataset

Replace the bundled sample data with the full SearchQA dataset:

```yaml
train:
  train_size: 400
  batch_size: 40
env:
  split_dir: /path/to/searchqa_split
```

## Customization

| What | Where |
|------|-------|
| Training hyperparameters | `configs/demo.yaml` |
| Max epochs | `tasks/02-train/TASK.md` → `converge.max_waves` |
| Plateau threshold | `scripts/check_improvement.sh` → delta < 0.01 |
| Baseline skill | `output/baseline_skill.md` (created by setup) |

## Reset

```bash
bash scripts/clean.sh          # Reset journal/artifacts (keep vendor + output)
bash scripts/clean.sh --hard   # Full reset (re-clone SkillOpt, re-run everything)
```
