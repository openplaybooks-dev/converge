# RESULT.md — Attempt 1

**Outcome**: ✅ SUCCESS
**Duration**: 2m 18s
**Completed**: 2026-04-28T22:16:43.380Z

## Outputs

- `assets/scenes/forest-tutorial/extracted/bg-far.png` — ✓ produced (969.0 KB)

## Check Results — ✅ all passed

- ✓ **bg-far-extracted-exists**: bg-far extraction PNG was written
- ✓ **bg-far-extracted-fully-opaque**: bg-far is the back wall — every pixel must be alpha=255 (no transparency at all)
- ✓ **bg-far-extracted-no-chroma-green**: bg-far has zero pure-green pixels (no chroma-key markers leaked through)
- ✓ **bg-far-extracted-no-band-marker**: prompt sidecar is a real model pass (not a hand-rolled band slice)
