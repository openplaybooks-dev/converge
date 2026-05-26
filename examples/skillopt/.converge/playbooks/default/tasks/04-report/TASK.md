---
id: 04-report
title: Generate quality comparison report
depends_on:
  - 03-final-eval
inputs:
  - output/history.json
  - output/final_eval.json
  - output/best_skill.md
  - output/baseline_skill.md
outputs:
  - output/report.md
checks:
  - id: report-exists
    cmd: test -f output/report.md
    description: Quality report exists
  - id: report-has-comparison
    cmd: grep -q "Baseline" output/report.md && grep -q "Best" output/report.md
    description: Report contains baseline vs best comparison
---

# Quality Report

Generate a markdown report comparing the baseline skill to the optimized skill.

Read these files:
- `output/history.json` — training history with per-epoch scores
- `output/final_eval.json` — final evaluation results
- `output/best_skill.md` — the optimized skill document
- `output/baseline_skill.md` — the original skill document

Write `output/report.md` with these sections:

## Report structure

### Summary
One paragraph: did training improve the skill? By how much?

### Score Progression
ASCII table showing epoch number, hard score, soft score, and accept/reject decision.

```
| Epoch | Hard  | Soft  | Action |
|-------|-------|-------|--------|
| 0     | 0.40  | 0.55  | accept |
| 1     | 0.50  | 0.62  | accept |
| ...   |       |       |        |
```

### Baseline vs Best
- Baseline hard score vs final hard score
- Baseline soft score vs final soft score
- Delta and percentage improvement

### Key Skill Changes
Summarize the most significant differences between `output/baseline_skill.md` and `output/best_skill.md`. What instructions were added, removed, or modified?

### Per-Item Breakdown
Table from `final_eval.json` showing each eval item's question, expected answer, predicted answer, and hard/soft score.

### Recommendations
Based on the training trajectory, suggest what might improve further: more epochs, larger batch size, different edit budget, etc.
