# SkillOpt Training Pipeline

Optimize an LLM agent skill document through Microsoft's ReflACT framework.

## DAG

```
01-setup  →  02-train (converger)  →  03-final-eval  →  04-report
```

## Tasks

| Task | Mode | Deliverable |
|------|------|-------------|
| `01-setup` | leaf | Cloned repo, venv, config, baseline skill + score |
| `02-train` | converger (1 wave = 1 epoch) | `best_skill.md` + `history.json` |
| `03-final-eval` | leaf | `final_eval.json` with test-set metrics |
| `04-report` | leaf | `report.md` comparing baseline vs optimized |

## Output

- `output/best_skill.md` — Best skill document found during training
- `output/history.json` — Training history with per-epoch scores
- `output/final_eval.json` — Test-set evaluation results
- `output/report.md` — Human-readable quality report
- `output/skills/` — All intermediate skill versions
