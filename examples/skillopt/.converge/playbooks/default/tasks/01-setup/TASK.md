---
id: 01-setup
title: Clone SkillOpt and prepare environment
outputs:
  - vendor/skillopt/scripts/train.py
  - output/config.yaml
  - output/baseline_skill.md
  - output/history.json
checks:
  - id: skillopt-cloned
    cmd: test -f vendor/skillopt/scripts/train.py
    description: SkillOpt repository cloned
  - id: venv-ready
    cmd: vendor/skillopt/.venv/bin/python -c "import skillopt" 2>/dev/null
    description: SkillOpt dependencies installed in venv
  - id: config-exists
    cmd: test -f output/config.yaml
    description: Training config generated
  - id: baseline-skill-exists
    cmd: test -f output/baseline_skill.md
    description: Baseline skill document copied
  - id: history-initialized
    cmd: >-
      node -e "
        const h = JSON.parse(require('fs').readFileSync('output/history.json', 'utf-8'));
        process.exit(typeof h.baseline_score === 'number' ? 0 : 1);
      "
    description: Baseline score recorded in history
---

# Setup SkillOpt Environment

## 1. Clone and install

Run `bash scripts/setup-skillopt.sh`. This will:

- Clone `https://github.com/microsoft/SkillOpt.git` into `vendor/skillopt/` at the pinned commit
- Create a Python venv at `vendor/skillopt/.venv/`
- Install SkillOpt and its dependencies

## 2. Generate config

Merge `configs/demo.yaml` with the SkillOpt base config. Write the resolved config to `output/config.yaml`.

Key overrides for the demo:
- `model.backend: claude` — use Claude via SkillOpt's claude_backend
- `train.num_epochs: 1` — one epoch per converger wave
- `train.train_size: 20` — use bundled sample data
- `env.split_dir: data/searchqa-sample` — bundled dataset

## 3. Copy baseline skill

Copy the SearchQA initial skill from `vendor/skillopt/skillopt/envs/searchqa/skills/` to `output/baseline_skill.md`.

If no initial skill exists in the cloned repo, create a minimal one:

```markdown
# SearchQA Agent Skill

You are a search-based question answering agent. Given a question and reference text, provide a concise, accurate answer.

## Instructions
1. Read the question carefully
2. Search the reference text for relevant information
3. Synthesize a clear, direct answer
4. If the answer is not found in the reference text, say so
```

## 4. Initialize history

Create `output/history.json`:

```json
{
  "baseline_score": null,
  "best_score": null,
  "steps": []
}
```

Then run `vendor/skillopt/.venv/bin/python scripts/eval_skill.py --skill output/baseline_skill.md --data data/searchqa-sample/eval.jsonl --output output/baseline_eval.json` to score the baseline.

Read the baseline hard score and update `output/history.json`:

```json
{
  "baseline_score": <hard_score from eval>,
  "best_score": <same as baseline_score>,
  "steps": []
}
```
