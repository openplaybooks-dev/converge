# Selection Report — Epoch 001

**Selected finding:** `boundary-enforcement-self-contradicting`
**Mental model:** Blueprint vs Runtime
**Target file:** `packages/core/src/navigator/repair/context-writer.ts`

## Why this finding

The observe phase evidence (findings.json line 48-49) shows the repair context-writer instructs users that "Journal files are READ-ONLY" while the framework's own compile-time code reads journal manifest (run/index.ts:1243) and runstate (run/index.ts:968). This self-contradiction is the highest-leverage fix available because:

1. **Clarity** (rubric #4) — The false boundary claim obscures the framework's actual contract. Every developer who reads the context-writer text is misled about what the framework does.
2. **Prevention** (rubric #2) — Accurate boundary enforcement text prevents downstream developers from building on a false premise about journal immutability.
3. The other two correctness findings (#1 compile-reads-journal-manifest, #2 task-content-prefers-runstate-over-source) target `packages/core/src/run/index.ts` which is blocked by the escalated entry `select-parent-plus-missing-children`.

## Rejected findings

| Finding | Reason rejected |
|---|---|
| `compile-reads-journal-manifest` | Target file `packages/core/src/run/index.ts` overlaps with escalated entry `select-parent-plus-missing-children`. Blocked by check-escalated-target. |
| `task-content-prefers-runstate-over-source` | Same file overlap with escalated entry. Blocked. |

## Anti-repeat verification

- **Escalated.json:** `boundary-enforcement-self-contradicting` and its target file `packages/core/src/navigator/repair/context-writer.ts` do not match any escalated entry ID or file pattern.
- **Metrics.jsonl:** Missing (first epoch) — no prior mental model audits.
- **Touched-files.jsonl:** Missing (first epoch) — no hot-file threshold triggers.
- **Self-modification:** Target is `packages/core/src/navigator/repair/context-writer.ts`, not `.converge/playbooks/self-improvement-loop/`.
