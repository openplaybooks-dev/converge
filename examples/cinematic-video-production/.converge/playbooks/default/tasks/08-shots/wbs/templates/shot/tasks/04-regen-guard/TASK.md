---
id: "{{nnn}}-04-regen-guard"
title: "Regen Guard — {{shotId}}"
description: If 03-qc failed, regenerate the clip with a different seed. Otherwise pass through.
dependencies:
  - "{{nnn}}-03-qc"
skills:
  - video-generate
tags:
  - shot
  - regen
inputs:
  - "{{clipDir}}/qc.json"
  - "{{clipDir}}/video.prompt.txt"
  - "keyframes/{{shotId}}.png"
outputs:
  - "{{clipDir}}/video.mp4"
  - "{{clipDir}}/regen.log"
checks:
  - id: video-final-pass
    cmd: node -e "const q=require('./{{clipDir}}/qc.json');if(q.pass===false){process.exit(1)}"
    description: After any regens, qc.json reports pass !== false
---

# Regen Guard — {{shotId}}

## Flow

1. Read `{{clipDir}}/qc.json`.
2. If `pass !== false` → append `"skipped: qc passed"` to `{{clipDir}}/regen.log` and exit success.
3. Else:
   - Record failure reason to `{{clipDir}}/regen.log`.
   - Pick a fresh seed (do NOT reuse the failed seed).
   - Re-invoke `video-generate` with the same prompt + same keyframe.
   - Overwrite `{{clipDir}}/video.mp4` and `{{clipDir}}/video.seed.txt`.
   - Re-run the same checks as `03-qc` and overwrite `{{clipDir}}/qc.json`.
4. Repeat step 3 up to `maxTaskAttempts - 1` times (the Converge runtime already retries this task up to 3 attempts total, so in practice allow one regen per attempt).

## Rules

- NEVER modify the prompt. If the prompt is the problem, fix `scripts/build-shot-prompt.js` and rerun the full shot pipeline for that shot.
- NEVER swap the keyframe here. If the keyframe is the problem, rerun 07-keyframes for that shot first.
- Record every attempt's seed and qc verdict in `regen.log` (append-only), newest-first.

## Exit condition

- **Pass**: latest `qc.json` reports `pass !== false`.
- **Fail**: all allotted regens exhausted and qc still fails. Task exits non-zero. The 10-assemble/report will flag this shot as `status: "qc_failed_but_rendered"` and include it in `REPORT.md` so the user can manually intervene.
