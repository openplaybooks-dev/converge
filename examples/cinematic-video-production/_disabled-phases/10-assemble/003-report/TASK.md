---
id: 003-report
title: Write REPORT.md
description: Runtime summary — counts, failed QC, continuity flags, cost estimate.
dependencies:
  - 002-manifest
inputs:
  - clips.json
  - clips/**/qc.json
  - scenes/continuity-errors.json
outputs:
  - REPORT.md
checks:
  - id: report-exists
    cmd: test -s REPORT.md
    description: REPORT.md written
---

# Write REPORT.md

Produce a short post-run report — what shipped, what needs manual attention, back-of-envelope cost.

## Required sections

```markdown
# Production Report

## Summary
- Total clips: <N>
- Total runtime: <HH:MM:SS>
- Scenes: <M>
- Characters: <K>
- Locations: <L>

## QC Status
- Passed: <P>
- Failed after regen: <F>   ← these need manual review
- Skipped (tooling): <S>

### Shots Needing Manual Review
<bullet list — one per qc.pass === false clip, with clip_id, shot_id, and the failed checks>

## Continuity Flags
<dump contents of scenes/continuity-errors.json if it exists — else "none">

## Cost Estimate (rough)
- Image generations: <count × per-call cost> = $<X>
- Video generations: <count × per-call cost> = $<Y>
- Audio generations: <count × per-call cost> = $<Z>
- Total: $<T>

(Pricing is whatever the configured backends cost at time of generation. Read per-call receipts from skills/*/backends/ log files if available; otherwise leave as a placeholder.)

## Files Delivered
- `clips.json` — NLE manifest
- `clips/` — per-shot folders with video + audio stems + shot.json
- `characters/` — locked character references
- `locations/` — locked location plates
- `screenplay.fountain`, `story-bible.md`, `shots.json` — upstream artifacts

## Next Steps
- Import `clips.json` into your NLE (DaVinci/Premiere/Final Cut).
- Review shots flagged above.
- Pass the full timeline through color grade and final audio mix.
```
