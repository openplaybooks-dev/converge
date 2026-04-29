# LEARN — attempt 03

## Stuck: upstream artifacts missing, not just an output-naming mismatch

The reconciliation script flagged two missing outputs:

- `assets/scenes/forest-tutorial/bg-composition.critique.json`
- `assets/scenes/forest-tutorial/bg-composition.preview.png`

None of the three branches in the reconciliation playbook apply cleanly:

1. **No on-disk artifact serves the intent.** The parent dir
   `assets/scenes/forest-tutorial/` has `concept.png`, `map.silhouette.png`,
   `preview.png`, and per-layer subdirs `bg-far/` and `bg-mid/` (each with
   `final.png`). There is no critique JSON anywhere, and `preview.png` is the
   scene anchor, not a composited bg preview.
2. **The TASK.md command will not run.** `python scripts/validate_bg_composition.py
   forest-tutorial` reads `assets/scenes/forest-tutorial/bg-{far,mid,near}.png`
   at the scene root. Running it produced:

       cannot validate composition — missing: ['assets\\scenes\\forest-tutorial\\bg-far.png',
       'assets\\scenes\\forest-tutorial\\bg-mid.png', 'assets\\scenes\\forest-tutorial\\bg-near.png']

   `bg-far/final.png` and `bg-mid/final.png` exist; `bg-near` does not exist
   at all (no subdir, no PNG). So the upstream stitch chain for `bg-near`
   has not produced its artifacts yet, and the per-layer `final.png` files
   are not at the path the validator script reads from.
3. **No file to rename.** Nothing on disk corresponds to `bg-composition.*`.

## Two distinct gaps

- **Path-contract mismatch (script vs. pipeline).** The script reads
  `bg-{layer}.png` at scene root; the per-layer pipeline writes
  `bg-{layer}/final.png`. The TASK.md `inputs:` block lists `bg-far/final.png`
  and `bg-mid/final.png` (with `bg-far/final.png` duplicated where
  `bg-near/final.png` was likely intended), suggesting the spec author
  expected the per-layer-subdir layout, not the flat layout the script
  uses. One of the two needs to change.
- **Missing `bg-near` upstream entirely.** Even if the path-contract were
  resolved, `bg-near` simply has no stitched output yet. Its segment + stitch
  task chain has not run.

## Why I did not just create the outputs

- Stub critique JSON would be a fake pass that defeats the gate.
- The script's own fallback (placeholder critique on parse failure) only
  activates after a real Gemini call succeeds; it is not appropriate to
  hand-fabricate.
- Forging a composite PNG by alpha-stacking the two existing `final.png`s
  with a blank near-layer would make the cross-layer judge see a
  half-empty composite and (correctly) flag it — wasting a paid API call
  on input the spec was not designed to produce.

## What unblocks this task

Either:

- Run the upstream `bg-near` segment + stitch chain so `bg-near/final.png`
  exists, then reconcile the path contract (either copy
  `bg-{layer}/final.png` → `bg-{layer}.png` at scene root, or change the
  script to read the subdir layout), then re-run
  `scripts/validate_bg_composition.py forest-tutorial`; **or**
- Mark this task as not-yet-runnable until the bg-near upstream completes.

No spec edits were made — the missing outputs are not a naming mismatch,
they are a true upstream gap. A frontmatter rename here would mask the
real problem.
