---
id: 10-assemble
title: Assemble — Shot Metadata, clips.json, Report
description: Finalize per-clip shot.json, emit the ordered clips.json manifest, and write a run REPORT.md.
dependencies:
  - 08-shots
  - 09-audio
tags:
  - assemble
  - manifest
inputs:
  - shots.json
  - scenes.json
  - clips/**/video.mp4
outputs:
  - clips/**/shot.json
  - clips.json
  - REPORT.md
checks:
  - id: clips-json-exists
    cmd: test -s clips.json
    description: clips.json written
  - id: report-exists
    cmd: test -s REPORT.md
    description: REPORT.md written
  - id: manifest-valid
    cmd: node scripts/verify-manifest.js
    description: verify-manifest.js passes
---

# Assemble

End of pipeline. Three deterministic children:

1. **001-shot-meta** — walk every `clips/*/video.mp4` and write a sibling `shot.json` with the full reference bundle (chars, location, style, seeds, timecodes).
2. **002-manifest** — emit `clips.json` at project root — the ordered manifest the NLE imports.
3. **003-report** — emit `REPORT.md` with runtime summary, failed-QC shots, continuity flags, and back-of-envelope cost.
