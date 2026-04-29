# Learn: scene-forest-tutorial-02c-background-97-validate-composition (attempt 02)

## Blocker — upstream inputs missing

`scripts/validate_bg_composition.py forest-tutorial` exits 1 before any API call:

```
cannot validate composition — missing:
  ['assets\\scenes\\forest-tutorial\\bg-far.png',
   'assets\\scenes\\forest-tutorial\\bg-mid.png',
   'assets\\scenes\\forest-tutorial\\bg-near.png']
```

## On-disk reality

`assets/scenes/forest-tutorial/`:
- `bg-far/final.png` — stitched, exists
- `bg-mid/final.png` — stitched, exists
- `bg-near` — directory does not exist; no segments, no stitch
- `bg-{far,mid,near}.png` at scene root — none exist

## Why this task can't self-heal

The validator depends on three sibling stitch chains depositing `bg-{layer}.png` at scene root. The upstream chains either wrote to a different path (`bg-{layer}/final.png`) or never ran (`bg-near`). Reconciliation here would require either:

1. Fixing the upstream stitch tasks to write `bg-{layer}.png` at scene root (out of scope — those are sibling tasks).
2. Faking inputs by symlinking/copying `bg-{far,mid}/final.png` → `bg-{far,mid}.png` and inventing a `bg-near.png` (would still fail: missing bg-near means the composite is meaningless and the judge can't return a real verdict).

Neither is a surgical fix to this validator task. Stub outputs are explicitly forbidden by the reconciliation rules.

## Recommendation

Re-plan or re-run the upstream `scene-forest-tutorial-02c-background` stitch chain so that `bg-far.png`, `bg-mid.png`, `bg-near.png` exist at the scene root. Then this validator task can run as designed.
