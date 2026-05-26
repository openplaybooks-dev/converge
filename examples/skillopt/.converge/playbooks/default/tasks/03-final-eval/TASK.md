---
id: 03-final-eval
title: Evaluate best skill on held-out eval set
depends_on:
  - 02-train
inputs:
  - output/best_skill.md
  - data/searchqa-sample/eval.jsonl
outputs:
  - output/final_eval.json
checks:
  - id: eval-exists
    cmd: test -f output/final_eval.json
    description: Final evaluation results exist
  - id: eval-has-scores
    cmd: >-
      node -e "
        const e = JSON.parse(require('fs').readFileSync('output/final_eval.json', 'utf-8'));
        process.exit(typeof e.hard_score === 'number' && typeof e.soft_score === 'number' ? 0 : 1);
      "
    description: Evaluation has hard_score and soft_score
---

# Final Evaluation

Run the best skill from training against the full eval set to produce final metrics.

```bash
vendor/skillopt/.venv/bin/python scripts/eval_skill.py \
  --skill output/best_skill.md \
  --data data/searchqa-sample/eval.jsonl \
  --output output/final_eval.json
```

The output `final_eval.json` should contain:

```json
{
  "hard_score": 0.0,
  "soft_score": 0.0,
  "num_items": 10,
  "results": [
    {"id": "...", "hard": 0, "soft": 0.0, "question": "...", "predicted": "...", "expected": "..."},
    ...
  ]
}
```
