---
id: "{{taskId}}"
title: "Epoch {{epoch}}"
seeds: [epoch-seed]
---

# Converge Epoch {{epoch}}

After all 3 stages complete (analyze → implement → verify):

1. Read `{{artifactsDir}}/analyze/report.md` — what was picked and why, including any refactor signal
2. Read `{{artifactsDir}}/verify/result.md` — did the change pass the gate?
3. Confirm the shared journal has this epoch's entry: check `grep -q 'Epoch {{epoch}}' {{projectDir}}/.converge/artifacts/self-improvement-loop/journal.md`

Cross-validate:
- Does the verify result match the analysis target? (was the right thing fixed?)
- Did the journal entry get written with correct scores and result?
- If the analyze report flagged a refactor signal, echo it forward so the root convergence sees it

Write a brief epoch summary to `{{artifactsDir}}/epoch-summary.md`:

```markdown
# Epoch {{epoch}} Summary

**Target:** <dimension> — <one-line issue description>
**Result:** PASSED | FAILED
**Files changed:** <list>
**Refactor signal:** NONE | <pattern description from analyze report>
```
