# Epoch 15 summary

## Mental model audited
- **Model:** Checks, Not Vibes
- **Rule:** Shell commands verify correctness, not AI judgment
- **Finding:** AI check infrastructure contradicts the mental model — `find-gaps.ts` had a fully functional `type: ai` dispatch branch that executed LLM-based verification, despite a non-blocking deprecation warning
- **Severity:** high / Correctness

## Correction
- **Test written:** tests/check-rejects-ai-type.test.ts
- **Framework file changed:** packages/core/src/task/unit/find-gaps.ts
- **Change:** Replaced the AI check dispatch branch (`if (check.type === 'ai')`) with a hard rejection that throws at check execution time, structurally preventing the Checks, Not Vibes violation
- **Test-first:** yes, test failed before fix, passed after

## Verification
- **Result:** PASS
- **Build:** pass
- **Test:** pass

## Ledger updates
- Journal: appended
- Metrics: appended
- Touched files: appended
- Escalated: no

## Next epoch guidance
- **Continue auditing:** Blueprint vs Runtime (not yet audited)
- **Already audited:** Checks Not Vibes (this epoch)
- **Skip mental models:** Checks Not Vibes (epoch 15), Blueprint vs Runtime (epoch 2)
- **Escalated bugs (do not retry):** <none>
