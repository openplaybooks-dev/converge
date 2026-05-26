---
id: 02-train
title: SkillOpt training loop
depends_on:
  - 01-setup
converge:
  max_waves: 10
  wave_check:
    id: check-plateau
    cmd: bash scripts/check_improvement.sh
    description: Halt on score plateau or degradation
outputs:
  - output/best_skill.md
  - output/history.json
checks:
  - id: best-skill-exists
    cmd: test -f output/best_skill.md
    description: Best skill document exists
  - id: history-has-steps
    cmd: >-
      node -e "
        const h = JSON.parse(require('fs').readFileSync('output/history.json', 'utf-8'));
        process.exit(h.steps && h.steps.length > 0 ? 0 : 1);
      "
    description: Training history has at least one step recorded
---

# SkillOpt Training Loop

This is a **converger** task. Each wave runs one epoch of SkillOpt's ReflACT training pipeline.

## Per-wave execution

The wave number is available as `$CONVERGE_TASK_WAVE` (0-indexed, auto-incremented).

Run one epoch:

```bash
vendor/skillopt/.venv/bin/python scripts/train_epoch.py \
  --config output/config.yaml \
  --epoch "$CONVERGE_TASK_WAVE" \
  --skill-dir output/skills \
  --history output/history.json \
  --best-skill output/best_skill.md \
  --train-data data/searchqa-sample/train.jsonl \
  --eval-data data/searchqa-sample/eval.jsonl
```

## What `train_epoch.py` does

1. Loads the current best skill (or `output/baseline_skill.md` if wave 0)
2. Configures SkillOpt `ReflACTTrainer` for a single epoch (`num_epochs: 1`)
3. Runs the full ReflACT pipeline: rollout → reflect → aggregate → select → update → evaluate
4. Saves the resulting skill as `output/skills/skill_v{wave}.md`
5. Appends a step record to `output/history.json`
6. Updates `output/best_skill.md` if the new skill scored higher

## Convergence

The `wave_check` runs `scripts/check_improvement.sh` after each wave:
- **Exit 0** (halt, success): last 3 waves show score plateau (delta < 0.01) and ≥3 epochs done
- **Exit 1** (continue): still improving
- **Exit 2** (halt, failure): score below baseline for 3 consecutive epochs

Maximum 10 waves (epochs) via `max_waves`.
